namespace TekyLearningHub.Domain.Entities;

public sealed class Position
{
    public int PositionId { get; set; }
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public int DepartmentId { get; set; }
    public bool IsActive { get; set; }
    public Department Department { get; set; } = null!;
    public ICollection<PositionAccessPolicy> Policies { get; set; } = [];
}

public sealed class PositionAccessPolicy
{
    public long PolicyId { get; set; }
    public int PositionId { get; set; }
    public int Version { get; set; }
    public bool IsPublished { get; set; }
    public string EmploymentTypes { get; set; } = "FULL_TIME,PART_TIME,CONTRACTOR";
    public int CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public Position Position { get; set; } = null!;
    public ICollection<PositionPolicyRole> Roles { get; set; } = [];
    public ICollection<PositionPolicyPermission> Permissions { get; set; } = [];
}

/// <summary>Permission granted by a job title. The system roles stay fixed; this list is what an admin configures.</summary>
public sealed class PositionPolicyPermission
{
    public long PolicyId { get; set; }
    public int PermissionId { get; set; }
    public PositionAccessPolicy Policy { get; set; } = null!;
    public Permission Permission { get; set; } = null!;
}

public sealed class PositionPolicyRole
{
    public long PolicyId { get; set; }
    public byte RoleId { get; set; }
    public PositionAccessPolicy Policy { get; set; } = null!;
}

public sealed class StaffAppointment
{
    public long AppointmentId { get; set; }
    public int UserId { get; set; }
    public int DepartmentId { get; set; }
    public int PositionId { get; set; }
    public string EmploymentType { get; set; } = "FULL_TIME";
    public DateTime ValidFrom { get; set; }
    public DateTime? ValidTo { get; set; }
    public long? PolicyId { get; set; }
    public int? CreatedBy { get; set; }
    public int? EndedBy { get; set; }
    public string? EndReason { get; set; }
    public int Version { get; set; }
    public Position Position { get; set; } = null!;
    public PositionAccessPolicy? Policy { get; set; }
}

public sealed class UserRoleGrantSource
{
    public long SourceId { get; set; }
    public long UserRoleId { get; set; }
    public long? AppointmentId { get; set; }
    public long? PolicyId { get; set; }
    public string Kind { get; set; } = "LEGACY";
    public string Reason { get; set; } = "";
    public int? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public UserRoleAssignment Grant { get; set; } = null!;
    public StaffAppointment? Appointment { get; set; }
}
