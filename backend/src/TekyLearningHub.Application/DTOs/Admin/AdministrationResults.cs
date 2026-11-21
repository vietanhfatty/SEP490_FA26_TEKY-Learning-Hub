using TekyLearningHub.Application.DTOs.Admin;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.DTOs.Admin;
public sealed class DirectoryEntry
{
    public int Id { get; set; }
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public bool IsActive { get; set; }
    /// <summary>Owning department. Always set for positions; null for departments themselves.</summary>
    public int? DepartmentId { get; set; }
    /// <summary>Business function of the department (or of the owning department for positions).</summary>
    public string FunctionCode { get; set; } = "ACADEMIC";
    /// <summary>Display name of the owning department, resolved for positions.</summary>
    public string DepartmentName { get; set; } = "";
    /// <summary>Job titles inside this department. Zero for positions.</summary>
    public int PositionCount { get; set; }
    /// <summary>Staff currently appointed here.</summary>
    public int ActiveAppointmentCount { get; set; }
    /// <summary>Whether the entry can be hard deleted instead of only deactivated.</summary>
    public bool CanDelete { get; set; }
    /// <summary>Why the entry cannot be deleted, shown next to the disabled delete action.</summary>
    public string? DeleteBlockedReason { get; set; }
}
public sealed class StaffAppointmentView
{
    public long AppointmentId { get; set; }
    public int DepartmentId { get; set; }
    public int PositionId { get; set; }
    public string Department { get; set; } = "";
    public string Position { get; set; } = "";
    public string EmploymentType { get; set; } = "";
    public DateTime ValidFrom { get; set; }
    public DateTime? ValidTo { get; set; }
}


public record ManagedGrantDto(long GrantId, byte RoleId, string Role, string ScopeType, int? DepartmentId, int? AssignedBy, DateTime AssignedAt, DateTime? RevokedAt);
public record ManagedUserDto(int UserId, string Email, string FullName, string? Phone, string Status, bool ActivationPending, byte PrimaryRoleId, string PrimaryRole, int Version, DateTime CreatedAt, DateTime? LastLoginAt, ManagedGrantDto[] Roles);
public record ManagedUserPage(int Total, ManagedUserDto[] Items);
public record InvitationView(DateTime CreatedAt, DateTime ExpiresAt, DateTime? UsedAt, DateTime? RevokedAt);
public record DeliveryView(DateTime? SentAt, int Attempts, DateTime NextAttemptAt);
public record ManagedUserDetail(ManagedUserDto User, List<StaffAppointmentView> Appointments, InvitationView? Invitation, DeliveryView? Delivery, TekyLearningHub.Application.DTOs.Auth.AccountAccessDto Access, StaffAccessState StaffAccess);
public record RoleCatalogDto(byte RoleId, string RoleName);
public record RolePermissionDto(byte RoleId, string Code, string? Description);
public record PermissionCatalogDto(string Code, string Description);
public record AdministrationCatalog(List<RoleCatalogDto> Roles, List<RolePermissionDto> Permissions, List<DirectoryEntry> Departments, List<DirectoryEntry> Positions, List<PermissionCatalogDto> AvailablePermissions)
{
    /// <summary>Permission templates per department function, used by the job title editor.</summary>
    public PositionTemplateDto[] Templates { get; init; } = [];
}
/// <summary>A named role and permission bundle offered for job titles of one department function.</summary>
public record PositionTemplateDto(string FunctionCode, string Code, string Name, int[] RoleIds, string[] PermissionCodes);
public record AuditEventDto(int? ActorUserId, string Action, string? OldValue, string? NewValue, DateTime CreatedAt);
public record AuditPage(int Total, List<AuditEventDto> Items);
public record AdministrationMessage(bool Success, string Message);
public record AdministrationVersion(bool Success, int Version);
public record AdministrationSuccess(bool Success);
public record CreatedUserResult(int UserId, string Status, string Message);
