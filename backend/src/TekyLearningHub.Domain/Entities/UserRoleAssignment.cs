namespace TekyLearningHub.Domain.Entities;

public class UserRoleAssignment
{
    public long UserRoleId { get; set; }
    public int UserId { get; set; }
    public byte RoleId { get; set; }
    public string ScopeType { get; set; } = "GLOBAL";
    public int? DepartmentId { get; set; }
    public int? AssignedBy { get; set; }
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RevokedAt { get; set; }
    public User User { get; set; } = null!;
    public Role Role { get; set; } = null!;
    public ICollection<UserRoleGrantSource> Sources { get; set; } = [];
}
