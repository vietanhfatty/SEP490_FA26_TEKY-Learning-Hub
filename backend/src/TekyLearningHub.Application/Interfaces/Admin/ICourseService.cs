using TekyLearningHub.Application.DTOs.Admin;

namespace TekyLearningHub.Application.Interfaces.Admin;

/// <summary>
/// Quản lý khóa học, bài học và học liệu. Hiện chỉ dành cho role admin.
/// </summary>
public interface ICourseService
{
    Task<CourseDepartmentDto[]> DepartmentsAsync(int actorUserId, CancellationToken ct);
    Task<CoursePageDto> ListAsync(int actorUserId, string? status, string? keyword, int skip, int take,
        CancellationToken cancellationToken);

    Task<CourseDetailDto?> GetAsync(int courseId, int actorUserId, CancellationToken cancellationToken);

    Task<CourseOperationResult<CourseDetailDto>> CreateAsync(CourseUpsertRequest request, int actorUserId,
        string? ipAddress, CancellationToken cancellationToken);

    Task<CourseOperationResult<CourseDetailDto>> UpdateAsync(int courseId, CourseUpsertRequest request,
        int actorUserId, string? ipAddress, CancellationToken cancellationToken);

    Task<CourseOperationResult<CourseDetailDto>> ChangeStatusAsync(int courseId, string status, int actorUserId,
        string? ipAddress, CancellationToken cancellationToken);

    Task<CourseOperationResult<CourseDetailDto>> ArchiveAsync(int courseId, int actorUserId, string? ipAddress,
        CancellationToken cancellationToken);

    Task<CourseOperationResult<LessonDto>> UpsertLessonAsync(int courseId, int? lessonId, LessonUpsertRequest request,
        int actorUserId, string? ipAddress, CancellationToken cancellationToken);

    Task<CourseOperationResult<bool>> DeleteLessonAsync(int courseId, int lessonId, int actorUserId,
        string? ipAddress, CancellationToken cancellationToken);

    Task<CourseOperationResult<bool>> DeleteMaterialAsync(int courseId, int lessonId, int materialId, int actorUserId,
        string? ipAddress, CancellationToken cancellationToken);
}
