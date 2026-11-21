namespace TekyLearningHub.Domain.Entities;

public sealed class Department
{
    public int DepartmentId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    /// <summary>Business function: ACADEMIC (Phòng Chuyên môn) or TRAINING (Phòng Quản lý đào tạo).</summary>
    public string FunctionCode { get; set; } = "ACADEMIC";
}
