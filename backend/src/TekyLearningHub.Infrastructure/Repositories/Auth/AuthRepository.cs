using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.Interfaces.Auth;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Infrastructure.Data;

namespace TekyLearningHub.Infrastructure.Repositories.Auth;

public sealed class AuthRepository(ApplicationDbContext db) : IAuthRepository
{
    public Task<User?> FindByIdentifier(string identifier) => db.Users.Include(u => u.PrimaryRole).Include(u => u.RoleAssignments).FirstOrDefaultAsync(u => identifier.Contains("@") ? u.Email.ToLower() == identifier.ToLower() : u.Email.ToLower().StartsWith(identifier.ToLower() + "@") || u.Email.ToLower() == identifier.ToLower() || u.Phone == identifier);
    public Task<User?> FindUser(int id) => db.Users.Include(u => u.PrimaryRole).Include(u => u.RoleAssignments).FirstOrDefaultAsync(u => u.UserId == id);
    public Task<UserSession?> FindSession(string hash) => db.UserSessions.Include(s => s.User).ThenInclude(u => u.PrimaryRole).Include(s => s.User.RoleAssignments).FirstOrDefaultAsync(s => s.TokenHash == hash && s.IsActive);
    public Task<List<UserSession>> ActiveSessions(int id) => db.UserSessions.Where(s => s.UserId == id && s.IsActive).ToListAsync();
    public void AddSession(UserSession session) => db.UserSessions.Add(session);
    public void AddAudit(AuditLog audit) => db.AuditLogs.Add(audit);
}
