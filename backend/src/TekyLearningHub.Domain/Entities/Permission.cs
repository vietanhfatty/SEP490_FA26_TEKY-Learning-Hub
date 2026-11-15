namespace TekyLearningHub.Domain.Entities;
public class Permission
{
    public int PermissionId { get; set; }
    public string Code { get; set; } = null!;
    public string Description { get; set; } = null!;
}
public class RolePermission
{
    public byte RoleId { get; set; }
    public int PermissionId { get; set; }
    public Role Role { get; set; } = null!;
    public Permission Permission { get; set; } = null!;
}
