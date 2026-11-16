
namespace TekyLearningHub.Application.Interfaces.Auth;

public record SessionIdentity(int UserId, int SecurityVersion, byte PrimaryRoleId, string[] Roles);
public interface ISessionValidationService { Task<bool> IsValid(SessionIdentity identity); }
