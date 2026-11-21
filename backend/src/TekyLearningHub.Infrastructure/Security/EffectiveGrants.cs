using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Infrastructure.Security;

public static class EffectiveGrants
{
    public static IQueryable<UserRoleAssignment> WithEffectiveSources(this IQueryable<UserRoleAssignment> grants) => grants.Where(grant =>
        grant.RevokedAt == null && (!grant.User.StaffAccessManaged || grant.RoleId == 1 || grant.RoleId == 3 || grant.RoleId == 4 ||
            grant.Sources.Any(source => source.EndedAt == null && (source.Kind == "EXCEPTION" ||
                source.Kind == "APPOINTMENT" && source.Appointment != null && source.Appointment.ValidTo == null && source.Appointment.PolicyId == source.PolicyId))));
}
