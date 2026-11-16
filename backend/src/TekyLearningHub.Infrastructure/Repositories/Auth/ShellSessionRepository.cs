using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.Interfaces.Auth;
using TekyLearningHub.Infrastructure.Data;

namespace TekyLearningHub.Infrastructure.Repositories.Auth;

public sealed class ShellSessionRepository(ApplicationDbContext db) : IShellSessionRepository
{
    public Task<bool> ActiveSession(int id, string hash, DateTime since) => db.UserSessions.AnyAsync(x => x.UserId == id && x.TokenHash == hash && x.IsActive && x.LoginAt > since);
}
