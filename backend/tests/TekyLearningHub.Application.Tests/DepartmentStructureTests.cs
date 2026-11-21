using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using TekyLearningHub.Application.DTOs.Admin;
using TekyLearningHub.Application.Services.Admin;
using TekyLearningHub.Infrastructure.Data;
using TekyLearningHub.Infrastructure.Data.Migrations;
using TekyLearningHub.Infrastructure.Security;
using Xunit;

namespace TekyLearningHub.Application.Tests;

/// <summary>
/// Two business departments (Phòng Chuyên môn, Phòng Quản lý đào tạo) with permission templates.
/// System administration stays the global SystemAdmin role and is not a department.
/// </summary>
public class DepartmentStructureTests
{
    private const string StructureMigration = "20261129_two_department_structure.sql";

    private static async Task<ApplicationDbContext> Context(DatabaseMigrationTests.TestDatabase database)
    {
        await database.Migrate();
        await database.Execute("""
            INSERT dbo.Users(Email,PasswordHash,PrimaryRoleId,FullName) VALUES('admin@structure.test','hash',3,'Admin');
            INSERT dbo.UserRoles(UserId,RoleId,ScopeType) SELECT UserId,3,'GLOBAL' FROM dbo.Users WHERE Email='admin@structure.test';
            """);
        return new(new DbContextOptionsBuilder<ApplicationDbContext>().UseSqlServer(database.ConnectionString).Options);
    }

    private static UserAdministrationService Administration(ApplicationDbContext db) => TestServices.Administration(db, new PasswordHasher(),
        new EphemeralDataProtectionProvider(), new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        { ["Account:InvitationBaseUrl"] = "http://localhost:3001" }).Build());

    [Fact]
    public void TemplateMatchIgnoresOrderAndReportsCustomForAnythingElse()
    {
        var teacher = PositionTemplates.For(PositionTemplates.Academic).Single(template => template.Code == "TEACHER");
        Assert.Equal("TEACHER", PositionTemplates.Match(PositionTemplates.Academic, [2], teacher.PermissionCodes.Reverse()));
        Assert.Equal(PositionTemplates.Custom, PositionTemplates.Match(PositionTemplates.Academic, [2, 5], teacher.PermissionCodes));
        Assert.Equal(PositionTemplates.Custom, PositionTemplates.Match(PositionTemplates.Academic, [2], [.. teacher.PermissionCodes, "review.open"]));
        // Training departments offer no teacher template, and the academic manager bundle is not a training manager.
        Assert.DoesNotContain(PositionTemplates.For(PositionTemplates.Training), template => template.Code == "TEACHER");
        var academicManager = PositionTemplates.For(PositionTemplates.Academic).Single(template => template.Code == "MANAGER");
        Assert.Equal(PositionTemplates.Custom, PositionTemplates.Match(PositionTemplates.Training, academicManager.RoleIds, academicManager.PermissionCodes));
        // Every template only grants business roles; system administration is never a template.
        Assert.All(PositionTemplates.Catalog(), template => Assert.All(template.RoleIds, role => Assert.Contains(role, new[] { 2, 5, 6 })));
    }

    [SqlServerFact]
    public async Task MigrationMergesTeacherDepartmentsIntoAcademicAndKeepsGrantsEffective()
    {
        await using var database = new DatabaseMigrationTests.TestDatabase();
        var previous = SqlMigrationCatalog.Load().TakeWhile(x => x.Name != StructureMigration).ToList();
        await DevelopmentDatabaseMigrator.ApplyAsync(database.ConnectionString, previous, NullLogger.Instance);
        // A teacher appointed in the old TEACHER department, who also holds an exception Teacher grant in ACADEMIC.
        await database.Execute("""
            DECLARE @teacherDept int=(SELECT DepartmentId FROM dbo.Departments WHERE Code='TEACHER');
            DECLARE @academic int=(SELECT DepartmentId FROM dbo.Departments WHERE Code='ACADEMIC');
            DECLARE @position int=(SELECT PositionId FROM dbo.Positions WHERE Code='TEACHER_FULL_TIME' AND DepartmentId=@teacherDept);
            DECLARE @policy bigint=(SELECT PolicyId FROM dbo.PositionAccessPolicies WHERE PositionId=@position AND IsPublished=1);
            INSERT dbo.Users(Email,PasswordHash,PrimaryRoleId,FullName,StaffAccessManaged,SecurityVersion) VALUES('gv@structure.test','hash',2,N'Giáo viên',1,3);
            DECLARE @user int=SCOPE_IDENTITY();
            INSERT dbo.StaffAppointments(UserId,DepartmentId,PositionId,EmploymentType,PolicyId) VALUES(@user,@teacherDept,@position,'FULL_TIME',@policy);
            DECLARE @appointment bigint=SCOPE_IDENTITY();
            INSERT dbo.UserRoles(UserId,RoleId,ScopeType,DepartmentId) VALUES(@user,2,'DEPARTMENT',@teacherDept);
            INSERT dbo.UserRoleGrantSources(UserRoleId,AppointmentId,PolicyId,Kind) VALUES(SCOPE_IDENTITY(),@appointment,@policy,'APPOINTMENT');
            INSERT dbo.UserRoles(UserId,RoleId,ScopeType,DepartmentId) VALUES(@user,2,'DEPARTMENT',@academic);
            INSERT dbo.UserRoleGrantSources(UserRoleId,Kind,Reason) VALUES(SCOPE_IDENTITY(),'EXCEPTION',N'Dạy thay');
            INSERT dbo.Courses(CourseCode,Name,DepartmentId) VALUES('STRUCTURE-COURSE',N'Khóa học phòng giáo viên',@teacherDept);
            """);

        await DevelopmentDatabaseMigrator.ApplyAsync(database.ConnectionString, SqlMigrationCatalog.Load(), NullLogger.Instance);

        const string academic = "(SELECT DepartmentId FROM dbo.Departments WHERE Code='ACADEMIC')";
        const string user = "(SELECT UserId FROM dbo.Users WHERE Email='gv@structure.test')";
        Assert.Equal(0, await database.Scalar("SELECT COUNT(*) FROM dbo.Departments WHERE Code IN('TEACHER','STEM_OPERATIONS') AND IsActive=1"));
        Assert.Equal(0, await database.Scalar("SELECT COUNT(*) FROM dbo.Positions p JOIN dbo.Departments d ON d.DepartmentId=p.DepartmentId WHERE d.Code IN('TEACHER','STEM_OPERATIONS')"));
        Assert.Equal(1, await database.Scalar($"SELECT COUNT(*) FROM dbo.Positions WHERE Code='TEACHER_FULL_TIME' AND DepartmentId={academic}"));
        // The older duplicate seeded by the first governance script is gone, so each title appears once.
        Assert.Equal(1, await database.Scalar($"SELECT COUNT(*) FROM dbo.Positions WHERE Code='TEACHER_LEADER' AND DepartmentId={academic}"));
        Assert.Equal(0, await database.Scalar($"SELECT COUNT(*) FROM dbo.Positions WHERE Code IN('TEACHER','ACADEMIC_ADVISOR','TEACHER_MANAGER') AND DepartmentId={academic}"));
        // The appointment and its grant source now live in ACADEMIC, merged into the single live Teacher grant there.
        Assert.Equal(1, await database.Scalar($"SELECT COUNT(*) FROM dbo.StaffAppointments WHERE UserId={user} AND DepartmentId={academic} AND ValidTo IS NULL"));
        Assert.Equal(1, await database.Scalar($"SELECT COUNT(*) FROM dbo.UserRoles WHERE UserId={user} AND RoleId=2 AND RevokedAt IS NULL"));
        Assert.Equal(2, await database.Scalar($"SELECT COUNT(*) FROM dbo.UserRoleGrantSources s JOIN dbo.UserRoles g ON g.UserRoleId=s.UserRoleId WHERE g.UserId={user} AND g.RevokedAt IS NULL AND g.DepartmentId={academic} AND s.EndedAt IS NULL"));
        Assert.Equal(1, await database.Scalar($"SELECT CAST(dbo.HasAcademicPermission({user},'content.read',{academic}) AS int)"));
        Assert.Equal(4, await database.Scalar($"SELECT SecurityVersion FROM dbo.Users WHERE UserId={user}"));
        Assert.Equal(1, await database.Scalar($"SELECT COUNT(*) FROM dbo.Courses WHERE CourseCode='STRUCTURE-COURSE' AND DepartmentId={academic}"));
        // The training department exists with published job titles.
        Assert.Equal("TRAINING", await database.Text("SELECT FunctionCode FROM dbo.Departments WHERE Code='TRAINING'"));
        Assert.Equal(3, await database.Scalar("""
            SELECT COUNT(*) FROM dbo.Positions p JOIN dbo.Departments d ON d.DepartmentId=p.DepartmentId
            WHERE d.Code='TRAINING' AND EXISTS(SELECT 1 FROM dbo.PositionAccessPolicies x WHERE x.PositionId=p.PositionId AND x.IsPublished=1)
            """));
    }

    [SqlServerFact]
    public async Task SeededJobTitlesUseTheTemplatesOfTheirDepartment()
    {
        await using var database = new DatabaseMigrationTests.TestDatabase();
        await using var db = await Context(database);
        var policies = await TestServices.StaffAccess(db).Policies(1);
        var byCode = await db.Positions.Include(x => x.Department).ToDictionaryAsync(x => $"{x.Department.Code}:{x.Code}", x => x.PositionId);
        string Template(string key) => policies.Single(policy => policy.PositionId == byCode[key]).ActiveTemplateCode!;

        Assert.Equal("MANAGER", Template("ACADEMIC:PD_ACADEMIC"));
        Assert.Equal("SPECIALIST", Template("ACADEMIC:ACADEMIC_SPECIALIST"));
        Assert.Equal("TEACHER", Template("ACADEMIC:TEACHER_FULL_TIME"));
        Assert.Equal(PositionTemplates.Custom, Template("ACADEMIC:TEACHER_LEADER"));
        Assert.Equal("MANAGER", Template("TRAINING:TRAINING_HEAD"));
        Assert.Equal("SPECIALIST", Template("TRAINING:TRAINING_OFFICER"));
        Assert.All(policies.Where(policy => policy.DepartmentFunction == PositionTemplates.Training),
            policy => Assert.DoesNotContain("content.edit", policy.ActivePermissionCodes ?? []));

        var catalog = await Administration(db).Catalog(1);
        Assert.Equal("TRAINING", catalog.Departments.Single(department => department.Code == "TRAINING").FunctionCode);
        Assert.NotEmpty(catalog.Templates);
    }

    [SqlServerFact]
    public async Task JobTitleWithAPolicyCanBeDeletedAndDeactivatedTogetherWithAPolicyChange()
    {
        await using var database = new DatabaseMigrationTests.TestDatabase();
        await using var db = await Context(database);
        var staff = TestServices.StaffAccess(db);
        var service = Administration(db);
        var training = await database.Scalar("SELECT DepartmentId FROM dbo.Departments WHERE Code='TRAINING'");
        var specialist = PositionTemplates.For(PositionTemplates.Training).Single(template => template.Code == "SPECIALIST");

        var created = await staff.SavePosition(1, null, new PositionSaveRequest { Name = "Giáo vụ tạm", DepartmentId = training,
            Policy = new PolicyRequest { RoleIds = specialist.RoleIds, PermissionCodes = specialist.PermissionCodes } });
        Assert.Equal("SPECIALIST", created.ActiveTemplateCode);

        // Changing the permissions and deactivating in one save publishes first, then deactivates.
        var manager = PositionTemplates.For(PositionTemplates.Training).Single(template => template.Code == "MANAGER");
        var updated = await staff.SavePosition(1, created.PositionId, new PositionSaveRequest { Name = "Giáo vụ tạm", DepartmentId = training, IsActive = false,
            Policy = new PolicyRequest { Version = created.Version, RoleIds = manager.RoleIds, PermissionCodes = manager.PermissionCodes } });
        Assert.False(updated.IsActive);
        Assert.Equal("MANAGER", updated.ActiveTemplateCode);
        await service.DirectoryStatus(1, "positions", created.PositionId, new DirectoryStatusRequest { IsActive = true });
        Assert.Equal(1, await database.Scalar($"SELECT CAST(IsActive AS int) FROM dbo.Positions WHERE PositionId={created.PositionId}"));

        // The title has published policies but no appointment, so it is deleted together with them.
        db.ChangeTracker.Clear();
        await service.DirectoryDelete(1, "positions", created.PositionId);
        Assert.Equal(0, await database.Scalar($"SELECT COUNT(*) FROM dbo.Positions WHERE PositionId={created.PositionId}"));
        Assert.Equal(0, await database.Scalar($"SELECT COUNT(*) FROM dbo.PositionAccessPolicies WHERE PositionId={created.PositionId}"));
    }

    [SqlServerFact]
    public async Task BulkCreateRequiresAJobTitleAndAnEmploymentTypeItAllows()
    {
        await using var database = new DatabaseMigrationTests.TestDatabase();
        await using var db = await Context(database);
        var service = Administration(db);
        var policies = await TestServices.StaffAccess(db).Policies(1);
        var partTime = policies.Single(policy => policy.Position == "Giáo viên Part time");

        var missing = await Assert.ThrowsAsync<UserAdministrationException>(() => service.BulkCreate(1, new BulkCreateUsersRequest
            { DepartmentId = partTime.DepartmentId, Rows = ["a@structure.test, A"] }));
        Assert.Equal(400, missing.Status);
        var wrongType = await Assert.ThrowsAsync<UserAdministrationException>(() => service.BulkCreate(1, new BulkCreateUsersRequest
            { DepartmentId = partTime.DepartmentId, PositionId = partTime.PositionId, EmploymentType = "FULL_TIME", Rows = ["a@structure.test, A"] }));
        Assert.Equal(400, wrongType.Status);

        var result = await service.BulkCreate(1, new BulkCreateUsersRequest
            { DepartmentId = partTime.DepartmentId, PositionId = partTime.PositionId, EmploymentType = "PART_TIME", Rows = ["a@structure.test, A"] });
        Assert.Equal(1, result.Created);
        Assert.Equal(1, await database.Scalar("""
            SELECT COUNT(*) FROM dbo.UserRoleGrantSources s JOIN dbo.UserRoles g ON g.UserRoleId=s.UserRoleId
            JOIN dbo.Users u ON u.UserId=g.UserId WHERE u.Email='a@structure.test' AND s.Kind='APPOINTMENT' AND s.EndedAt IS NULL
            """));
    }
}
