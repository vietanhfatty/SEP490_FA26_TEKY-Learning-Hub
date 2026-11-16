using TekyLearningHub.Application.Interfaces.Auth;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Domain.Security;

namespace TekyLearningHub.Application.Services.Auth;

public sealed class SessionValidationService(IAuthRepository repository) : ISessionValidationService
{
    public async Task<bool> IsValid(SessionIdentity identity) => Matches(identity, await repository.FindUser(identity.UserId));
    public static bool Matches(SessionIdentity identity, User? user) => user is not null && user.Status == "Active" && UserAuthorization.HasValidPrimaryRole(user)
     && user.UserId == identity.UserId && user.SecurityVersion == identity.SecurityVersion && user.PrimaryRoleId == identity.PrimaryRoleId
     && identity.Roles.Length == identity.Roles.Distinct().Count() && identity.Roles.Order().SequenceEqual(UserAuthorization.Roles(user));
}
