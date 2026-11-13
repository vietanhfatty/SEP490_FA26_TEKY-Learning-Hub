namespace TekyLearningHub.Infrastructure.Security;

/// <summary>
/// Chuẩn hoá tên vai trò giữa bảng Roles (PascalCase) và các giá trị snake_case
/// được phát ra trong JWT claim (<c>role</c>, <c>role_name</c>) và trong DTO trả về cho frontend.
/// Nguồn sự thật về ID là enum Domain <c>UserRole</c>: Student=1, Teacher=2, Admin=3, Parent=4, Staff=5, AcademicManager=6.
/// </summary>
public static class RoleNameNormalizer
{
    /// <summary>
    /// Trả về tên vai trò dạng snake_case, hoặc <c>null</c> nếu đầu vào rỗng.
    /// </summary>
    public static string? Normalize(string? rawRoleName)
    {
        if (string.IsNullOrWhiteSpace(rawRoleName))
        {
            return null;
        }

        var normalized = rawRoleName.Trim().ToLowerInvariant().Replace(" ", "_").Replace("-", "_");

        return normalized switch
        {
            "student" => "student",
            "teacher" or "tutor" or "gv" => "teacher",
            "admin" or "administrator" or "systemadmin" => "admin",
            "parent" or "guardian" => "parent",
            "staff" or "giao_vu" or "operations" => "staff",
            "academicmanager" or "academic_manager" or "manager" or "academic" => "academic_manager",
            _ => normalized
        };
    }

    /// <summary>
    /// Ánh xạ trực tiếp từ <c>RoleId</c> sang tên vai trò snake_case theo enum Domain.
    /// </summary>
    public static string FromRoleId(byte roleId)
    {
        return roleId switch
        {
            (byte)Domain.Enums.UserRole.Student => "student",
            (byte)Domain.Enums.UserRole.Teacher => "teacher",
            (byte)Domain.Enums.UserRole.Admin => "admin",
            (byte)Domain.Enums.UserRole.Parent => "parent",
            (byte)Domain.Enums.UserRole.Staff => "staff",
            (byte)Domain.Enums.UserRole.AcademicManager => "academic_manager",
            _ => "student"
        };
    }
}
