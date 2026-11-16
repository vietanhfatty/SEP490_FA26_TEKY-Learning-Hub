using TekyLearningHub.Application.DTOs.Auth;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.Interfaces.Auth;

public record AccountResult(string Message, int Status = 200);
public interface IAccountService
{
    Task<AccountResult> Forgot(ForgotPasswordRequest request);
    Task<AccountResult> Reset(ResetPasswordRequest request);
    Task<AccountResult> Change(int userId, ChangePasswordRequest request);
    Task<AccountResult> Profile(int userId, UpdateProfileRequest request);
    Task<AccountResult> Avatar(int userId, byte[] bytes);
    Task<byte[]?> GetAvatar(int userId);
}
public interface IAccountRepository
{
    Task<User?> FindEmail(string email); Task<User> FindUser(int id);
    Task<List<UserSession>> ActiveSessions(int id); Task<List<PasswordResetOtp>> UnusedOtps(int id);
    Task<bool> RecentOtp(int id, DateTime since); Task<PasswordResetOtp?> LatestOtp(int id);
    Task<bool> PhoneExists(int id, string phone);
    void AddOtp(PasswordResetOtp otp); void AddAudit(AuditLog audit);
}
public interface IAvatarStorage
{
    Task<string> Save(int userId, byte[] content); void Delete(string? reference); Task<byte[]?> Read(string reference);
}
