using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Domain.Security;

public static class UserAuthorization
{
    public static string[] Roles(User user) => user.RoleAssignments
        .Where(x => x.RevokedAt == null && Enum.IsDefined(typeof(Domain.Enums.UserRole), x.RoleId))
        .Select(x => RoleNameNormalizer.FromRoleId(x.RoleId)).Distinct().Order().ToArray();

    public static bool HasValidPrimaryRole(User user) =>
        Enum.IsDefined(typeof(Domain.Enums.UserRole), user.PrimaryRoleId) &&
        user.RoleAssignments.Any(x => x.RoleId == user.PrimaryRoleId && x.RevokedAt == null);
}
