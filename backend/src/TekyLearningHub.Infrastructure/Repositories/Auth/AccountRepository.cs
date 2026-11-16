using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.Interfaces.Auth;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Infrastructure.Data;

namespace TekyLearningHub.Infrastructure.Repositories.Auth;

public sealed class AccountRepository(ApplicationDbContext db) : IAccountRepository
{
    public Task<User?> FindEmail(string email) => db.Users.SingleOrDefaultAsync(x => x.Email.ToLower() == email);
    public Task<User> FindUser(int id) => db.Users.SingleAsync(x => x.UserId == id);
    public Task<List<UserSession>> ActiveSessions(int id) => db.UserSessions.Where(x => x.UserId == id && x.IsActive).ToListAsync();
    public Task<List<PasswordResetOtp>> UnusedOtps(int id) => db.PasswordResetOtps.Where(x => x.UserId == id && x.UsedAt == null).ToListAsync();
    public Task<bool> RecentOtp(int id, DateTime since) => db.PasswordResetOtps.AnyAsync(x => x.UserId == id && x.CreatedAt > since);
    public Task<PasswordResetOtp?> LatestOtp(int id) => db.PasswordResetOtps.Where(x => x.UserId == id && x.UsedAt == null).OrderByDescending(x => x.OtpId).FirstOrDefaultAsync();
    public Task<bool> PhoneExists(int id, string phone) => db.Users.AnyAsync(x => x.UserId != id && x.Phone == phone);
    public void AddOtp(PasswordResetOtp otp) => db.PasswordResetOtps.Add(otp);
    public void AddAudit(AuditLog audit) => db.AuditLogs.Add(audit);
}
