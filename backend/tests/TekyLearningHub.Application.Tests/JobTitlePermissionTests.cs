using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Text.Json;
using TekyLearningHub.Api.Controllers.Admin;
using TekyLearningHub.Application.DTOs.Admin;
using TekyLearningHub.Application.Services.Admin;
using TekyLearningHub.Infrastructure.Data;
using TekyLearningHub.Infrastructure.Security;
using Xunit;

namespace TekyLearningHub.Application.Tests;

/// <summary>
/// Covers the job title permission model: a job title carries its own permission list,
/// deleting a department or job title is refused while anything references it, and staff
/// accounts can be created in bulk from an email list.
/// </summary>
public class JobTitlePermissionTests
{
    private static async Task<ApplicationDbContext> Context(DatabaseMigrationTests.TestDatabase database)
    {
        await database.Migrate();
        await database.Execute("""
            INSERT dbo.Users(Email,PasswordHash,PrimaryRoleId,FullName) VALUES('admin@job.test','hash',3,'Admin');
            INSERT dbo.UserRoles(UserId,RoleId,ScopeType) VALUES(1,3,'GLOBAL');
            """);
        return new(new DbContextOptionsBuilder<ApplicationDbContext>().UseSqlServer(database.ConnectionString).Options);
    }

    private static UserAdministrationService Administration(ApplicationDbContext db) => TestServices.Administration(db, new PasswordHasher(),
        new EphemeralDataProtectionProvider(), new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        { ["Account:InvitationBaseUrl"] = "http://localhost:3001" }).Build());

    [SqlServerFact]
    public async Task JobTitleCarriesItsOwnPermissionListAndTheGrantUsesIt()
    {
        await using var database = new DatabaseMigrationTests.TestDatabase();
        await using var db = await Context(database);
        var staff = TestServices.StaffAccess(db);
        var service = Administration(db);

        var academic = await database.Scalar("SELECT DepartmentId FROM dbo.Departments WHERE Code='ACADEMIC'");
        var permissions = await db.Permissions.AsNoTracking().OrderBy(x => x.Code).Select(x => x.Code).ToListAsync();
        Assert.NotEmpty(permissions);
        // The job title grants a permission the Teacher role does not carry on its own.
        var teacherBundle = await db.RolePermissions.Where(x => x.RoleId == 2).Select(x => x.PermissionId).ToHashSetAsync();
        var byCode = await db.Permissions.AsNoTracking().ToDictionaryAsync(x => x.Code, x => x.PermissionId);
        var granted = permissions.First(code => !teacherBundle.Contains(byCode[code]));
        var withheld = permissions.First(code => code != granted && !teacherBundle.Contains(byCode[code]));
        // A permission that only the Teacher role carries.
        var teacherOnly = permissions.First(code => teacherBundle.Contains(byCode[code]));

        // A job title stores its own permission list next to the system roles it references.
        var created = await service.Directory(1, "positions", null, new() { Name = "Trưởng khoa riêng", DepartmentId = academic });
        var positionId = await database.Scalar("SELECT PositionId FROM dbo.Positions WHERE Name=N'Trưởng khoa riêng'");
        var view = await staff.SavePosition(1, positionId, new PositionSaveRequest { Name = "Trưởng khoa riêng", DepartmentId = academic,
            IsActive = true, Policy = new PolicyRequest { Version = 0, RoleIds = [2], PermissionCodes = [granted], EmploymentTypes = ["FULL_TIME"], Publish = true } });
        Assert.Equal(new[] { granted }, view.ActivePermissionCodes);

        // The appointment grants the permission the job title declares.
        var teacher = await service.Create(1, new() { Email = "truongkhoa@job.test", FullName = "Trưởng khoa", PrimaryRoleId = 2,
            Appointments = [new AppointmentInput { DepartmentId = academic, PositionId = positionId, PolicyVersion = view.ActiveVersion!.Value, EmploymentType = "FULL_TIME" }] });
        // The account is still pending until the invitation is accepted.
        Assert.Equal(0, await database.Scalar($"SELECT dbo.HasAcademicPermission({teacher.UserId},'{granted}',{academic})"));
        await database.Execute($"UPDATE dbo.Users SET Status='Active',ActivationPending=0 WHERE UserId={teacher.UserId}");
        // The job title permission applies on top of the role bundle.
        Assert.Equal(1, await database.Scalar($"SELECT dbo.HasAcademicPermission({teacher.UserId},'{granted}',{academic})"));
        Assert.True(await new AcademicPermissionReader(db).HasPermissionAsync(teacher.UserId, granted, academic));
        Assert.Equal(1, await database.Scalar($"SELECT dbo.HasAcademicPermission({teacher.UserId},'{teacherOnly}',{academic})"));
        // A permission neither the role nor the job title carries stays denied.
        Assert.Equal(0, await database.Scalar($"SELECT dbo.HasAcademicPermission({teacher.UserId},'{withheld}',{academic})"));
    }

    [SqlServerFact]
    public async Task BackfillGivesEveryExistingPolicyThePermissionsOfItsRoles()
    {
        await using var database = new DatabaseMigrationTests.TestDatabase();
        await using var db = await Context(database);

        // Every policy inherits the permission bundle of the roles it references.
        var mismatched = await database.Scalar("""
            SELECT COUNT(*) FROM dbo.PositionPolicyRoles r
            JOIN dbo.RolePermissions rp ON rp.RoleId=r.RoleId
            JOIN dbo.PositionAccessPolicies policy ON policy.PolicyId=r.PolicyId
            JOIN dbo.Positions position ON position.PositionId=policy.PositionId
            JOIN dbo.Departments department ON department.DepartmentId=position.DepartmentId AND department.FunctionCode='ACADEMIC'
            WHERE NOT EXISTS(SELECT 1 FROM dbo.PositionPolicyPermissions pp
                             WHERE pp.PolicyId=r.PolicyId AND pp.PermissionId=rp.PermissionId)
            """);
        Assert.Equal(0, mismatched);

        // The published job titles kept the permission bundle they had before the migration.
        var teacherPolicy = await database.Scalar("SELECT PolicyId FROM dbo.PositionAccessPolicies WHERE IsPublished=1 AND PolicyId IN (SELECT PolicyId FROM dbo.PositionPolicyRoles WHERE RoleId=2)");
        var teacherPermissions = await database.Scalar($"SELECT COUNT(*) FROM dbo.PositionPolicyPermissions WHERE PolicyId={teacherPolicy}");
        var rolePermissions = await database.Scalar($"SELECT COUNT(*) FROM dbo.RolePermissions WHERE RoleId=2");
        Assert.Equal(rolePermissions, teacherPermissions);
    }

    [SqlServerFact]
    public async Task DeletingADepartmentOrJobTitleIsRefusedWhileItIsStillReferenced()
    {
        await using var database = new DatabaseMigrationTests.TestDatabase();
        await using var db = await Context(database);
        var service = Administration(db);

        // A department that still holds job titles cannot be deleted.
        var academic = await database.Scalar("SELECT DepartmentId FROM dbo.Departments WHERE Code='ACADEMIC'");
        var blocked = await Assert.ThrowsAsync<UserAdministrationException>(() => service.DirectoryDelete(1, "departments", academic));
        Assert.Equal(409, blocked.Status);
        Assert.Contains("Không thể xóa", blocked.Message);
        Assert.Equal(1, await database.Scalar($"SELECT COUNT(*) FROM dbo.Departments WHERE DepartmentId={academic}"));

        // A job title that already has an appointment cannot be deleted either.
        var staff = TestServices.StaffAccess(db);
        var policies = await staff.Policies(1);
        var teacher = policies.Single(policy => policy.Position == "Giáo viên Fulltime");
        await service.Create(1, new() { Email = "giao.vien@job.test", FullName = "Giáo viên", PrimaryRoleId = 2,
            Appointments = [new AppointmentInput { DepartmentId = teacher.DepartmentId, PositionId = teacher.PositionId,
                PolicyVersion = teacher.ActiveVersion!.Value, EmploymentType = "FULL_TIME" }] });
        var positionBlocked = await Assert.ThrowsAsync<UserAdministrationException>(() => service.DirectoryDelete(1, "positions", teacher.PositionId));
        Assert.Equal(409, positionBlocked.Status);
        Assert.Contains("Không thể xóa", positionBlocked.Status == 409 ? positionBlocked.Message : string.Empty);

        // A job title nobody uses is removed and the removal is audited.
        await service.Directory(1, "positions", null, new() { Name = "Chức danh tạm", DepartmentId = academic });
        var temporary = await database.Scalar("SELECT PositionId FROM dbo.Positions WHERE Name=N'Chức danh tạm'");
        var audits = await database.Scalar("SELECT COUNT(*) FROM dbo.AuditLogs WHERE Action='DIRECTORY_DELETED'");
        await service.DirectoryDelete(1, "positions", temporary);
        Assert.Equal(0, await database.Scalar($"SELECT COUNT(*) FROM dbo.Positions WHERE PositionId={temporary}"));
        Assert.Equal(audits + 1, await database.Scalar("SELECT COUNT(*) FROM dbo.AuditLogs WHERE Action='DIRECTORY_DELETED'"));
    }

    [SqlServerFact]
    public async Task CatalogReportsTheCountsAndWhetherAnEntryCanBeDeleted()
    {
        await using var database = new DatabaseMigrationTests.TestDatabase();
        await using var db = await Context(database);
        var service = Administration(db);

        var catalog = await service.Catalog(1);
        Assert.NotEmpty(catalog.AvailablePermissions);
        Assert.All(catalog.AvailablePermissions, permission => Assert.NotEmpty(permission.Code));
        var academic = catalog.Departments.Single(entry => entry.Code == "ACADEMIC");
        Assert.True(academic.PositionCount > 0);
        // The department still holds job titles, so it cannot be hard deleted.
        Assert.False(academic.CanDelete);
        Assert.Contains("chức danh", academic.DeleteBlockedReason);

        // A job title nobody uses can be deleted.
        await service.Directory(1, "positions", null, new() { Name = "Chức danh trống", DepartmentId = academic.Id });
        var empty = await database.Scalar("SELECT PositionId FROM dbo.Positions WHERE Name=N'Chức danh trống'");
        var refreshed = await service.Catalog(1);
        var entry = refreshed.Positions.Single(item => item.Id == empty);
        Assert.True(entry.CanDelete);
        Assert.Null(entry.DeleteBlockedReason);

        var controller = new AdminUsersController(service, NullLogger<AdminUsersController>.Instance)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };
        controller.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, "1")]));
        var response = Assert.IsType<ObjectResult>(await controller.Catalog(CancellationToken.None));
        Assert.Equal(200, response.StatusCode);
        var json = JsonSerializer.Serialize(response.Value, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        Assert.Contains("\"availablePermissions\"", json);
        Assert.Contains("\"canDelete\"", json);
    }

    [SqlServerFact]
    public async Task PublishedJobTitleNeedsASystemRoleForItsPermissionGrant()
    {
        await using var database = new DatabaseMigrationTests.TestDatabase();
        await using var db = await Context(database);
        var staff = TestServices.StaffAccess(db);
        var academic = await database.Scalar("SELECT DepartmentId FROM dbo.Departments WHERE Code='ACADEMIC'");
        var permission = await db.Permissions.Select(x => x.Code).FirstAsync();
        var failure = await Assert.ThrowsAsync<UserAdministrationException>(() => staff.SavePosition(1, null,
            new PositionSaveRequest { Name = "Roleless", DepartmentId = academic,
                Policy = new PolicyRequest { RoleIds = [], PermissionCodes = [permission], Publish = true } }));
        Assert.Equal(400, failure.Status);
        Assert.Equal(0, await database.Scalar("SELECT COUNT(*) FROM dbo.Positions WHERE Name='Roleless'"));
    }

    [SqlServerFact]
    public async Task BulkCreateReportsDuplicatesAndInvalidRowsAndCreatesTheRest()
    {
        await using var database = new DatabaseMigrationTests.TestDatabase();
        await using var db = await Context(database);
        var service = Administration(db);
        var staff = TestServices.StaffAccess(db);

        var academic = await database.Scalar("SELECT DepartmentId FROM dbo.Departments WHERE Code='ACADEMIC'");
        var policies = await staff.Policies(1);
        var teacher = policies.Single(policy => policy.Position == "Giáo viên Fulltime");

        var result = await service.BulkCreate(1, new BulkCreateUsersRequest { DepartmentId = teacher.DepartmentId, PositionId = teacher.PositionId,
            Rows = ["hop1@job.test, Nguyễn A", "khong-hop-le", "hop1@job.test, Trùng", "hop2@job.test, Nguyễn B", "hop1@job.test, Trùng 2"] });

        // Only the valid, unique rows are created.
        Assert.Equal(2, result.Created);
        Assert.Equal(2, await database.Scalar("SELECT COUNT(*) FROM dbo.Users WHERE Email IN ('hop1@job.test','hop2@job.test')"));
        Assert.Equal(2, await database.Scalar("SELECT COUNT(*) FROM dbo.StaffAppointments a JOIN dbo.Users u ON u.UserId=a.UserId WHERE u.Email IN ('hop1@job.test','hop2@job.test')"));

        // The invalid and the duplicated rows are reported with a reason.
        var invalid = result.Rows.Single(row => row.Row == "khong-hop-le");
        Assert.Equal("Invalid", invalid.Status);
        Assert.Equal("Duplicate", result.Rows.Count(row => row.Status == "Duplicate") == 2 ? "Duplicate" : result.Rows.First(row => row.Status == "Duplicate").Status);

        // Each created account receives the grant that carries its job title.
        var userId = await database.Scalar("SELECT UserId FROM dbo.Users WHERE Email='hop1@job.test'");
        Assert.Equal(1, await database.Scalar($"SELECT COUNT(*) FROM dbo.UserRoles WHERE UserId={userId} AND RevokedAt IS NULL"));
        Assert.Equal(1, await database.Scalar($"SELECT COUNT(*) FROM dbo.UserRoleGrantSources s JOIN dbo.UserRoles g ON g.UserRoleId=s.UserRoleId WHERE g.UserId={userId} AND s.Kind='APPOINTMENT'"));
    }

    [SqlServerFact]
    public async Task BulkCreateRefusesAJobTitleFromAnotherDepartment()
    {
        await using var database = new DatabaseMigrationTests.TestDatabase();
        await using var db = await Context(database);
        var service = Administration(db);
        var staff = TestServices.StaffAccess(db);

        var academic = await database.Scalar("SELECT DepartmentId FROM dbo.Departments WHERE Code='ACADEMIC'");
        var operations = await database.Scalar("SELECT DepartmentId FROM dbo.Departments WHERE Code='TRAINING'");
        var policies = await staff.Policies(1);
        var foreign = policies.First(policy => policy.DepartmentId == operations && policy.DepartmentId != academic);
        Assert.NotEqual(academic, foreign.DepartmentId);

        var failure = await Assert.ThrowsAsync<UserAdministrationException>(() => service.BulkCreate(1, new BulkCreateUsersRequest
        { DepartmentId = academic, PositionId = foreign.PositionId, Rows = ["x@job.test, Test"] }));
        Assert.Equal(400, failure.Status);
        Assert.Equal(0, await database.Scalar("SELECT COUNT(*) FROM dbo.Users WHERE Email='x@job.test'"));
    }

    [SqlServerFact]
    public async Task TheExcelTemplateCarriesTheEmailAndNameColumns()
    {
        await using var database = new DatabaseMigrationTests.TestDatabase();
        await using var db = await Context(database);
        var service = Administration(db);

        var content = await service.BulkCreateTemplate(1);
        Assert.NotEmpty(content);
        Assert.Equal(new byte[] { 0x50, 0x4B }, content.Take(2).ToArray());
    }
}
