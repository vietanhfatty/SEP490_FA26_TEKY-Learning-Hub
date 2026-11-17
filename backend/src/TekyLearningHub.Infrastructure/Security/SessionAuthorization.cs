using System.Security.Claims;
using TekyLearningHub.Application.Interfaces.Auth;
using TekyLearningHub.Application.Services.Auth;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Infrastructure.Security;

public static class SessionAuthorization
{
    public static bool MatchesCurrentUser(ClaimsPrincipal? principal, User? user) =>
     TryRead(principal, out var identity) && SessionValidationService.Matches(identity!, user);
    public static bool TryRead(ClaimsPrincipal? principal, out SessionIdentity? identity)
    {
        identity = null;
        if (principal is null || !int.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)
         || !int.TryParse(principal.FindFirstValue("security_version"), out var version)
         || !byte.TryParse(principal.FindFirstValue("role_id"), out var roleId)) return false;
        identity = new(userId, version, roleId, principal.FindAll(ClaimTypes.Role).Select(x => x.Value).ToArray()); return true;
    }
}
