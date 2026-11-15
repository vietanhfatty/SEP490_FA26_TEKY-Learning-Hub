using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using TekyLearningHub.Application.DTOs.Auth;
using TekyLearningHub.Infrastructure.Data;
using TekyLearningHub.Infrastructure.Security;
using TekyLearningHub.Infrastructure.Services;
using Xunit;
namespace TekyLearningHub.Application.Tests;
public class UserAdministrationTests
{
 [SqlServerFact]
 public async Task InvitationCreatesProfileActivatesOnceAndNormalizesEmail()
 {
  await using var database=new DatabaseMigrationTests.TestDatabase();await database.Migrate();
  await database.Execute("INSERT dbo.Users(Email,PasswordHash,PrimaryRoleId,FullName) VALUES('admin@test.local','hash',3,'Admin'); INSERT dbo.UserRoles(UserId,RoleId,ScopeType) VALUES(1,3,'GLOBAL');");
  await using var db=new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseSqlServer(database.ConnectionString).Options);
  var protection=new EphemeralDataProtectionProvider();var config=new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string?>{{"Account:InvitationBaseUrl","http://localhost:3001"}}).Build();
  var service=new UserAdministrationService(db,new PasswordHasher(),protection,config);
  await service.Create(1,new CreateUserRequest{Email="New@Test.Local",FullName="New user",PrimaryRoleId=1,Grants=[new(){RoleId=1}]});
  Assert.Equal(1,await database.Scalar("SELECT COUNT(*) FROM dbo.Users WHERE Email='new@test.local' AND Status='Pending' AND ActivationPending=1"));
  Assert.Equal(1,await database.Scalar("SELECT COUNT(*) FROM dbo.StudentProfiles WHERE UserId=2"));
  var mail=await db.AccountEmails.SingleAsync();var body=protection.CreateProtector("AccountEmail.v1").Unprotect(mail.ProtectedBody);
  var token=body.Split("#token=")[1].Split('\n')[0];var request=new AcceptInvitationRequest{Token=token,NewPassword="Valid-password-2026",ConfirmPassword="Valid-password-2026"};
  await service.Accept(request);Assert.Equal(1,await database.Scalar("SELECT COUNT(*) FROM dbo.Users WHERE UserId=2 AND Status='Active' AND ActivationPending=0"));
  var used=await Assert.ThrowsAsync<UserAdministrationException>(()=>service.Accept(request));Assert.Equal(400,used.Status);
  var duplicate=await Assert.ThrowsAsync<UserAdministrationException>(()=>service.Create(1,new CreateUserRequest{Email="NEW@test.local",FullName="Duplicate",PrimaryRoleId=1,Grants=[new(){RoleId=1}]}));Assert.Equal(409,duplicate.Status);
 }
 [SqlServerFact]
 public async Task GrantsInvalidateSessionsAndRejectStaleUpdatesAndNonAdmins()
 {
  await using var database=new DatabaseMigrationTests.TestDatabase();await database.Migrate();
  await database.Execute("INSERT dbo.Users(Email,PasswordHash,PrimaryRoleId,FullName) VALUES('admin@test.local','hash',3,'Admin'),('teacher@test.local','hash',2,'Teacher'); INSERT dbo.UserRoles(UserId,RoleId,ScopeType) VALUES(1,3,'GLOBAL'),(2,2,'GLOBAL'); INSERT dbo.UserSessions(UserId,TokenHash) VALUES(2,'session');");
  await using var db=new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseSqlServer(database.ConnectionString).Options);
  var service=new UserAdministrationService(db,new PasswordHasher(),new EphemeralDataProtectionProvider(),new ConfigurationBuilder().Build());
  var denied=await Assert.ThrowsAsync<UserAdministrationException>(()=>service.List(2,null,null,null,null,0,20));Assert.Equal(403,denied.Status);
  await service.Mutate(1,2,"grant",new(){Version=0,Grant=new(){RoleId=5,ScopeType="DEPARTMENT",DepartmentId=1}});
  Assert.Equal(0,await database.Scalar("SELECT COUNT(*) FROM dbo.UserSessions WHERE UserId=2 AND IsActive=1"));
  Assert.Equal(1,await database.Scalar("SELECT SecurityVersion FROM dbo.Users WHERE UserId=2"));
  var stale=await Assert.ThrowsAsync<UserAdministrationException>(()=>service.Update(1,2,new(){Version=0,FullName="Stale"}));Assert.Equal(409,stale.Status);
  var own=await Assert.ThrowsAsync<UserAdministrationException>(()=>service.Mutate(1,1,"status",new(){Status="Locked",Reason="Test"}));Assert.Equal(409,own.Status);
 }
}
