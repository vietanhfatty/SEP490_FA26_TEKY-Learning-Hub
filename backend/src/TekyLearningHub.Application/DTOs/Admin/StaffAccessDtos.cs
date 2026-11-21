using System.ComponentModel.DataAnnotations;

namespace TekyLearningHub.Application.DTOs.Admin;

public sealed class AppointmentInput
{
    public int DepartmentId { get; set; }
    public int PositionId { get; set; }
    public int PolicyVersion { get; set; }
    public string EmploymentType { get; set; } = "FULL_TIME";
}
public sealed class StaffChangeRequest
{
    public int Version { get; set; }
    public long? EndAppointmentId { get; set; }
    public AppointmentInput? Appointment { get; set; }
    public byte? PrimaryRoleId { get; set; }
    public bool DisableAccess { get; set; }
    [StringLength(500)] public string Reason { get; set; } = "";
}
public sealed class PolicyRequest
{
    public int Version { get; set; }
    /// <summary>System roles the job title maps to. These drive the shell and the JWT role claim.</summary>
    public int[] RoleIds { get; set; } = [];
    /// <summary>Permissions the job title actually grants. This is the configurable part.</summary>
    public string[] PermissionCodes { get; set; } = [];
    public string[] EmploymentTypes { get; set; } = ["FULL_TIME", "PART_TIME", "CONTRACTOR"];
    public bool Publish { get; set; }
    [StringLength(500)] public string Reason { get; set; } = "";
}
public sealed class PositionSaveRequest
{
    [RegularExpression("^[A-Z0-9_]{1,40}$")] public string? Code { get; set; }
    [Required, StringLength(160)] public string Name { get; set; } = "";
    public int DepartmentId { get; set; }
    public bool IsActive { get; set; } = true;
    [Required] public PolicyRequest Policy { get; set; } = new();
}
public sealed class StaffExceptionRequest
{
    public int Version { get; set; }
    public RoleGrantRequest Grant { get; set; } = new();
    [Required, StringLength(500)] public string Reason { get; set; } = "";
}
public sealed class ReconcileStaffRequest
{
    public int Version { get; set; }
    public AppointmentInput[] Appointments { get; set; } = [];
    public long[] RetainGrantIds { get; set; } = [];
    public byte? PrimaryRoleId { get; set; }
    public bool DisableAccess { get; set; }
    [Required, StringLength(500)] public string Reason { get; set; } = "";
}
public record PositionPolicyView(int PositionId, int DepartmentId, string Position, string Department,
    bool IsActive, int Version, bool IsPublished, int[] RoleIds, string[] EmploymentTypes, int ActiveAppointments,
    int? ActiveVersion = null, int[]? ActiveRoleIds = null, string[]? ActiveEmploymentTypes = null,
    string[]? PermissionCodes = null, string[]? ActivePermissionCodes = null,
    string DepartmentFunction = "ACADEMIC", string? ActiveTemplateCode = null);
public record AppointmentAccessView(long AppointmentId, int DepartmentId, int PositionId, string Department,
    string Position, string EmploymentType, DateTime ValidFrom, DateTime? ValidTo, int PolicyVersion, int[] RoleIds);
public record GrantSourceView(long GrantId, long SourceId, string Kind, long? AppointmentId,
    string? Position, string? Department, string Reason);
public record StaffAccessState(bool IsManaged, bool NeedsReconciliation, AppointmentAccessView[] Appointments, GrantSourceView[] Sources);
public record StaffPreview(RoleGrantRequest[] Before, RoleGrantRequest[] After, int[] AvailablePrimaryRoles,
    string[] Warnings, int[] AffectedUserIds, UserAccessImpact[]? UserChanges = null);
public record UserAccessImpact(int UserId, string Name, RoleGrantRequest[] Before, RoleGrantRequest[] After);
