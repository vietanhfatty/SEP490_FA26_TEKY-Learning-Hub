using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.Interfaces.Auth;

public interface IAuthRepository
{
    Task<User?> FindByIdentifier(string identifier);
    Task<User?> FindUser(int id);
    Task<UserSession?> FindSession(string hash);
    Task<List<UserSession>> ActiveSessions(int id);
    void AddSession(UserSession session);
    void AddAudit(AuditLog audit);
}
