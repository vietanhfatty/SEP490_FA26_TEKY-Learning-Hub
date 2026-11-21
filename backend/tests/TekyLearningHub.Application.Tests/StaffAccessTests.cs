using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using TekyLearningHub.Application.DTOs.Admin;
using TekyLearningHub.Application.Services.Admin;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Domain.Security;
using TekyLearningHub.Infrastructure.Data;
using TekyLearningHub.Infrastructure.Security;
using Xunit;

namespace TekyLearningHub.Application.Tests;

public class StaffAccessTests
{
    [Fact]
    public void RoleListsUseJsonArraysForBrowserRequestsAndResponses()
    {
        var options = new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web);
        var request = System.Text.Json.JsonSerializer.Deserialize<PolicyRequest>("""{"version":1,"roleIds":[2,5],"permissionCodes":["content.read"],"employmentTypes":["FULL_TIME"],"publish":true}""", options)!;
        Assert.Equal(new[] { 2, 5 }, request.RoleIds);
        Assert.Equal(new[] { "content.read" }, request.PermissionCodes);
        var view = new PositionPolicyView(1, 1, "Teacher", "Teaching", true, 1, true, [2,5], ["FULL_TIME"], 0, 1, [2,5], ["FULL_TIME"], ["content.read"], ["content.read"]);
        using var json = System.Text.Json.JsonDocument.Parse(System.Text.Json.JsonSerializer.Serialize(view, options));
        Assert.Equal(System.Text.Json.JsonValueKind.Array, json.RootElement.GetProperty("activeRoleIds").ValueKind);
        Assert.Equal(System.Text.Json.JsonValueKind.Array, json.RootElement.GetProperty("permissionCodes").ValueKind);
        var preview = new StaffPreview([], [], [2,5], [], []);
        using var result = System.Text.Json.JsonDocument.Parse(System.Text.Json.JsonSerializer.Serialize(preview, options));
        Assert.Equal(System.Text.Json.JsonValueKind.Array, result.RootElement.GetProperty("availablePrimaryRoles").ValueKind);
    }

    private static async Task<ApplicationDbContext> Context(DatabaseMigrationTests.TestDatabase database)
    {
        await database.Migrate();
        await database.Execute("""
            INSERT dbo.Users(Email,PasswordHash,PrimaryRoleId,FullName) VALUES('admin@staff.test','hash',3,'Admin');
            INSERT dbo.UserRoles(UserId,RoleId,ScopeType) VALUES(1,3,'GLOBAL');
            INSERT dbo.UserRoleGrantSources(UserRoleId,Kind,Reason) SELECT UserRoleId,'SYSTEM_ADMIN',N'Test admin' FROM dbo.UserRoles;
            """);
        return new(new DbContextOptionsBuilder<ApplicationDbContext>().UseSqlServer(database.ConnectionString).Options);
    }
    private static UserAdministrationService Administration(ApplicationDbContext db) => TestServices.Administration(db, new PasswordHasher(),
        new EphemeralDataProtectionProvider(), new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["Account:InvitationBaseUrl"] = "http://localhost:3001" }).Build());
    private static AppointmentInput Input(PositionPolicyView policy, string? employment = null) => new() { PositionId = policy.PositionId,
        DepartmentId = policy.DepartmentId, PolicyVersion = policy.ActiveVersion!.Value, EmploymentType = employment ?? policy.ActiveEmploymentTypes![0] };

    [SqlServerFact]
    public async Task NewStaffDerivesGrantsFromPositionsAndKeepsSharedSourcesUntilTheLastAppointmentEnds()
    {
        await using var database = new DatabaseMigrationTests.TestDatabase();
        await using var db = await Context(database);
        var staff = TestServices.StaffAccess(db);
        var policies = await staff.Policies(1);
        var first = policies.Single(policy => policy.Position == "Giáo viên Fulltime");
        var second = policies.Single(policy => policy.Position == "Giáo viên Part time");
        var created = await Administration(db).Create(1, new() { Email = "teacher@staff.test", FullName = "Teacher", PrimaryRoleId = 2,
            Appointments = [Input(first), Input(second)] });
        db.ChangeTracker.Clear();
        var access = await new AccountAccessReader(db).Read(created.UserId, includeInactive: true);
        Assert.Single(access.Grants);
        Assert.Equal(2, access.Grants[0].Sources!.Length);
        var state = await staff.State(created.UserId);
        Assert.True(state.IsManaged); Assert.False(state.NeedsReconciliation);
        Assert.Equal(2, state.Appointments.Count(x => x.ValidTo == null));
        var version = await database.Scalar($"SELECT AdministrationVersion FROM dbo.Users WHERE UserId={created.UserId}");
        var security = await database.Scalar($"SELECT SecurityVersion FROM dbo.Users WHERE UserId={created.UserId}");
        await staff.Change(1, created.UserId, new() { Version = version, EndAppointmentId = state.Appointments[0].AppointmentId, Reason = "Kết thúc một kiêm nhiệm" });
        db.ChangeTracker.Clear();
        Assert.Single((await new AccountAccessReader(db).Read(created.UserId, includeInactive: true)).Grants);
        Assert.Equal(security + 1, await database.Scalar($"SELECT SecurityVersion FROM dbo.Users WHERE UserId={created.UserId}"));
        state = await staff.State(created.UserId);
        var last = state.Appointments.Single(x => x.ValidTo == null);
        var denied = await Assert.ThrowsAsync<UserAdministrationException>(() => staff.Change(1, created.UserId,
            new() { Version = version + 1, EndAppointmentId = last.AppointmentId }));
        Assert.Equal(409, denied.Status);
        Assert.Equal(1, await database.Scalar($"SELECT COUNT(*) FROM dbo.StaffAppointments WHERE UserId={created.UserId} AND ValidTo IS NULL"));
        await staff.Change(1, created.UserId, new() { Version = version + 1, EndAppointmentId = last.AppointmentId, DisableAccess = true, Reason = "Ngừng công tác" });
        Assert.Equal("Locked", await database.Text($"SELECT Status FROM dbo.Users WHERE UserId={created.UserId}"));
        Assert.Equal(0, await database.Scalar($"SELECT COUNT(*) FROM dbo.UserRoles WHERE UserId={created.UserId} AND RevokedAt IS NULL"));
    }

    [SqlServerFact]
    public async Task InvalidOrDraftPositionsAndClientRoleInjectionCannotCreateStaff()
    {
        await using var database = new DatabaseMigrationTests.TestDatabase(); await using var db = await Context(database);
        var staff = TestServices.StaffAccess(db); var service = Administration(db);
        var academic = await database.Scalar("SELECT DepartmentId FROM dbo.Departments WHERE Code='ACADEMIC'");
        await service.Directory(1, "positions", null, new() { Name = "Chức danh nháp", DepartmentId = academic });
        var policies = await staff.Policies(1);
        var first = policies.Single(policy => policy.Position == "Giáo viên Fulltime");
        var draft = policies.First(policy => !policy.ActiveVersion.HasValue);
        foreach (var input in new[] {
            new AppointmentInput {PositionId=first.PositionId,DepartmentId=999,PolicyVersion=first.ActiveVersion!.Value},
            new AppointmentInput {PositionId=first.PositionId,DepartmentId=first.DepartmentId,PolicyVersion=999},
            new AppointmentInput {PositionId=first.PositionId,DepartmentId=first.DepartmentId,PolicyVersion=first.ActiveVersion!.Value,EmploymentType="PART_TIME"},
            new AppointmentInput {PositionId=draft.PositionId,DepartmentId=draft.DepartmentId,PolicyVersion=draft.Version}
        }) await Assert.ThrowsAsync<UserAdministrationException>(() => service.Create(1, new() {Email="invalid@staff.test",FullName="Invalid",PrimaryRoleId=2,Appointments=[input]}));
        await Assert.ThrowsAsync<UserAdministrationException>(() => service.Create(1, new() { Email = "spoof@staff.test", FullName = "Spoof", PrimaryRoleId = 2,
            Appointments = [Input(first)], Grants = [new() {RoleId=3,ScopeType="GLOBAL"}] }));
        await Assert.ThrowsAsync<UserAdministrationException>(() => service.Create(1, new() { Email = "admin-bypass@staff.test", FullName = "Bypass", PrimaryRoleId = 3,
            Grants = [new() {RoleId=3,ScopeType="GLOBAL"},new() {RoleId=5,ScopeType="GLOBAL"}] }));
        Assert.Equal(1, await database.Scalar("SELECT COUNT(*) FROM dbo.Users"));
        await Assert.ThrowsAsync<UserAdministrationException>(() => staff.SavePolicy(1, draft.PositionId, new() {Version=draft.Version,RoleIds=[3],Publish=true}));
    }

    [SqlServerFact]
    public async Task ReconciliationPreservesOnlyExplicitExceptionsAndNeverAutomaticallyUpgradesLegacyRights()
    {
        await using var database = new DatabaseMigrationTests.TestDatabase(); await using var db = await Context(database);
        await database.Execute("""
            INSERT dbo.Users(Email,PasswordHash,PrimaryRoleId,FullName) VALUES('legacy@staff.test','hash',2,'Legacy');
            INSERT dbo.UserRoles(UserId,RoleId,ScopeType) VALUES(2,2,'GLOBAL');
            INSERT dbo.UserRoleGrantSources(UserRoleId,Kind,Reason) SELECT UserRoleId,'LEGACY',N'Imported' FROM dbo.UserRoles WHERE UserId=2;
            """);
        var staff = TestServices.StaffAccess(db);
        Assert.True((await staff.State(2)).NeedsReconciliation);
        var policy = (await staff.Policies(1)).Single(x => x.Position == "Giáo viên Fulltime");
        await Assert.ThrowsAsync<UserAdministrationException>(() => staff.Change(1, 2, new() { Version = 0, Appointment = Input(policy) }));
        var preview = await staff.ReconcilePreview(1, 2, new() {Version=0,Appointments=[Input(policy)],Reason="Chuyển theo chức danh"});
        Assert.Equal("GLOBAL", Assert.Single(preview.Before).ScopeType);
        Assert.Equal("DEPARTMENT", Assert.Single(preview.After).ScopeType);
        Assert.Equal(1, await database.Scalar("SELECT COUNT(*) FROM dbo.UserRoles WHERE UserId=2 AND ScopeType='GLOBAL' AND RevokedAt IS NULL"));
        await staff.Reconcile(1, 2, new() {Version=0,Appointments=[Input(policy)],Reason="Đối soát đúng phòng giảng dạy"});
        db.ChangeTracker.Clear();
        Assert.False((await staff.State(2)).NeedsReconciliation);
        Assert.Equal(0, await database.Scalar("SELECT COUNT(*) FROM dbo.UserRoles WHERE UserId=2 AND ScopeType='GLOBAL' AND RevokedAt IS NULL"));
        var nextVersion = await database.Scalar("SELECT AdministrationVersion FROM dbo.Users WHERE UserId=2");
        var grant = await database.Scalar("SELECT UserRoleId FROM dbo.UserRoles WHERE UserId=2 AND RevokedAt IS NULL");
        await staff.Reconcile(1, 2, new() { Version=nextVersion, RetainGrantIds=[grant], Reason="Giữ quyền theo phân công đặc biệt" });
        var state = await staff.State(2);
        Assert.DoesNotContain(state.Appointments, x => x.ValidTo == null);
        Assert.Equal("EXCEPTION", Assert.Single(state.Sources).Kind);
    }

    [SqlServerFact]
    public async Task PolicyPublicationChangesOnlyItsSourcesAndRejectsStaleVersionsAndMovingUsedPositions()
    {
        await using var database = new DatabaseMigrationTests.TestDatabase(); await using var db = await Context(database);
        var staff = TestServices.StaffAccess(db); var service = Administration(db);
        var policies = await staff.Policies(1); var first = policies.Single(x => x.Position == "Giáo viên Fulltime");
        var second = policies.Single(x => x.Position == "Giáo viên Part time");
        var created = await service.Create(1, new() {Email="policy@staff.test",FullName="Policy",PrimaryRoleId=2,Appointments=[Input(first),Input(second)]});
        var request = new PolicyRequest {Version=first.Version,RoleIds=[5],PermissionCodes=first.ActivePermissionCodes ?? [],
            EmploymentTypes=["FULL_TIME"],Publish=true,Reason="Đổi nghiệp vụ"};
        var preview = await staff.PolicyPreview(1, first.PositionId, request);
        Assert.Equal(new byte[] {2,5}, preview.UserChanges!.Single().After.Select(x=>x.RoleId).Order());
        await staff.SavePolicy(1, first.PositionId, request);
        db.ChangeTracker.Clear();
        var access = await new AccountAccessReader(db).Read(created.UserId, includeInactive:true);
        Assert.Equal(new byte[] {2,5}, access.Grants.Select(x=>x.RoleId).Order());
        await Assert.ThrowsAsync<UserAdministrationException>(()=>staff.SavePolicy(1,first.PositionId,request));
        var otherDepartment = policies.First(x=>x.DepartmentId!=first.DepartmentId).DepartmentId;
        var error = await Assert.ThrowsAsync<UserAdministrationException>(()=>service.Directory(1,"positions",first.PositionId,
            new(){Name=first.Position,DepartmentId=otherDepartment}));
        Assert.Equal(409,error.Status);
    }

    [Fact]
    public void ManagedAccountsDoNotAuthorizeEndedSourcesEvenIfTheGrantWasNotRevoked()
    {
        var user = new User { UserId=1, StaffAccessManaged=true, PrimaryRoleId=2 };
        var appointment = new StaffAppointment { PolicyId=7, ValidTo=DateTime.UtcNow };
        user.RoleAssignments.Add(new() {RoleId=2,Sources=[new() {Kind="APPOINTMENT",Appointment=appointment,PolicyId=7}]});
        Assert.Empty(UserAuthorization.Roles(user)); Assert.False(UserAuthorization.HasValidPrimaryRole(user));
        appointment.ValidTo=null;
        Assert.Equal(new[]{"teacher"},UserAuthorization.Roles(user));
    }

    [SqlServerFact]
    public async Task ScopedTeachingIntersectsAssignmentAndDepartmentAndExplicitExceptionsKeepSeparateScope()
    {
        await using var database = new DatabaseMigrationTests.TestDatabase(); await using var db = await Context(database);
        var staff = TestServices.StaffAccess(db);
        var policy = (await staff.Policies(1)).Single(x => x.Position == "Giáo viên Fulltime");
        var created = await Administration(db).Create(1, new() {Email="scope@staff.test",FullName="Scoped",PrimaryRoleId=2,Appointments=[Input(policy)]});
        await database.Execute($"""
            UPDATE dbo.Users SET Status='Active',ActivationPending=0 WHERE UserId={created.UserId};
            INSERT dbo.Courses(CourseCode,Name,DepartmentId) VALUES('OWNED','Owned',{policy.DepartmentId}),('SHARED','Shared',NULL);
            INSERT dbo.Classes(ClassCode,CourseId,TeacherId,Name)
             SELECT CourseCode,CourseId,{created.UserId},Name FROM dbo.Courses;
            """);
        var owned = await database.Scalar("SELECT ClassId FROM dbo.Classes WHERE ClassCode='OWNED'");
        var shared = await database.Scalar("SELECT ClassId FROM dbo.Classes WHERE ClassCode='SHARED'");
        var reader = new TeacherAccessReader(db);
        Assert.True(await reader.CanAccess(created.UserId,"class",owned,default));
        Assert.False(await reader.CanAccess(created.UserId,"class",shared,default));
        Assert.False(await reader.CanAccess(1,"class",owned,default));
        Assert.Equal(1,await database.Scalar($"SELECT CAST(dbo.HasAcademicPermission({created.UserId},'content.read',{policy.DepartmentId}) AS int)"));
        var version=await database.Scalar($"SELECT AdministrationVersion FROM dbo.Users WHERE UserId={created.UserId}");
        await staff.GrantException(1,created.UserId,new(){Version=version,Grant=new(){RoleId=2,ScopeType="GLOBAL"},Reason="Giảng dạy liên phòng theo phân công"});
        Assert.True(await reader.CanAccess(created.UserId,"class",shared,default));
        Assert.Equal(2,(await new AccountAccessReader(db).Read(created.UserId)).Grants.Length);
        Assert.False((await new AccountAccessReader(db).Read(created.UserId)).Allows("content.edit",policy.DepartmentId));
    }

    [SqlServerFact]
    public async Task TransferIsAtomicAndStaleConcurrentCommandsCannotDuplicateAppointments()
    {
        await using var database = new DatabaseMigrationTests.TestDatabase(); await using var db = await Context(database);
        var staff = TestServices.StaffAccess(db);
        var policies=await staff.Policies(1);var first=policies.Single(x=>x.Position=="Giáo viên Fulltime");
        var second=policies.Single(x=>x.Position=="Giáo viên Part time");
        var created=await Administration(db).Create(1,new(){Email="transfer@staff.test",FullName="Transfer",PrimaryRoleId=2,Appointments=[Input(first)]});
        var state=await staff.State(created.UserId);var current=state.Appointments.Single();
        var invalid=Input(second);invalid.PolicyVersion=999;
        await Assert.ThrowsAsync<UserAdministrationException>(()=>staff.Change(1,created.UserId,new(){Version=0,EndAppointmentId=current.AppointmentId,Appointment=invalid}));
        Assert.Equal(1,await database.Scalar($"SELECT COUNT(*) FROM dbo.StaffAppointments WHERE UserId={created.UserId} AND ValidTo IS NULL"));
        await staff.Change(1,created.UserId,new(){Version=0,EndAppointmentId=current.AppointmentId,Appointment=Input(second),Reason="Chuyển loại hình công tác"});
        await Assert.ThrowsAsync<UserAdministrationException>(()=>staff.Change(1,created.UserId,new(){Version=0,Appointment=Input(first)}));
        state=await staff.State(created.UserId);
        Assert.Equal(second.PositionId,Assert.Single(state.Appointments,x=>x.ValidTo==null).PositionId);
        Assert.Single(state.Sources);
    }
}
