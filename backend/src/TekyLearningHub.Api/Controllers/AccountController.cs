using System.Security.Claims;
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
  db.AuditLogs.Add(new AuditLog {ActorUserId=user.UserId,ActorType=TekyLearningHub.Domain.Constants.AuditActorTypes.User,Action="PASSWORD_UPDATED",CreatedAt=DateTime.UtcNow});
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
 [Authorize, HttpPost("users/me/avatar"), RequestSizeLimit(2200000)]
 public async Task<IActionResult> Avatar(IFormFile avatar) {
  if(avatar.Length<33 || avatar.Length>2*1024*1024) return BadRequest(new {message="Ảnh PNG phải nhỏ hơn 2 MB."});
  using var memory=new MemoryStream(); await avatar.CopyToAsync(memory);var bytes=memory.ToArray();
  byte[] signature=[137,80,78,71,13,10,26,10];
  if(!bytes.AsSpan(0,8).SequenceEqual(signature) || Encoding.ASCII.GetString(bytes,12,4)!="IHDR") return BadRequest(new {message="Chỉ chấp nhận ảnh PNG hợp lệ."});
  var width=System.Buffers.Binary.BinaryPrimitives.ReadUInt32BigEndian(bytes.AsSpan(16,4));
  var height=System.Buffers.Binary.BinaryPrimitives.ReadUInt32BigEndian(bytes.AsSpan(20,4));
  if(width==0 || height==0 || width>2048 || height>2048) return BadRequest(new {message="Kích thước ảnh tối đa 2048 × 2048."});
  var directory=Path.Combine(AppContext.BaseDirectory,"AccountAvatars"); Directory.CreateDirectory(directory);
  var name=$"{UserId}-{Guid.NewGuid():N}.png";var path=Path.Combine(directory,name);
  await System.IO.File.WriteAllBytesAsync(path,bytes);
  try {
   var user=await db.Users.SingleAsync(x=>x.UserId==UserId);var old=user.AvatarUrl;
   user.AvatarUrl=$"/api/users/me/avatar?version={name}";await db.SaveChangesAsync();
   if(old!=null && old.StartsWith("/api/users/me/avatar?version=")) {var oldName=old.Split('=').Last();if(Path.GetFileName(oldName)==oldName) System.IO.File.Delete(Path.Combine(directory,oldName));}
   return Ok(Message("Đã cập nhật ảnh đại diện."));
  } catch {System.IO.File.Delete(path);throw;}
 }
 [Authorize, HttpGet("users/me/avatar")]
 public async Task<IActionResult> GetAvatar() {
  var user=await db.Users.SingleAsync(x=>x.UserId==UserId);
  if(user.AvatarUrl==null || !user.AvatarUrl.StartsWith("/api/users/me/avatar?version=")) return NotFound();
  var name=user.AvatarUrl.Split('=').Last();if(Path.GetFileName(name)!=name) return NotFound();
  var path=Path.Combine(AppContext.BaseDirectory,"AccountAvatars",name);
  Response.Headers.CacheControl="private, no-store";Response.Headers["X-Content-Type-Options"]="nosniff";
  return System.IO.File.Exists(path)?PhysicalFile(path,"image/png"):NotFound();
 }
}
