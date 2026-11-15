using System.ComponentModel.DataAnnotations;

namespace TekyLearningHub.Application.DTOs.Auth;

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
    [Required,MinLength(1),MaxLength(20)] public RoleGrantRequest[] Grants { get; set; } = [];
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
public sealed class AcceptInvitationRequest
{
    [Required,StringLength(128)] public string Token { get; set; } = "";
    [Required,MinLength(12)] public string NewPassword { get; set; } = "";
    [Required,Compare(nameof(NewPassword))] public string ConfirmPassword { get; set; } = "";
}
public sealed class AppointmentRequest
{
    public int Version { get; set; }
    public int DepartmentId { get; set; }
    public int PositionId { get; set; }
    public string EmploymentType { get; set; } = "FULL_TIME";
}
public sealed class DirectoryRequest
{
    [Required,RegularExpression("^[A-Z0-9_]{1,40}$")] public string Code { get; set; } = "";
    [Required,StringLength(160)] public string Name { get; set; } = "";
    public bool IsActive { get; set; } = true;
}
