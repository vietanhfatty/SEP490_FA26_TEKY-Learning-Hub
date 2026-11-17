using TekyLearningHub.Application.DTOs.Portal;

namespace TekyLearningHub.Application.Interfaces.Portal;

public interface IParentLearningService
{
    Task<IReadOnlyList<ParentChildDto>> Children(int parentId, CancellationToken ct);
    Task<ParentLearningDto?> Learning(int parentId, int studentId, CancellationToken ct);
}

public interface IParentLearningRepository
{
    Task<IReadOnlyList<ParentChildDto>> Children(int parentId, CancellationToken ct);
    Task<IReadOnlyList<ParentLessonDto>> Lessons(int studentId, CancellationToken ct);
    Task<IReadOnlyList<ParentAttendanceDto>> Attendance(int studentId, CancellationToken ct);
    Task<IReadOnlyList<ParentAssessmentRow>> Assessments(int studentId, CancellationToken ct);
    Task<IReadOnlyList<ParentTeacherDto>> Teachers(int studentId, CancellationToken ct);
}
