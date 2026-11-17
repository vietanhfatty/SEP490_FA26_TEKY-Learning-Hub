namespace TekyLearningHub.Application.DTOs.Auth;

public record AccessGrantDto(long GrantId, byte RoleId, string Role, string ScopeType,
    int? DepartmentId, string? DepartmentName, string[] Permissions);

public record ScopedPermissionDto(string Code, string Description, bool IsGlobal, int[] DepartmentIds);

public record AccountAccessDto(AccessGrantDto[] Grants, ScopedPermissionDto[] Permissions)
{
    public static AccountAccessDto Empty => new([], []);

    public bool Allows(string code, int? departmentId) => Permissions.Any(permission =>
        permission.Code == code && (permission.IsGlobal ||
            (departmentId.HasValue && permission.DepartmentIds.Contains(departmentId.Value))));
}
