using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.Common;
using TekyLearningHub.Application.DTOs.Admin;
using TekyLearningHub.Application.Services.Admin;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Infrastructure.Data;
using TekyLearningHub.Infrastructure.Repositories.Admin;
using TekyLearningHub.Infrastructure.Security;
using Xunit;

namespace TekyLearningHub.Application.Tests;

public class AccountAccessTests
{
    [SqlServerFact]
    public async Task SqlMigrationAndLiveAccessKeepDepartmentCoursesScoped()
    {
        await using var database = new DatabaseMigrationTests.TestDatabase();
        await database.Migrate();
        var academic = await database.Scalar("SELECT DepartmentId FROM dbo.Departments WHERE Code='ACADEMIC'");
        var operations = await database.Scalar("SELECT DepartmentId FROM dbo.Departments WHERE Code='STEM_OPERATIONS'");
        await database.Execute($"""
            INSERT dbo.Users(Email,PasswordHash,PrimaryRoleId,FullName) VALUES('scoped@test.local','hash',2,'Scoped');
            INSERT dbo.UserRoles(UserId,RoleId,ScopeType,DepartmentId) VALUES
                (1,2,'GLOBAL',NULL),(1,5,'DEPARTMENT',{academic}),(1,6,'DEPARTMENT',{operations});
            INSERT dbo.Courses(CourseCode,Name,DepartmentId) VALUES
                ('SHARED','Shared',NULL),('ACADEMIC','Academic',{academic}),('OPERATIONS','Operations',{operations});
            """);
        await database.Migrate();
        await using var db = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseSqlServer(database.ConnectionString).Options);
        var reader = new AccountAccessReader(db);
        var access = await reader.Read(1);
        Assert.Equal(3, access.Grants.Length);
        Assert.True(access.Allows("course.manage", operations));
        Assert.False(access.Allows("course.manage", academic));
        Assert.False(access.Allows("course.manage", null));
        var service = new CourseService(new CourseRepository(db), new UnitOfWork(db), reader);
        var page = await service.ListAsync(1, null, null, 0, 20, default);
        Assert.Equal("OPERATIONS", Assert.Single(page.Items).CourseCode);
        var outside = await database.Scalar("SELECT CourseId FROM dbo.Courses WHERE CourseCode='ACADEMIC'");
        Assert.Equal(403, (await Assert.ThrowsAsync<UseCaseException>(() => service.GetAsync(outside, 1, default))).Status);
        var created = await service.CreateAsync(new() { CourseCode = "OWNED-NEW", Name = "Owned", DepartmentId = operations }, 1, null, default);
        Assert.True(created.Succeeded);
        Assert.Equal(operations, created.Value!.DepartmentId);
        await database.Execute($"UPDATE dbo.UserRoles SET RevokedAt=SYSUTCDATETIME() WHERE UserId=1 AND RoleId=6 AND DepartmentId={operations}");
        Assert.Equal(403, (await Assert.ThrowsAsync<UseCaseException>(() => service.ListAsync(1, null, null, 0, 20, default))).Status);
    }

    private static async Task<ApplicationDbContext> Create()
    {
        var db = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var teacher = new Role { RoleId = 2, RoleName = "Teacher" };
        var staff = new Role { RoleId = 5, RoleName = "AcademicStaff" };
        var manager = new Role { RoleId = 6, RoleName = "AcademicManager" };
        var read = new Permission { PermissionId = 1, Code = "content.read", Description = "Xem nội dung" };
        var edit = new Permission { PermissionId = 2, Code = "content.edit", Description = "Biên soạn nội dung" };
        var courses = new Permission { PermissionId = 3, Code = "course.manage", Description = "Quản lý khóa học" };
        db.AddRange(teacher, staff, manager, read, edit, courses);
        db.RolePermissions.AddRange(
            new() { Role = teacher, Permission = read }, new() { Role = staff, Permission = edit },
            new() { Role = manager, Permission = courses });
        db.Departments.AddRange(new Department { DepartmentId = 1, Code = "A", Name = "Phòng A", IsActive = true },
            new Department { DepartmentId = 2, Code = "B", Name = "Phòng B", IsActive = true });
        db.Users.Add(new User {
            UserId = 42, Email = "access@example.test", FullName = "Access", PasswordHash = "hash", ThemeMode = "Light",
            Status = "Active", PrimaryRoleId = 2, PrimaryRole = teacher,
            RoleAssignments = [new() { UserRoleId = 1, Role = teacher, ScopeType = "GLOBAL" },
                new() { UserRoleId = 2, Role = staff, ScopeType = "DEPARTMENT", DepartmentId = 1 },
                new() { UserRoleId = 3, Role = manager, ScopeType = "DEPARTMENT", DepartmentId = 2 }]
        });
        db.Courses.AddRange(new Course { CourseId = 1, CourseCode = "SHARED", Name = "Shared", Status = "Draft" },
            new Course { CourseId = 2, CourseCode = "ROOM-A", Name = "A", Status = "Draft", DepartmentId = 1 },
            new Course { CourseId = 3, CourseCode = "ROOM-B", Name = "B", Status = "Draft", DepartmentId = 2 });
        await db.SaveChangesAsync();
        return db;
    }

    [Fact]
    public async Task ReadsEveryActiveGrantWithoutLettingGlobalReadWidenOtherPermissions()
    {
        await using var db = await Create();
        var access = await new AccountAccessReader(db).Read(42);
        Assert.Equal(new byte[] { 2, 5, 6 }, access.Grants.Select(grant => grant.RoleId));
        Assert.Equal("Phòng A", access.Grants.Single(grant => grant.RoleId == 5).DepartmentName);
        Assert.True(access.Allows("content.read", 2));
        Assert.True(access.Allows("content.edit", 1));
        Assert.False(access.Allows("content.edit", 2));
        Assert.False(access.Allows("content.edit", null));
        Assert.True(access.Allows("course.manage", 2));
        Assert.False(access.Allows("course.manage", 1));
    }

    [Fact]
    public async Task PrimaryRoleDoesNotChangeEffectiveAccessAndRevokedGrantsAreExcluded()
    {
        await using var db = await Create();
        var reader = new AccountAccessReader(db);
        var before = await reader.Read(42);
        var user = await db.Users.FindAsync(42);
        user!.PrimaryRoleId = 6;
        await db.SaveChangesAsync();
        var after = await reader.Read(42);
        Assert.Equal(before.Permissions.Select(permission => permission.Code), after.Permissions.Select(permission => permission.Code));
        (await db.UserRoles.FindAsync(2L))!.RevokedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        Assert.False((await reader.Read(42)).Allows("content.edit", 1));
    }

    [Fact]
    public async Task GlobalPermissionOnlyWidensThatPermissionAndOtherSourcesSurviveRevocation()
    {
        await using var db = await Create();
        db.UserRoles.Add(new() { UserRoleId = 4, UserId = 42, RoleId = 5, ScopeType = "GLOBAL" });
        await db.SaveChangesAsync();
        (await db.UserRoles.FindAsync(2L))!.RevokedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        var access = await new AccountAccessReader(db).Read(42);
        Assert.True(access.Allows("content.edit", 2));
        Assert.False(access.Allows("course.manage", 1));
        Assert.False(access.Allows("identity.manage", null));
    }

    [Fact]
    public async Task CourseListsAndAllMutationsRespectThePermissionDepartment()
    {
        await using var db = await Create();
        var service = new CourseService(new CourseRepository(db), new UnitOfWork(db), new AccountAccessReader(db));
        var page = await service.ListAsync(42, null, null, 0, 20, default);
        Assert.Equal(3, Assert.Single(page.Items).CourseId);
        Assert.Equal(2, Assert.Single(await service.DepartmentsAsync(42, default)).Id);
        Assert.NotNull(await service.GetAsync(3, 42, default));
        Assert.Equal(403, (await Assert.ThrowsAsync<UseCaseException>(() => service.GetAsync(1, 42, default))).Status);
        Assert.Equal(403, (await Assert.ThrowsAsync<UseCaseException>(() => service.GetAsync(2, 42, default))).Status);
        Assert.Equal(403, (await Assert.ThrowsAsync<UseCaseException>(() => service.ChangeStatusAsync(2, "Archived", 42, null, default))).Status);
        Assert.Equal(403, (await Assert.ThrowsAsync<UseCaseException>(() => service.ArchiveAsync(2, 42, null, default))).Status);
        Assert.Equal(403, (await Assert.ThrowsAsync<UseCaseException>(() => service.UpsertLessonAsync(2, null, new() { Title = "Lesson" }, 42, null, default))).Status);
        Assert.Equal(403, (await Assert.ThrowsAsync<UseCaseException>(() => service.DeleteLessonAsync(2, 1, 42, null, default))).Status);
        Assert.Equal(403, (await Assert.ThrowsAsync<UseCaseException>(() => service.DeleteMaterialAsync(2, 1, 1, 42, null, default))).Status);
        Assert.Equal(403, (await Assert.ThrowsAsync<UseCaseException>(() => service.UpdateAsync(3,
            new() { CourseCode = "MOVED", Name = "Moved", DepartmentId = 1 }, 42, null, default))).Status);
        Assert.Equal(2, (await db.Courses.FindAsync(3))!.DepartmentId);
    }

    [Fact]
    public async Task ScopedManagersCanCreateInTheirDepartmentAndCannotCreateSharedCatalogEntries()
    {
        await using var db = await Create();
        var service = new CourseService(new CourseRepository(db), new UnitOfWork(db), new AccountAccessReader(db));
        var result = await service.CreateAsync(new CourseUpsertRequest { CourseCode = "NEW-B", Name = "New B", DepartmentId = 2 }, 42, null, default);
        Assert.True(result.Succeeded);
        Assert.Equal(2, result.Value!.DepartmentId);
        Assert.Equal(403, (await Assert.ThrowsAsync<UseCaseException>(() => service.CreateAsync(
            new() { CourseCode = "DENIED", Name = "Shared" }, 42, null, default))).Status);
        (await db.UserRoles.FindAsync(3L))!.ScopeType = "GLOBAL";
        (await db.UserRoles.FindAsync(3L))!.DepartmentId = null;
        await db.SaveChangesAsync();
        Assert.Equal(4, (await service.ListAsync(42, null, null, 0, 20, default)).Total);
    }
}
