using System.Security.Cryptography;
using System.Text;
using TekyLearningHub.Application.DTOs.Auth;
using TekyLearningHub.Application.Interfaces.Auth;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.Services.Auth;

public sealed class AccountService(IAccountRepository db, IUnitOfWork unit, IPasswordHasher hasher, IAccountEmailOutbox email, IAvatarStorage storage) : IAccountService
{
    static bool PasswordValid(string value) => value.Length >= 12 && Encoding.UTF8.GetByteCount(value) <= 72;
    AccountResult Message(string message) => new(message);
    void Mail(User user, string subject, string body) => email.Enqueue(user.Email, subject, body);
    async Task Revoke(User user)
    {
        user.SecurityVersion++; user.MustChangePwd = false; user.FailedLoginCount = 0; user.LockoutEndAt = null;
        foreach (var session in await db.ActiveSessions(user.UserId)) { session.IsActive = false; session.LogoutAt = DateTime.UtcNow; }
        foreach (var otp in await db.UnusedOtps(user.UserId)) otp.UsedAt = DateTime.UtcNow;
        db.AddAudit(new AuditLog { ActorUserId = user.UserId, ActorType = TekyLearningHub.Domain.Constants.AuditActorTypes.User, Action = "PASSWORD_UPDATED", CreatedAt = DateTime.UtcNow });
    }
    public async Task<AccountResult> Forgot(ForgotPasswordRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant(); var now = DateTime.UtcNow;
        var user = await db.FindEmail(email);
        var response = Message("Nếu email hợp lệ, mã khôi phục sẽ được gửi. Vui lòng kiểm tra hộp thư.");
        if (user == null || user.Status != "Active") return response;
        if (await db.RecentOtp(user.UserId, now.AddSeconds(-60))) return response;
        foreach (var old in await db.UnusedOtps(user.UserId)) old.UsedAt = now;
        var code = RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
        db.AddOtp(new PasswordResetOtp { UserId = user.UserId, OtpHash = hasher.HashPassword(code), CreatedAt = now, ExpiresAt = now.AddMinutes(5) });
        Mail(user, "TEKY - Mã khôi phục mật khẩu", $"Mã của bạn: {code}. Có hiệu lực 5 phút. Không chia sẻ mã này.");
        await unit.SaveChangesAsync(); return response;
    }
    public async Task<AccountResult> Reset(ResetPasswordRequest request)
    {
        if (!PasswordValid(request.NewPassword)) return new AccountResult("Mật khẩu cần ít nhất 12 ký tự và tối đa 72 byte UTF-8.", 400);
        var user = await db.FindEmail(request.Email.Trim().ToLower());
        var otp = user == null ? null : await db.LatestOtp(user.UserId);
        if (user == null || user.Status != "Active" || otp == null || otp.ExpiresAt <= DateTime.UtcNow || otp.Attempts >= 5) return new AccountResult("Mã không hợp lệ hoặc đã hết hạn.", 400);
        otp.Attempts++;
        if (!hasher.VerifyPassword(request.Otp, otp.OtpHash)) { await unit.SaveChangesAsync(); return new AccountResult("Mã không hợp lệ hoặc đã hết hạn.", 400); }
        user.PasswordHash = hasher.HashPassword(request.NewPassword); await Revoke(user);
        Mail(user, "TEKY - Mật khẩu đã thay đổi", "Mật khẩu đã được khôi phục. Nếu bạn không thực hiện, hãy liên hệ quản trị viên.");
        await unit.SaveChangesAsync(); return Message("Đã đặt lại mật khẩu. Vui lòng đăng nhập lại.");
    }
    public async Task<AccountResult> Change(int userId, ChangePasswordRequest request)
    {
        var user = await db.FindUser(userId);
        if (!hasher.VerifyPassword(request.CurrentPassword, user.PasswordHash)) return new AccountResult("Mật khẩu hiện tại không đúng.", 400);
        if (!PasswordValid(request.NewPassword) || hasher.VerifyPassword(request.NewPassword, user.PasswordHash)) return new AccountResult("Mật khẩu mới cần khác mật khẩu cũ, ít nhất 12 ký tự và tối đa 72 byte UTF-8.", 400);
        user.PasswordHash = hasher.HashPassword(request.NewPassword); await Revoke(user);
        Mail(user, "TEKY - Mật khẩu đã thay đổi", "Bạn đã đổi mật khẩu. Các phiên cũ đã kết thúc.");
        await unit.SaveChangesAsync(); return Message("Đã đổi mật khẩu. Vui lòng đăng nhập lại.");
    }
    public async Task<AccountResult> Profile(int userId, UpdateProfileRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName)) return new AccountResult("Họ tên không được để trống.", 400);
        var user = await db.FindUser(userId);
        var phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        if (phone != null && await db.PhoneExists(userId, phone)) return new AccountResult("Số điện thoại đã được sử dụng.", 409);
        user.FullName = request.FullName.Trim(); user.Phone = phone; user.Bio = request.Bio?.Trim(); user.UpdatedAt = DateTime.UtcNow;
        await unit.SaveChangesAsync(); return Message("Đã cập nhật hồ sơ.");
    }

    public async Task<AccountResult> Avatar(int userId, byte[] bytes)
    {
        if (bytes.Length < 33 || bytes.Length > 2 * 1024 * 1024) return new("Ảnh PNG phải nhỏ hơn 2 MB.", 400);
        byte[] signature = [137, 80, 78, 71, 13, 10, 26, 10];
        if (!bytes.AsSpan(0, 8).SequenceEqual(signature) || Encoding.ASCII.GetString(bytes, 12, 4) != "IHDR") return new("Chỉ chấp nhận ảnh PNG hợp lệ.", 400);
        var width = System.Buffers.Binary.BinaryPrimitives.ReadUInt32BigEndian(bytes.AsSpan(16, 4));
        var height = System.Buffers.Binary.BinaryPrimitives.ReadUInt32BigEndian(bytes.AsSpan(20, 4));
        if (width == 0 || height == 0 || width > 2048 || height > 2048) return new("Kích thước ảnh tối đa 2048 × 2048.", 400);
        var reference = await storage.Save(userId, bytes);
        try
        {
            var user = await db.FindUser(userId); var previous = user.AvatarUrl;
            user.AvatarUrl = reference; await unit.SaveChangesAsync(); storage.Delete(previous);
            return new("Đã cập nhật ảnh đại diện.");
        }
        catch { storage.Delete(reference); throw; }
    }
    public async Task<byte[]?> GetAvatar(int userId)
    {
        var user = await db.FindUser(userId); return user.AvatarUrl is null ? null : await storage.Read(user.AvatarUrl);
    }
}
