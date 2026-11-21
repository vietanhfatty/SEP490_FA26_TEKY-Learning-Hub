using System.ComponentModel.DataAnnotations;

namespace TekyLearningHub.Application.DTOs.Admin;

/// <summary>Tóm tắt khóa học cho danh sách quản trị.</summary>
public record CourseSummaryDto(int CourseId, string CourseCode, string Name, string? LevelCode,
    string Status, int LessonCount, int ClassCount, DateTime CreatedAt, int? DepartmentId = null);

public record CourseDepartmentDto(int Id, string Name);

/// <summary>Chi tiết khóa học kèm bài học và học liệu.</summary>
public record CourseDetailDto(int CourseId, string CourseCode, string Name, string? Description,
    string? LevelCode, string Status, int ClassCount, DateTime CreatedAt,
    IReadOnlyList<LessonDto> Lessons, int? DepartmentId = null, string? LearningObjectives = null, int? TuitionVnd = null);

public record LessonDto(int LessonId, int OrderNo, string Title, string? Content,
    IReadOnlyList<LessonMaterialDto> Materials);

public record LessonMaterialDto(int MaterialId, string MaterialType, string Title, string FileUrl,
    bool IsDownloadable, int SortOrder);

/// <summary>Tạo mới hoặc cập nhật thông tin khóa học.</summary>
public record CourseUpsertRequest
{
    public int? DepartmentId { get; init; }
    [Required, StringLength(20, MinimumLength = 3)]
    public string CourseCode { get; init; } = null!;

    [Required, StringLength(200, MinimumLength = 1)]
    public string Name { get; init; } = null!;

    public string? Description { get; init; }
    [StringLength(2000)] public string? LearningObjectives { get; init; }
    [Range(0, int.MaxValue)] public int? TuitionVnd { get; init; }

    [StringLength(30)]
    public string? LevelCode { get; init; }

    [StringLength(10)]
    public string? Status { get; init; }
}

/// <summary>Đổi trạng thái vòng đời của khóa học.</summary>
public record CourseStatusRequest
{
    [Required, StringLength(10)]
    public string Status { get; init; } = null!;
}

/// <summary>Tạo mới hoặc cập nhật một bài học kèm học liệu.</summary>
public record LessonUpsertRequest
{
    [Required, StringLength(200, MinimumLength = 1)]
    public string Title { get; init; } = null!;

    public string? Content { get; init; }

    [Range(0, 1000)]
    public int OrderNo { get; init; }

    public IReadOnlyList<LessonMaterialUpsertRequest>? Materials { get; init; }
}

public record LessonMaterialUpsertRequest
{
    public int? MaterialId { get; init; }

    [Required, StringLength(15)]
    public string MaterialType { get; init; } = null!;

    [Required, StringLength(200, MinimumLength = 1)]
    public string Title { get; init; } = null!;

    [Required, StringLength(500, MinimumLength = 1)]
    public string FileUrl { get; init; } = null!;

    public bool IsDownloadable { get; init; } = true;

    [Range(0, 1000)]
    public int SortOrder { get; init; }
}

/// <summary>Kết quả trả về có thể kèm mã lỗi nghiệp vụ để controller ánh xạ sang HTTP status.</summary>
public record CourseOperationResult<T>(bool Succeeded, T? Value, string? Error, int StatusCode = 400)
{
    public static CourseOperationResult<T> Success(T value) => new(true, value, null, 200);
    public static CourseOperationResult<T> Fail(string error, int statusCode = 400) => new(false, default, error, statusCode);
}

/// <summary>Danh sách khóa học kèm tổng số bản ghi (phân trang server-side).</summary>
public record CoursePageDto(int Total, IReadOnlyList<CourseSummaryDto> Items);
