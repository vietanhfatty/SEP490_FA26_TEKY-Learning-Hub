using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Domain.Security;

public static class UserAuthorization
{
    public static string[] Roles(User user) => user.RoleAssignments
        .Where(x => Effective(user, x) && Enum.IsDefined(typeof(Domain.Enums.UserRole), x.RoleId))
        .Select(x => RoleNameNormalizer.FromRoleId(x.RoleId)).Distinct().Order().ToArray();

    public static bool HasValidPrimaryRole(User user) =>
        Enum.IsDefined(typeof(Domain.Enums.UserRole), user.PrimaryRoleId) &&
        user.RoleAssignments.Any(x => x.RoleId == user.PrimaryRoleId && Effective(user, x));

    public static bool Effective(User user, UserRoleAssignment grant) => grant.RevokedAt == null &&
        (!user.StaffAccessManaged || grant.RoleId is 1 or 3 or 4 || grant.Sources.Any(source => source.EndedAt == null &&
            (source.Kind == "EXCEPTION" || source.Kind == "APPOINTMENT" && source.Appointment is { ValidTo: null } && source.Appointment.PolicyId == source.PolicyId)));
}
