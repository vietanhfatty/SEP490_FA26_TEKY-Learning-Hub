using System.Security.Claims;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Domain.Enums;

namespace TekyLearningHub.Infrastructure.Security;

/// <summary>Rejects tokens whose authorization no longer matches the live account.</summary>
public static class SessionAuthorization
{
    public static bool MatchesCurrentUser(ClaimsPrincipal? principal, User? user)
    {
        if (principal is null || user is null || user.Status != "Active" ||
            !Enum.IsDefined(typeof(UserRole), user.RoleId)) return false;

        var roles = principal.FindAll(ClaimTypes.Role).ToArray();
        return int.TryParse(principal.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId) && userId == user.UserId &&
            int.TryParse(principal.FindFirst("security_version")?.Value, out var version) && version == user.SecurityVersion &&
            byte.TryParse(principal.FindFirst("role_id")?.Value, out var roleId) && roleId == user.RoleId &&
            roles.Length == 1 && roles[0].Value == RoleNameNormalizer.FromRoleId(user.RoleId);
    }
}
