using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using TekyLearningHub.Application.DTOs.Admin;
using TekyLearningHub.Application.DTOs.Auth;
using TekyLearningHub.Application.Services.Admin;
using TekyLearningHub.Infrastructure.Data;
using TekyLearningHub.Infrastructure.Security;
using Xunit;

namespace TekyLearningHub.Application.Tests;
public class UserAdministrationTests
{
    [SqlServerFact]
    public async Task DirectoryRejectsDuplicateCodesIncludingInactiveEntriesWithoutChangingExistingData()
    {
        await using var database = new DatabaseMigrationTests.TestDatabase(); await database.Migrate();
        await database.Execute("INSERT dbo.Users(Email,PasswordHash,PrimaryRoleId,FullName) VALUES('admin@test.local','hash',3,'Admin'); INSERT dbo.UserRoles(UserId,RoleId,ScopeType) VALUES(1,3,'GLOBAL');");
        await using var db = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseSqlServer(database.ConnectionString).Options);
        var service = TestServices.Administration(db, new PasswordHasher(), new EphemeralDataProtectionProvider(), new ConfigurationBuilder().Build());
        var academic = await database.Scalar("SELECT DepartmentId FROM dbo.Departments WHERE Code='ACADEMIC'");
        foreach (var (kind, table, key, label) in new[] { ("positions", "Positions", "PositionId", "chức danh"), ("departments", "Departments", "DepartmentId", "phòng ban") })
        {
            var code = kind == "positions" ? "ACADEMIC_SPECIALIST" : "ACADEMIC";
            // Positions belong to a department; departments do not.
            int? owner = kind == "positions" ? academic : null;
            var id = await database.Scalar($"SELECT {key} FROM dbo.{table} WHERE Code='{code}'");
            var audits = await database.Scalar("SELECT COUNT(*) FROM dbo.AuditLogs WHERE Action='DIRECTORY_UPDATED'");
            foreach (var active in new[] { true, false })
            {
                await database.Execute($"UPDATE dbo.{table} SET IsActive={(active ? 1 : 0)} WHERE {key}={id}");
                var duplicate = await Assert.ThrowsAsync<UserAdministrationException>(() => service.Directory(1, kind, null, new() { Code = code, Name = "Must not overwrite", DepartmentId = owner }));
                Assert.Equal(409, duplicate.Status); Assert.Contains($"Mã {label} đã tồn tại", duplicate.Message);
                Assert.Equal(1, await database.Scalar($"SELECT COUNT(*) FROM dbo.{table} WHERE Code='{code}' AND Name<>N'Must not overwrite' AND IsActive={(active ? 1 : 0)}"));
                Assert.Equal(audits, await database.Scalar("SELECT COUNT(*) FROM dbo.AuditLogs WHERE Action='DIRECTORY_UPDATED'"));
            }
            await service.Directory(1, kind, id, new() { Code = code, Name = "Renamed", IsActive = true, DepartmentId = owner });
            Assert.Equal(1, await database.Scalar($"SELECT COUNT(*) FROM dbo.{table} WHERE {key}={id} AND Name='Renamed' AND IsActive=1"));
            await service.Directory(1, kind, null, new() { Code = "NEW_ENTRY", Name = "New entry", DepartmentId = owner });
            Assert.Equal(1, await database.Scalar($"SELECT COUNT(*) FROM dbo.{table} WHERE Code='NEW_ENTRY' AND Name='New entry'"));
            Assert.Equal(audits + 2, await database.Scalar("SELECT COUNT(*) FROM dbo.AuditLogs WHERE Action='DIRECTORY_UPDATED'"));
        }
    }
    [SqlServerFact]
    public async Task PositionRequiresDepartmentAndGeneratesCodeFromDepartmentPrefix()
    {
        await using var database = new DatabaseMigrationTests.TestDatabase(); await database.Migrate();
        await database.Execute("INSERT dbo.Users(Email,PasswordHash,PrimaryRoleId,FullName) VALUES('admin@test.local','hash',3,'Admin'); INSERT dbo.UserRoles(UserId,RoleId,ScopeType) VALUES(1,3,'GLOBAL');");
        await using var db = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseSqlServer(database.ConnectionString).Options);
        var service = TestServices.Administration(db, new PasswordHasher(), new EphemeralDataProtectionProvider(), new ConfigurationBuilder().Build());

        // A position without a department is rejected before anything is written.
        var missingDepartment = await Assert.ThrowsAsync<UserAdministrationException>(() =>
            service.Directory(1, "positions", null, new() { Code = "NO_DEPARTMENT", Name = "Không có phòng ban" }));
        Assert.Equal(400, missingDepartment.Status);
        Assert.Contains("Vui lòng chọn phòng ban", missingDepartment.Message);
        Assert.Equal(0, await database.Scalar("SELECT COUNT(*) FROM dbo.Positions WHERE Code='NO_DEPARTMENT'"));

        // The code is generated from the owning department when the admin leaves it blank.
        var academic = await database.Scalar("SELECT DepartmentId FROM dbo.Departments WHERE Code='ACADEMIC'");
        await service.Directory(1, "positions", null, new() { Name = "Chuyên viên Giáo dục học thuật", DepartmentId = academic });
        var generated = await database.Text("SELECT TOP 1 Code FROM dbo.Positions WHERE Name=N'Chuyên viên Giáo dục học thuật'");
        Assert.Equal("ACADEMIC_CHUYEN_VIEN_GIAO_DUC_HOC_THUAT", generated);
        Assert.Equal(1, await database.Scalar($"SELECT COUNT(*) FROM dbo.Positions WHERE Code='ACADEMIC_CHUYEN_VIEN_GIAO_DUC_HOC_THUAT' AND DepartmentId={academic}"));

        // The same name in another department produces a different code.
        var operations = await database.Scalar("SELECT DepartmentId FROM dbo.Departments WHERE Code='TRAINING'");
        await service.Directory(1, "positions", null, new() { Name = "Giáo viên Fulltime", DepartmentId = operations });
        Assert.Equal(1, await database.Scalar($"SELECT COUNT(*) FROM dbo.Positions WHERE Code='TRAINING_GIAO_VIEN_FULLTIME' AND DepartmentId={operations}"));

        // The same code is rejected twice inside one department but allowed across departments.
        var duplicate = await Assert.ThrowsAsync<UserAdministrationException>(() =>
            service.Directory(1, "positions", null, new() { Code = "ACADEMIC_CHUYEN_VIEN_GIAO_DUC_HOC_THUAT", Name = "Trùng mã", DepartmentId = academic }));
        Assert.Equal(409, duplicate.Status);
        Assert.Contains("Mã chức danh đã tồn tại", duplicate.Message);

        // The same short code is allowed in a different department.
        await service.Directory(1, "positions", null, new() { Code = "ACADEMIC_CHUYEN_VIEN_GIAO_DUC_HOC_THUAT", Name = "Cùng mã ở phòng khác", DepartmentId = operations });
        Assert.Equal(1, await database.Scalar($"SELECT COUNT(*) FROM dbo.Positions WHERE Code='ACADEMIC_CHUYEN_VIEN_GIAO_DUC_HOC_THUAT' AND DepartmentId={operations}"));

        // Departments still require an explicit code.
        var departmentWithoutCode = await Assert.ThrowsAsync<UserAdministrationException>(() =>
            service.Directory(1, "departments", null, new() { Name = "Phòng ban không mã" }));
        Assert.Equal(400, departmentWithoutCode.Status);
        Assert.Contains("Mã phòng ban không được để trống", departmentWithoutCode.Message);
    }

    [SqlServerFact]
    public async Task AppointmentRejectsPositionFromAnotherDepartment()
    {
        await using var database = new DatabaseMigrationTests.TestDatabase(); await database.Migrate();
        await database.Execute("INSERT dbo.Users(Email,PasswordHash,PrimaryRoleId,FullName) VALUES('admin@test.local','hash',3,'Admin'),('teacher@test.local','hash',2,'Teacher'); INSERT dbo.UserRoles(UserId,RoleId,ScopeType) VALUES(1,3,'GLOBAL'),(2,2,'GLOBAL');");
        await using var db = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseSqlServer(database.ConnectionString).Options);
        var service = TestServices.Administration(db, new PasswordHasher(), new EphemeralDataProtectionProvider(), new ConfigurationBuilder().Build());

        var academic = await database.Scalar("SELECT DepartmentId FROM dbo.Departments WHERE Code='ACADEMIC'");
        var operations = await database.Scalar("SELECT DepartmentId FROM dbo.Departments WHERE Code='TRAINING'");
        var position = await database.Scalar("SELECT PositionId FROM dbo.Positions WHERE Code='TEACHER_FULL_TIME'");
        await database.Execute("UPDATE dbo.Users SET StaffAccessManaged=1 WHERE UserId=2; INSERT dbo.UserRoleGrantSources(UserRoleId,Kind,Reason) SELECT UserRoleId,'EXCEPTION',N'Test assignment' FROM dbo.UserRoles WHERE UserId=2;");

        // The position belongs to ACADEMIC, so appointing it to TRAINING is rejected.
        var mismatch = await Assert.ThrowsAsync<UserAdministrationException>(() =>
            service.Appointment(1, 2, new() { Version = 0, PolicyVersion = 1, DepartmentId = operations, PositionId = position, EmploymentType = "FULL_TIME" }, null));
        Assert.Equal(400, mismatch.Status);
        Assert.Contains("Chức danh không thuộc phòng ban đã chọn", mismatch.Message);
        Assert.Equal(0, await database.Scalar("SELECT COUNT(*) FROM dbo.StaffAppointments WHERE UserId=2"));

        // The matching department is accepted.
        await service.Appointment(1, 2, new() { Version = 0, PolicyVersion = 1, DepartmentId = academic, PositionId = position, EmploymentType = "FULL_TIME" }, null);
        Assert.Equal(1, await database.Scalar("SELECT COUNT(*) FROM dbo.StaffAppointments WHERE UserId=2 AND DepartmentId=" + academic));
    }

    [SqlServerFact]
    public async Task PersonalAccountsRejectMixedRolesAndStaffAppointments()
    {
        await using var database = new DatabaseMigrationTests.TestDatabase(); await database.Migrate();
        await database.Execute("INSERT dbo.Users(Email,PasswordHash,PrimaryRoleId,FullName) VALUES('admin@test.local','hash',3,'Admin'),('parent@test.local','hash',4,'Parent'),('student@test.local','hash',1,'Student'); INSERT dbo.UserRoles(UserId,RoleId,ScopeType) VALUES(1,3,'GLOBAL'),(2,4,'GLOBAL'),(3,1,'GLOBAL');");
        await using var db = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseSqlServer(database.ConnectionString).Options);
        var service = TestServices.Administration(db, new PasswordHasher(), new EphemeralDataProtectionProvider(), new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { { "Account:InvitationBaseUrl", "http://localhost:3001" } }).Build());
        foreach (byte primary in new byte[] { 1, 4, 2 })
        {
            var rejected = await Assert.ThrowsAsync<UserAdministrationException>(() => service.Create(1, new() { Email = $"mixed{primary}@test.local", FullName = "Mixed", PrimaryRoleId = primary, Grants = [new() { RoleId = primary }, new() { RoleId = primary == 2 ? (byte)4 : (byte)2 }] }));
            Assert.Equal(400, rejected.Status);
        }
        foreach (var id in new[] { 2, 3 })
        {
            var grant = await Assert.ThrowsAsync<UserAdministrationException>(() => service.Mutate(1, id, "grant", new() { Grant = new() { RoleId = 2 } })); Assert.Equal(409, grant.Status);
            var primary = await Assert.ThrowsAsync<UserAdministrationException>(() => service.Mutate(1, id, "primary", new() { PrimaryRoleId = 2 })); Assert.Equal(409, primary.Status);
            var revoke = await Assert.ThrowsAsync<UserAdministrationException>(() => service.Mutate(1, id, "revoke", new(), id)); Assert.Equal(409, revoke.Status);
            var appointment = await Assert.ThrowsAsync<UserAdministrationException>(() => service.Appointment(1, id, new() { DepartmentId = 1, PositionId = 1 }, null)); Assert.Equal(409, appointment.Status);
        }
        // The default role need not be the first grant in the request.
        var staffService = TestServices.StaffAccess(db);
        var positionPolicy = (await staffService.Policies(1)).Single(x => x.Position == "Giáo viên Fulltime");
        var updated = await staffService.SavePolicy(1, positionPolicy.PositionId, new() { Version = positionPolicy.Version,
            RoleIds = [2,6], PermissionCodes = positionPolicy.ActivePermissionCodes ?? [], EmploymentTypes = ["FULL_TIME"], Publish = true });
        await service.Create(1, new() { Email = "staff@test.local", FullName = "Staff", PrimaryRoleId = 6,
            Appointments = [new() { PositionId = updated.PositionId, DepartmentId = updated.DepartmentId, PolicyVersion = updated.ActiveVersion!.Value }] });
        Assert.Equal(2, await database.Scalar("SELECT COUNT(*) FROM dbo.UserRoles WHERE UserId=(SELECT UserId FROM dbo.Users WHERE Email='staff@test.local') AND RevokedAt IS NULL"));
        Assert.Equal(2, await database.Scalar("SELECT COUNT(*) FROM dbo.UserRoles WHERE UserId IN (2,3) AND RevokedAt IS NULL"));
    }
    [SqlServerFact]
    public async Task InvitationCreatesProfileActivatesOnceAndNormalizesEmail()
    {
        await using var database = new DatabaseMigrationTests.TestDatabase(); await database.Migrate();
        await database.Execute("INSERT dbo.Users(Email,PasswordHash,PrimaryRoleId,FullName) VALUES('admin@test.local','hash',3,'Admin'); INSERT dbo.UserRoles(UserId,RoleId,ScopeType) VALUES(1,3,'GLOBAL');");
        await using var db = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseSqlServer(database.ConnectionString).Options);
        var protection = new EphemeralDataProtectionProvider(); var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { { "Account:InvitationBaseUrl", "http://localhost:3001" } }).Build();
        var service = TestServices.Administration(db, new PasswordHasher(), protection, config);
        await service.Create(1, new CreateUserRequest { Email = "New@Test.Local", FullName = "New user", PrimaryRoleId = 1, Grants = [new() { RoleId = 1 }] });
        Assert.Equal(1, await database.Scalar("SELECT COUNT(*) FROM dbo.Users WHERE Email='new@test.local' AND Status='Pending' AND ActivationPending=1"));
        Assert.Equal(1, await database.Scalar("SELECT COUNT(*) FROM dbo.StudentProfiles WHERE UserId=2"));
        var mail = await db.AccountEmails.SingleAsync(); var body = protection.CreateProtector("AccountEmail.v1").Unprotect(mail.ProtectedBody);
        var token = body.Split("#token=")[1].Split('\n')[0]; var request = new AcceptInvitationRequest { Token = token, NewPassword = "Valid-password-2026", ConfirmPassword = "Valid-password-2026" };
        await service.Accept(request); Assert.Equal(1, await database.Scalar("SELECT COUNT(*) FROM dbo.Users WHERE UserId=2 AND Status='Active' AND ActivationPending=0"));
        var used = await Assert.ThrowsAsync<UserAdministrationException>(() => service.Accept(request)); Assert.Equal(400, used.Status);
        var duplicate = await Assert.ThrowsAsync<UserAdministrationException>(() => service.Create(1, new CreateUserRequest { Email = "NEW@test.local", FullName = "Duplicate", PrimaryRoleId = 1, Grants = [new() { RoleId = 1 }] })); Assert.Equal(409, duplicate.Status);
    }
    [SqlServerFact]
    public async Task GrantsInvalidateSessionsAndRejectStaleUpdatesAndNonAdmins()
    {
        await using var database = new DatabaseMigrationTests.TestDatabase(); await database.Migrate();
        await database.Execute("INSERT dbo.Users(Email,PasswordHash,PrimaryRoleId,FullName) VALUES('admin@test.local','hash',3,'Admin'),('teacher@test.local','hash',2,'Teacher'); INSERT dbo.UserRoles(UserId,RoleId,ScopeType) VALUES(1,3,'GLOBAL'),(2,2,'GLOBAL'); INSERT dbo.UserSessions(UserId,TokenHash) VALUES(2,'session');");
        await using var db = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseSqlServer(database.ConnectionString).Options);
        var service = TestServices.Administration(db, new PasswordHasher(), new EphemeralDataProtectionProvider(), new ConfigurationBuilder().Build());
        var denied = await Assert.ThrowsAsync<UserAdministrationException>(() => service.List(2, null, null, null, null, 0, 20)); Assert.Equal(403, denied.Status);
        await Assert.ThrowsAsync<UserAdministrationException>(() => service.Mutate(1, 2, "grant", new() { Version = 0, Grant = new() { RoleId = 5, ScopeType = "DEPARTMENT", DepartmentId = 1 } }));
        var staffService = TestServices.StaffAccess(db);
        var policy = (await staffService.Policies(1)).Single(x => x.Position == "Giáo viên Fulltime");
        await staffService.Reconcile(1, 2, new() { Version = 0, Reason = "Liên kết quyền với công tác thực tế",
            Appointments = [new() { PositionId = policy.PositionId, DepartmentId = policy.DepartmentId, PolicyVersion = policy.ActiveVersion!.Value }] });
        Assert.Equal(0, await database.Scalar("SELECT COUNT(*) FROM dbo.UserSessions WHERE UserId=2 AND IsActive=1"));
        Assert.Equal(1, await database.Scalar("SELECT SecurityVersion FROM dbo.Users WHERE UserId=2"));
        var stale = await Assert.ThrowsAsync<UserAdministrationException>(() => service.Update(1, 2, new() { Version = 0, FullName = "Stale" })); Assert.Equal(409, stale.Status);
        var own = await Assert.ThrowsAsync<UserAdministrationException>(() => service.Mutate(1, 1, "status", new() { Status = "Locked", Reason = "Test" })); Assert.Equal(409, own.Status);
    }
}
