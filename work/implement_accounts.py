from pathlib import Path
root=Path('.')
def write(p,s):
 p=root/p;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s,encoding='utf-8')
def edit(p,a,b):
 p=root/p;s=p.read_text(encoding='utf-8-sig');assert a in s,p;p.write_text(s.replace(a,b),encoding='utf-8')
b='backend/src/'
u=b+'TekyLearningHub.Domain/Entities/User.cs'
edit(u,'    public int FailedLoginCount { get; set; }','    public int FailedLoginCount { get; set; }\n    public DateTime? LockoutEndAt { get; set; }\n    public int SecurityVersion { get; set; }\n    public string? Bio { get; set; }')
write(b+'TekyLearningHub.Application/DTOs/Auth/AccountRequests.cs','''using System.ComponentModel.DataAnnotations;
namespace TekyLearningHub.Application.DTOs.Auth;
public class ForgotPasswordRequest { [Required, EmailAddress] public string Email { get; set; } = ""; }
public class ResetPasswordRequest : ForgotPasswordRequest {
 [Required, RegularExpression(@"^\\d{6}$")] public string Otp { get; set; } = "";
 [Required, MinLength(12)] public string NewPassword { get; set; } = "";
 [Required, Compare(nameof(NewPassword))] public string ConfirmPassword { get; set; } = "";
}
public class ChangePasswordRequest {
 [Required] public string CurrentPassword { get; set; } = "";
 [Required, MinLength(12)] public string NewPassword { get; set; } = "";
 [Required, Compare(nameof(NewPassword))] public string ConfirmPassword { get; set; } = "";
}
public class UpdateProfileRequest {
 [Required, StringLength(120, MinimumLength=1)] public string FullName { get; set; } = "";
 [StringLength(20), Phone] public string? Phone { get; set; }
 [StringLength(1000)] public string? Bio { get; set; }
}
''')
edit(b+'TekyLearningHub.Application/DTOs/Auth/UserDto.cs','    public string? Phone { get; set; }','    public string? Phone { get; set; }\n    public string? Bio { get; set; }')
edit(b+'TekyLearningHub.Infrastructure/Services/AuthService.cs','            Phone = user.Phone,','            Phone = user.Phone,\n            Bio = user.Bio,')
# Durable email queue, protected body (OTP is never stored in cleartext).
write(b+'TekyLearningHub.Domain/Entities/AccountEmail.cs','''namespace TekyLearningHub.Domain.Entities;
public class AccountEmail {
 public long Id { get; set; }
 public string Recipient { get; set; } = "";
 public string Subject { get; set; } = "";
 public string ProtectedBody { get; set; } = "";
 public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
 public DateTime? SentAt { get; set; }
 public int Attempts { get; set; }
 public DateTime NextAttemptAt { get; set; } = DateTime.UtcNow;
}
''')
edit(b+'TekyLearningHub.Infrastructure/Data/ApplicationDbContext.cs','    public ApplicationDbContext(','''    public DbSet<AccountEmail> AccountEmails => Set<AccountEmail>();
    protected override void OnModelCreating(ModelBuilder modelBuilder) {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<User>().Property(x => x.Bio).HasMaxLength(1000);
        modelBuilder.Entity<User>().Property(x => x.SecurityVersion).IsConcurrencyToken();
        modelBuilder.Entity<User>().Property(x => x.FailedLoginCount).IsConcurrencyToken();
        modelBuilder.Entity<PasswordResetOtp>().Property(x => x.UsedAt).IsConcurrencyToken();
        modelBuilder.Entity<PasswordResetOtp>().Property(x => x.Attempts).IsConcurrencyToken();
        modelBuilder.Entity<AccountEmail>().HasKey(x => x.Id);
    }
    public ApplicationDbContext(''')
edit(b+'TekyLearningHub.Application/Interfaces/IApplicationDbContext.cs','    DbSet<User> Users { get; }','    DbSet<User> Users { get; }\n    DbSet<AccountEmail> AccountEmails { get; }')
# interface default keeps existing test fakes compatible
edit(b+'TekyLearningHub.Application/Interfaces/IApplicationDbContext.cs','    DbSet<AccountEmail> AccountEmails { get; }','    DbSet<AccountEmail> AccountEmails => throw new NotSupportedException();')
write(b+'TekyLearningHub.Infrastructure/Services/AccountEmailWorker.cs','''using System.Net;
using System.Net.Mail;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Infrastructure.Data;
using TekyLearningHub.Domain.Entities;
namespace TekyLearningHub.Infrastructure.Services;
public class AccountEmailWorker(IServiceScopeFactory scopes, IConfiguration config, ILogger<AccountEmailWorker> logger) : BackgroundService {
 public static void Enqueue(ApplicationDbContext db, IDataProtectionProvider protection, string email, string subject, string body) => db.AccountEmails.Add(new AccountEmail {Recipient=email,Subject=subject,ProtectedBody=protection.CreateProtector("AccountEmail.v1").Protect(body)});
 protected override async Task ExecuteAsync(CancellationToken stop) {
  while (!stop.IsCancellationRequested) {
   try {
    if (!string.IsNullOrWhiteSpace(config["Smtp:Host"])) {
     using var scope=scopes.CreateScope(); var db=scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
     var protection=scope.ServiceProvider.GetRequiredService<IDataProtectionProvider>();
     var messages=await db.AccountEmails.Where(x=>x.SentAt==null && x.NextAttemptAt<=DateTime.UtcNow).OrderBy(x=>x.Id).Take(10).ToListAsync(stop);
     foreach(var item in messages) {
      try {
       using var client=new SmtpClient(config["Smtp:Host"],config.GetValue("Smtp:Port",587)) {EnableSsl=config.GetValue("Smtp:EnableSsl",true),Credentials=new NetworkCredential(config["Smtp:Username"],config["Smtp:Password"])};
       using var mail=new MailMessage(config["Smtp:From"]!,item.Recipient,item.Subject,protection.CreateProtector("AccountEmail.v1").Unprotect(item.ProtectedBody));
       await client.SendMailAsync(mail,stop); item.SentAt=DateTime.UtcNow; item.ProtectedBody="";
      } catch(Exception) when(!stop.IsCancellationRequested) {item.Attempts++;item.NextAttemptAt=DateTime.UtcNow.AddMinutes(Math.Min(60,item.Attempts*2));}
      await db.SaveChangesAsync(stop);
     }
    }
   } catch(Exception) when(!stop.IsCancellationRequested) {logger.LogWarning("Account email queue is unavailable; retrying.");}
   await Task.Delay(TimeSpan.FromSeconds(15),stop);
  }
 }
}
''')
write(b+'TekyLearningHub.Api/Controllers/AccountController.cs','''using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.DTOs.Auth;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Infrastructure.Data;
using TekyLearningHub.Infrastructure.Services;
using TekyLearningHub.Domain.Entities;
namespace TekyLearningHub.Api.Controllers;
[ApiController, Route("api"), EnableRateLimiting("account")]
public class AccountController(ApplicationDbContext db, IPasswordHasher hasher, IDataProtectionProvider protection) : ControllerBase {
 int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
 static bool PasswordValid(string value) => value.Length>=12 && Encoding.UTF8.GetByteCount(value)<=72;
 object Message(string message) => new {success=true,message};
 void Mail(User user,string subject,string body) => AccountEmailWorker.Enqueue(db,protection,user.Email,subject,body);
 async Task Revoke(User user) {
  user.SecurityVersion++; user.MustChangePwd=false; user.FailedLoginCount=0; user.LockoutEndAt=null;
  foreach(var session in await db.UserSessions.Where(x=>x.UserId==user.UserId && x.IsActive).ToListAsync()) {session.IsActive=false;session.LogoutAt=DateTime.UtcNow;}
  foreach(var otp in await db.PasswordResetOtps.Where(x=>x.UserId==user.UserId && x.UsedAt==null).ToListAsync()) otp.UsedAt=DateTime.UtcNow;
  db.AuditLogs.Add(new AuditLog {ActorUserId=user.UserId,ActorType="User",Action="PASSWORD_UPDATED",CreatedAt=DateTime.UtcNow});
 }
 [HttpPost("auth/forgot-password")]
 public async Task<IActionResult> Forgot(ForgotPasswordRequest request) {
  var email=request.Email.Trim().ToLowerInvariant(); var now=DateTime.UtcNow;
  var user=await db.Users.SingleOrDefaultAsync(x=>x.Email.ToLower()==email);
  var response=Message("Nếu email hợp lệ, mã khôi phục sẽ được gửi. Vui lòng kiểm tra hộp thư.");
  if(user==null || user.Status!="Active") return Ok(response);
  if(await db.PasswordResetOtps.AnyAsync(x=>x.UserId==user.UserId && x.CreatedAt>now.AddSeconds(-60))) return Ok(response);
  foreach(var old in await db.PasswordResetOtps.Where(x=>x.UserId==user.UserId && x.UsedAt==null).ToListAsync()) old.UsedAt=now;
  var code=RandomNumberGenerator.GetInt32(100000,1000000).ToString();
  db.PasswordResetOtps.Add(new PasswordResetOtp {UserId=user.UserId,OtpHash=hasher.HashPassword(code),CreatedAt=now,ExpiresAt=now.AddMinutes(5)});
  Mail(user,"TEKY - Mã khôi phục mật khẩu",$"Mã của bạn: {code}. Có hiệu lực 5 phút. Không chia sẻ mã này.");
  await db.SaveChangesAsync(); return Ok(response);
 }
 [HttpPost("auth/reset-password")]
 public async Task<IActionResult> Reset(ResetPasswordRequest request) {
  if(!PasswordValid(request.NewPassword)) return BadRequest(new {message="Mật khẩu cần ít nhất 12 ký tự và tối đa 72 byte UTF-8."});
  var user=await db.Users.SingleOrDefaultAsync(x=>x.Email.ToLower()==request.Email.Trim().ToLower());
  var otp=user==null ? null : await db.PasswordResetOtps.Where(x=>x.UserId==user.UserId && x.UsedAt==null).OrderByDescending(x=>x.OtpId).FirstOrDefaultAsync();
  if(user==null || user.Status!="Active" || otp==null || otp.ExpiresAt<=DateTime.UtcNow || otp.Attempts>=5) return BadRequest(new {message="Mã không hợp lệ hoặc đã hết hạn."});
  otp.Attempts++;
  if(!hasher.VerifyPassword(request.Otp,otp.OtpHash)) {await db.SaveChangesAsync();return BadRequest(new {message="Mã không hợp lệ hoặc đã hết hạn."});}
  user.PasswordHash=hasher.HashPassword(request.NewPassword); await Revoke(user);
  Mail(user,"TEKY - Mật khẩu đã thay đổi","Mật khẩu đã được khôi phục. Nếu bạn không thực hiện, hãy liên hệ quản trị viên.");
  await db.SaveChangesAsync();return Ok(Message("Đã đặt lại mật khẩu. Vui lòng đăng nhập lại."));
 }
 [Authorize, HttpPost("auth/change-password")]
 public async Task<IActionResult> Change(ChangePasswordRequest request) {
  var user=await db.Users.SingleAsync(x=>x.UserId==UserId);
  if(!hasher.VerifyPassword(request.CurrentPassword,user.PasswordHash)) return BadRequest(new {message="Mật khẩu hiện tại không đúng."});
  if(!PasswordValid(request.NewPassword) || hasher.VerifyPassword(request.NewPassword,user.PasswordHash)) return BadRequest(new {message="Mật khẩu mới cần khác mật khẩu cũ, ít nhất 12 ký tự và tối đa 72 byte UTF-8."});
  user.PasswordHash=hasher.HashPassword(request.NewPassword);await Revoke(user);
  Mail(user,"TEKY - Mật khẩu đã thay đổi","Bạn đã đổi mật khẩu. Các phiên cũ đã kết thúc.");
  await db.SaveChangesAsync();return Ok(Message("Đã đổi mật khẩu. Vui lòng đăng nhập lại."));
 }
 [Authorize, HttpPatch("users/me")]
 public async Task<IActionResult> Profile(UpdateProfileRequest request) {
  if(string.IsNullOrWhiteSpace(request.FullName)) return BadRequest(new {message="Họ tên không được để trống."});
  var user=await db.Users.SingleAsync(x=>x.UserId==UserId);
  var phone=string.IsNullOrWhiteSpace(request.Phone)?null:request.Phone.Trim();
  if(phone!=null && await db.Users.AnyAsync(x=>x.UserId!=UserId && x.Phone==phone)) return Conflict(new {message="Số điện thoại đã được sử dụng."});
  user.FullName=request.FullName.Trim();user.Phone=phone;user.Bio=request.Bio?.Trim();user.UpdatedAt=DateTime.UtcNow;
  await db.SaveChangesAsync();return Ok(Message("Đã cập nhật hồ sơ."));
 }
}
''')
# API framework for protection and hosted service
p=b+'TekyLearningHub.Infrastructure/TekyLearningHub.Infrastructure.csproj'
edit(p,'  <PropertyGroup>','  <ItemGroup><FrameworkReference Include="Microsoft.AspNetCore.App" /></ItemGroup>\n  <PropertyGroup>')
p=b+'TekyLearningHub.Infrastructure/DependencyInjection.cs'
edit(p,'        services.AddScoped<IAuthService, AuthService>();','        services.AddScoped<IAuthService, AuthService>();\n        services.AddDataProtection();\n        services.AddHostedService<AccountEmailWorker>();')
# modify login without replacing existing logout
p=b+'TekyLearningHub.Infrastructure/Services/AuthService.cs'
edit(p,'        var isPasswordValid =', '''        if (user.LockoutEndAt > DateTime.UtcNow)
            return ApiResponse<AuthResponseDto>.FailureResult("Tài khoản hoặc mật khẩu không chính xác, hoặc tài khoản đang tạm khóa.");
        if (user.LockoutEndAt != null) {user.LockoutEndAt=null;user.FailedLoginCount=0;}
        var isPasswordValid =''')
edit(p,'if (user.FailedLoginCount >= 5)','if (user.FailedLoginCount > 5)')
edit(p,'                user.Status = "Locked";','''                user.LockoutEndAt = DateTime.UtcNow.AddMinutes(15);
                if (_context is TekyLearningHub.Infrastructure.Data.ApplicationDbContext db) {
                    // Queue delivery independently of SMTP availability.
                    var provider = Microsoft.AspNetCore.DataProtection.DataProtectionProvider.Create("TekyLearningHub");
                    AccountEmailWorker.Enqueue(db, provider, user.Email, "TEKY - Cảnh báo đăng nhập", "Tài khoản tạm khóa trong 15 phút do nhập sai mật khẩu quá 5 lần.");
                }''')
# same provider DI required use constructor optional
edit(p,'    private readonly IApplicationDbContext _context;','    private readonly IApplicationDbContext _context;\n    private readonly Microsoft.AspNetCore.DataProtection.IDataProtectionProvider? _protection;')
edit(p,'        IJwtTokenGenerator jwtTokenGenerator)','        IJwtTokenGenerator jwtTokenGenerator, Microsoft.AspNetCore.DataProtection.IDataProtectionProvider? protection = null)')
edit(p,'        _context = context;','        _context = context;\n        _protection = protection;')
edit(p,'var provider = Microsoft.AspNetCore.DataProtection.DataProtectionProvider.Create("TekyLearningHub");','var provider = _protection ?? throw new InvalidOperationException("Data protection is required for email.");')
p=b+'TekyLearningHub.Infrastructure/Security/JwtTokenGenerator.cs'
edit(p,'            new("role_id", user.RoleId.ToString()),','            new("security_version", user.SecurityVersion.ToString()),\n            new("role_id", user.RoleId.ToString()),')
p=b+'TekyLearningHub.Api/Program.cs'
edit(p,'builder.Services.AddAuthorization();','''builder.Services.AddAuthorization();
builder.Services.AddRateLimiter(options => {
 options.RejectionStatusCode=429;
 options.AddPolicy("account", context => System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
 context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions {PermitLimit=10,Window=TimeSpan.FromMinutes(1),QueueLimit=0}));
});''')
edit(p,'    options.SaveToken = true;','''    options.SaveToken = true;
    options.Events = new JwtBearerEvents { OnTokenValidated = async context => {
        var id=context.Principal?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var version=context.Principal?.FindFirst("security_version")?.Value;
        var db=context.HttpContext.RequestServices.GetRequiredService<ApplicationDbContext>();
        if(!int.TryParse(id,out var userId) || !int.TryParse(version,out var tokenVersion)) {context.Fail("Invalid session");return;}
        var user=await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.SingleOrDefaultAsync(db.Users, x=>x.UserId==userId);
        if(user==null || user.Status!="Active" || user.SecurityVersion!=tokenVersion) context.Fail("Session revoked");
    }};''')
edit(p,'app.UseAuthentication();','app.UseRateLimiter();\napp.UseAuthentication();')
edit(p,'using System.Text;','using System.Text;\nusing Microsoft.AspNetCore.RateLimiting;')
write('database/migrations/20261113_account_security.sql','''SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF COL_LENGTH('Users','LockoutEndAt') IS NULL ALTER TABLE Users ADD LockoutEndAt datetime2 NULL;
IF COL_LENGTH('Users','SecurityVersion') IS NULL ALTER TABLE Users ADD SecurityVersion int NOT NULL CONSTRAINT DF_Users_SecurityVersion DEFAULT 0;
IF COL_LENGTH('Users','Bio') IS NULL ALTER TABLE Users ADD Bio nvarchar(1000) NULL;
IF OBJECT_ID('AccountEmails') IS NULL CREATE TABLE AccountEmails (
 Id bigint IDENTITY PRIMARY KEY, Recipient nvarchar(max) NOT NULL, Subject nvarchar(max) NOT NULL,
 ProtectedBody nvarchar(max) NOT NULL, CreatedAt datetime2 NOT NULL, SentAt datetime2 NULL,
 Attempts int NOT NULL, NextAttemptAt datetime2 NOT NULL);
COMMIT;
-- Existing administrative Locked statuses are intentionally not changed.
''')
