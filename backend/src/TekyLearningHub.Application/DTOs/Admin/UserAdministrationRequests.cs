using System.ComponentModel.DataAnnotations;

namespace TekyLearningHub.Application.DTOs.Admin;

public sealed class RoleGrantRequest
{
    [Range(1,6)] public byte RoleId { get; set; }
    [Required] public string ScopeType { get; set; } = "GLOBAL";
    public int? DepartmentId { get; set; }
}
public sealed class CreateUserRequest
{
    [Required,EmailAddress,StringLength(150)] public string Email { get; set; } = "";
    [Required,StringLength(120)] public string FullName { get; set; } = "";
    [StringLength(20),Phone] public string? Phone { get; set; }
    [Range(1,6)] public byte PrimaryRoleId { get; set; }
    [MaxLength(20)] public RoleGrantRequest[] Grants { get; set; } = [];
    [MaxLength(20)] public AppointmentInput[] Appointments { get; set; } = [];
}
public sealed class UpdateUserRequest
{
    public int Version { get; set; }
    [Required,StringLength(120)] public string FullName { get; set; } = "";
    [StringLength(20),Phone] public string? Phone { get; set; }
}
public sealed class UserMutationRequest
{
    public int Version { get; set; }
    public byte? PrimaryRoleId { get; set; }
    public string? Status { get; set; }
    public string? Reason { get; set; }
    public RoleGrantRequest? Grant { get; set; }
}
public sealed class AppointmentRequest
{
    public int PolicyVersion { get; set; }
    public string Reason { get; set; } = "";
    public bool DisableAccess { get; set; }
    public int Version { get; set; }
    public int DepartmentId { get; set; }
    public int PositionId { get; set; }
    public string EmploymentType { get; set; } = "FULL_TIME";
}
public sealed class DirectoryRequest
{
    /// <summary>
    /// Optional for positions: the service generates a code from the owning department code
    /// when this is blank. Departments always require an explicit code.
    /// </summary>
    [RegularExpression("^[A-Z0-9_]{1,40}$")] public string? Code { get; set; }
    [Required,StringLength(160)] public string Name { get; set; } = "";
    public bool IsActive { get; set; } = true;
    /// <summary>Owning department. Required when creating or moving a position.</summary>
    public int? DepartmentId { get; set; }
    /// <summary>Departments only: ACADEMIC or TRAINING. Defaults to ACADEMIC.</summary>
    public string? FunctionCode { get; set; }
}
/// <summary>Activates or deactivates a department or job title without touching anything else.</summary>
public sealed class DirectoryStatusRequest
{
    public bool IsActive { get; set; }
}
/// <summary>Creates several staff accounts in one call, each bound to a department and job title.</summary>
public sealed class BulkCreateUsersRequest
{
    /// <summary>Department the new accounts belong to.</summary>
    [Range(1,int.MaxValue)] public int DepartmentId { get; set; }
    /// <summary>Job title to appoint. Required: it must belong to <see cref="DepartmentId"/> and be published,
    /// because the appointment is what makes the granted permissions effective.</summary>
    public int? PositionId { get; set; }
    /// <summary>One entry per account. Use "email, Họ tên" to also set the display name.</summary>
    [Required,MinLength(1),MaxLength(200)] public string[] Rows { get; set; } = [];
    /// <summary>Employment type applied to every appointment created by this call.</summary>
    public string EmploymentType { get; set; } = "FULL_TIME";
}
public sealed class BulkCreateRowResult
{
    public string Row { get; set; } = "";
    public string? Email { get; set; }
    public string? FullName { get; set; }
    /// <summary>Created, Duplicate, Invalid or Failed.</summary>
    public string Status { get; set; } = "";
    public string? Message { get; set; }
    public int? UserId { get; set; }
}
public sealed class BulkCreateResult
{
    public int Created { get; set; }
    public BulkCreateRowResult[] Rows { get; set; } = [];
}
/// <summary>One row of an uploaded Excel file, with the reason it cannot be imported.</summary>
public sealed class BulkRowPreview
{
    public string Email { get; set; } = "";
    public string FullName { get; set; } = "";
    public bool Valid { get; set; }
    public string Reason { get; set; } = "";
}
