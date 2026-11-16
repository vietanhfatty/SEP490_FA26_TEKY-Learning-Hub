using TekyLearningHub.Application.DTOs.Portal;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.Interfaces.Portal;

public interface IStudentLearningRepository
{
    Task<List<LearningCourse>> Courses(int userId, CancellationToken ct);
    Task<bool> HasCourse(int userId, int courseId, CancellationToken ct);
    Task<LearningCourseInfo> Course(int userId, int courseId, CancellationToken ct);
    Task<List<LearningLesson>> Lessons(int userId, int courseId, CancellationToken ct);
    Task<List<LearningSession>> Sessions(int userId, int courseId, CancellationToken ct);
    Task<List<LearningHistory>> History(int userId, int courseId, CancellationToken ct);
    Task<bool> CanReview(int userId, int courseId, int lessonId, CancellationToken ct);
    Task<bool> MarkReviewed(int userId, int courseId, int lessonId, CancellationToken ct);
}
public interface IStudentLearningService
{
    Task<List<LearningCourse>> Courses(int userId, CancellationToken ct);
    Task<LearningDetail?> Course(int userId, int courseId, CancellationToken ct);
    Task<bool> ReviewLesson(int userId, int courseId, int lessonId, CancellationToken ct);
}
