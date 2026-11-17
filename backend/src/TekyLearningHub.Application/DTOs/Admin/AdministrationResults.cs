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
    /// <summary>Display name of the owning department, resolved for positions.</summary>
    public string DepartmentName { get; set; } = "";
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
public record ManagedUserDetail(ManagedUserDto User, List<StaffAppointmentView> Appointments, InvitationView? Invitation, DeliveryView? Delivery);
public record RoleCatalogDto(byte RoleId, string RoleName);
public record RolePermissionDto(byte RoleId, string Code, string? Description);
public record AdministrationCatalog(List<RoleCatalogDto> Roles, List<RolePermissionDto> Permissions, List<DirectoryEntry> Departments, List<DirectoryEntry> Positions);
public record AuditEventDto(int? ActorUserId, string Action, string? OldValue, string? NewValue, DateTime CreatedAt);
public record AuditPage(int Total, List<AuditEventDto> Items);
public record AdministrationMessage(bool Success, string Message);
public record AdministrationVersion(bool Success, int Version);
public record AdministrationSuccess(bool Success);
public record CreatedUserResult(int UserId, string Status, string Message);
