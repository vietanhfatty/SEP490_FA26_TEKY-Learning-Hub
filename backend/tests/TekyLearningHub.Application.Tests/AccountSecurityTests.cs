using System.Security.Claims;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using TekyLearningHub.Api.Controllers;
using TekyLearningHub.Application.DTOs.Auth;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Infrastructure.Data;
using TekyLearningHub.Infrastructure.Security;
using TekyLearningHub.Infrastructure.Services;
using Xunit;

namespace TekyLearningHub.Application.Tests;
public class AccountSecurityTests {
 readonly PasswordHasher hasher=new();
 readonly EphemeralDataProtectionProvider protection=new();
 [Theory]
 [InlineData(1,"Student","student")]
 [InlineData(2,"Teacher","teacher")]
 [InlineData(3,"Admin","admin")]
 [InlineData(4,"Parent","parent")]
 [InlineData(5,"Staff","staff")]
 [InlineData(6,"AcademicManager","academic_manager")]
 public async Task LoginReturnsExpectedRoleForEachRealRole(byte id, string roleName, string expected) {
  using var db=CreateDb();
  var user=db.Users.Single();
  if(id==1) user.Role.RoleName=roleName;
  else {user.RoleId=id;user.Role=new Role {RoleId=id,RoleName=roleName};}
  await db.SaveChangesAsync();
  var config=new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string?>{{"Jwt:Secret",new string('x',64)}}).Build();
  var result=await new AuthService(db,hasher,new JwtTokenGenerator(config),protection).LoginAsync(new LoginRequestDto{EmailOrUsername=user.Email,Password="OriginalPassword123"},null,null);
  Assert.True(result.Success);Assert.Equal(expected,result.Data!.User.Role);
  var jwt=new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler().ReadJwtToken(result.Data.AccessToken);
  Assert.Equal(expected,jwt.Claims.Single(c=>c.Type=="role").Value);
 }
 ApplicationDbContext CreateDb() {
  var db=new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
  db.Users.Add(new User {UserId=1,Email="user@example.com",FullName="Student",Status="Active",ThemeMode="Light",PasswordHash=hasher.HashPassword("OriginalPassword123"),RoleId=1,Role=new Role{RoleId=1,RoleName="Student"}});
  db.SaveChanges();return db;
 }
 AccountController Controller(ApplicationDbContext db) => new(db,hasher,protection) {ControllerContext=new ControllerContext {HttpContext=new DefaultHttpContext {User=new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier,"1")],"test"))}}};
 [Fact] public async Task ResetConsumesOtpAndRevokesSessions() {
  using var db=CreateDb();
  db.PasswordResetOtps.Add(new PasswordResetOtp {UserId=1,OtpHash=hasher.HashPassword("123456"),ExpiresAt=DateTime.UtcNow.AddMinutes(5)});
  db.UserSessions.Add(new UserSession{UserId=1,TokenHash="test",IsActive=true,LoginAt=DateTime.UtcNow});await db.SaveChangesAsync();
  var request=new ResetPasswordRequest{Email="user@example.com",Otp="123456",NewPassword="ReplacementPassword123",ConfirmPassword="ReplacementPassword123"};
  Assert.IsType<OkObjectResult>(await Controller(db).Reset(request));
  Assert.True(hasher.VerifyPassword(request.NewPassword,db.Users.Single().PasswordHash));
  Assert.Equal(1,db.Users.Single().SecurityVersion);Assert.False(db.UserSessions.Single().IsActive);Assert.NotNull(db.PasswordResetOtps.Single().UsedAt);
  Assert.IsType<BadRequestObjectResult>(await Controller(db).Reset(request));
 }
 [Fact] public async Task ExpiredOrExhaustedOtpCannotResetPassword() {
  using var db=CreateDb();var oldHash=db.Users.Single().PasswordHash;
  db.PasswordResetOtps.Add(new PasswordResetOtp{UserId=1,OtpHash=hasher.HashPassword("123456"),ExpiresAt=DateTime.UtcNow.AddMinutes(-1)});await db.SaveChangesAsync();
  Assert.IsType<BadRequestObjectResult>(await Controller(db).Reset(new ResetPasswordRequest{Email="user@example.com",Otp="123456",NewPassword="ReplacementPassword123"}));
  Assert.Equal(oldHash,db.Users.Single().PasswordHash);
 }
 [Fact] public async Task ChangeRejectsWrongCurrentPassword() {
  using var db=CreateDb();var hash=db.Users.Single().PasswordHash;
  Assert.IsType<BadRequestObjectResult>(await Controller(db).Change(new ChangePasswordRequest{CurrentPassword="wrong",NewPassword="ReplacementPassword123"}));
  Assert.Equal(hash,db.Users.Single().PasswordHash);Assert.Equal(0,db.Users.Single().SecurityVersion);
 }
 [Fact] public async Task LockoutStartsAtSixAndExpires() {
  using var db=CreateDb();var config=new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string?>{{"Jwt:Secret",new string('x',64)}}).Build();
  var service=new AuthService(db,hasher,new JwtTokenGenerator(config),protection);
  var bad=new LoginRequestDto {EmailOrUsername="user@example.com",Password="wrong"};
  for(int i=0;i<5;i++) await service.LoginAsync(bad,null,null);
  Assert.Null(db.Users.Single().LockoutEndAt);
  await service.LoginAsync(bad,null,null);Assert.True(db.Users.Single().LockoutEndAt>DateTime.UtcNow);Assert.Single(db.AccountEmails);
  var correct=new LoginRequestDto {EmailOrUsername="user@example.com",Password="OriginalPassword123"};
  Assert.False((await service.LoginAsync(correct,null,null)).Success);
  db.Users.Single().LockoutEndAt=DateTime.UtcNow.AddSeconds(-1);await db.SaveChangesAsync();
  Assert.True((await service.LoginAsync(correct,null,null)).Success);Assert.Equal(0,db.Users.Single().FailedLoginCount);Assert.Equal("Active",db.Users.Single().Status);
 }
 [Fact] public async Task ProfileRejectsPhoneOwnedByAnotherUser() {
  using var db=CreateDb();db.Users.Add(new User{UserId=2,Email="other@example.com",FullName="Other",PasswordHash="hash",Status="Active",ThemeMode="Light",Phone="0901234567"});await db.SaveChangesAsync();
  Assert.IsType<ConflictObjectResult>(await Controller(db).Profile(new UpdateProfileRequest{FullName="Changed",Phone="0901234567"}));
  Assert.Equal("Student",db.Users.Single(x=>x.UserId==1).FullName);
 }
 [Theory]
 [InlineData(true)]
 [InlineData(false)]
 public async Task ShellHandoffRequiresProofAndCannotBeReplayed(bool correctProof) {
  using var db=CreateDb();var refresh="refresh-secret";
  db.UserSessions.Add(new UserSession{UserId=1,TokenHash=Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(refresh))),IsActive=true,LoginAt=DateTime.UtcNow});await db.SaveChangesAsync();
  var config=new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string?>{{"Jwt:Secret",new string('x',64)}}).Build();
  var auth=new AuthService(db,hasher,new JwtTokenGenerator(config),protection);
  var controller=new ShellTransferController(db,auth,config) {ControllerContext=new ControllerContext{HttpContext=new DefaultHttpContext{User=new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier,"1")],"test"))}}};
  controller.Request.Headers.Origin="http://localhost:3001";
  var verifier=new string('v',64);
  var challenge=Microsoft.IdentityModel.Tokens.Base64UrlEncoder.Encode(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.ASCII.GetBytes(verifier)));
  var begin=Assert.IsType<OkObjectResult>(await controller.Begin(new(refresh,challenge,"http://localhost:3001")));
  var code=(string)begin.Value!.GetType().GetProperty("code")!.GetValue(begin.Value)!;
  var result=await controller.Exchange(new(code,correctProof?verifier:"wrong"));
  if(correctProof) Assert.IsType<OkObjectResult>(result);else Assert.IsType<UnauthorizedResult>(result);
  Assert.IsType<UnauthorizedResult>(await controller.Exchange(new(code,verifier)));
 }
}
