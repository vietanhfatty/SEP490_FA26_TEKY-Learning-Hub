using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.DTOs.Auth;
using TekyLearningHub.Application.Interfaces.Auth;
using TekyLearningHub.Domain.Security;
using TekyLearningHub.Infrastructure.Data;

namespace TekyLearningHub.Infrastructure.Security;

public sealed class AccountAccessReader(ApplicationDbContext db) : IAccountAccessReader
{
    public async Task<AccountAccessDto> Read(int userId, CancellationToken ct = default, bool includeInactive = false)
    {
        var grants = await db.UserRoles.AsNoTracking().WithEffectiveSources()
            .Where(grant => grant.UserId == userId && grant.RevokedAt == null &&
                (includeInactive || grant.User.Status == "Active" && !grant.User.ActivationPending))
            .OrderBy(grant => grant.RoleId).ThenBy(grant => grant.UserRoleId)
            .Select(grant => new { grant.UserRoleId, grant.RoleId, grant.ScopeType, grant.DepartmentId })
            .ToArrayAsync(ct);
        var roleIds = grants.Select(grant => grant.RoleId).Distinct().ToArray();
        var grantIds = grants.Select(grant => grant.UserRoleId).ToArray();
        var sources = await db.UserRoleGrantSources.AsNoTracking().Where(source => grantIds.Contains(source.UserRoleId) && source.EndedAt == null)
            .Select(source => new { source.UserRoleId, source.Kind, Position = source.Appointment != null ? source.Appointment.Position.Name : null,
                Department = source.Appointment != null ? source.Appointment.Position.Department.Name : null, source.Reason }).ToArrayAsync(ct);
        var definitions = await db.RolePermissions.AsNoTracking()
            .Where(permission => roleIds.Contains(permission.RoleId))
            .Select(permission => new { permission.RoleId, permission.Permission.Code, permission.Permission.Description })
            .ToArrayAsync(ct);
        var departmentIds = grants.Where(grant => grant.DepartmentId.HasValue)
            .Select(grant => grant.DepartmentId!.Value).Distinct().ToArray();
        var departments = await db.Departments.AsNoTracking().Where(department => departmentIds.Contains(department.DepartmentId))
            .ToDictionaryAsync(department => department.DepartmentId, department => department.Name, ct);

        var assigned = grants.Where(grant => grant.RoleId is >= 1 and <= 6 &&
                (grant.ScopeType == "GLOBAL" && grant.DepartmentId == null ||
                 grant.ScopeType == "DEPARTMENT" && grant.DepartmentId.HasValue))
            .Select(grant => new AccessGrantDto(grant.UserRoleId, grant.RoleId, RoleNameNormalizer.FromRoleId(grant.RoleId),
                grant.ScopeType, grant.DepartmentId,
                grant.DepartmentId.HasValue ? departments.GetValueOrDefault(grant.DepartmentId.Value) : null,
                definitions.Where(permission => permission.RoleId == grant.RoleId)
                    .Select(permission => permission.Code).Distinct().Order().ToArray(),
                sources.Where(source => source.UserRoleId == grant.UserRoleId).Select(source => new AccessSourceDto(source.Kind, source.Position, source.Department, source.Reason)).ToArray()))
            .ToArray();
        var permissions = assigned.SelectMany(grant => grant.Permissions.Select(code => new { Grant = grant, Code = code }))
            .GroupBy(item => item.Code).OrderBy(group => group.Key)
            .Select(group => new ScopedPermissionDto(group.Key,
                definitions.First(definition => definition.Code == group.Key).Description,
                group.Any(item => item.Grant.ScopeType == "GLOBAL"),
                group.Where(item => item.Grant.DepartmentId.HasValue).Select(item => item.Grant.DepartmentId!.Value)
                    .Distinct().Order().ToArray()))
            .ToArray();
        return new AccountAccessDto(assigned, permissions);
    }
}
