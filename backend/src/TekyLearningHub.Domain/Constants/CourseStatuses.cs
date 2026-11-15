namespace TekyLearningHub.Domain.Constants;

/// <summary>
/// Vòng đời trạng thái của khóa học.
/// <c>Draft</c> -> <c>Published</c> -> <c>Archived</c>.
/// <c>Active</c> được giữ lại để tương thích với các dòng dữ liệu seed cũ.
/// </summary>
public static class CourseStatuses
{
    public const string Draft = "Draft";
    public const string Published = "Published";
    public const string Active = "Active";
    public const string Archived = "Archived";

    public static readonly IReadOnlyList<string> All = [Draft, Published, Active, Archived];

    public static bool IsValid(string? status) =>
        status is not null && All.Contains(status, StringComparer.Ordinal);

    /// <summary>
    /// Chuẩn hoá trạng thái do người dùng gửi lên. Trả về <c>null</c> khi giá trị không hợp lệ.
    /// </summary>
    public static string? Normalize(string? status)
    {
        if (string.IsNullOrWhiteSpace(status)) return null;
        var trimmed = status.Trim();
        return All.FirstOrDefault(item => string.Equals(item, trimmed, StringComparison.OrdinalIgnoreCase));
    }
}
