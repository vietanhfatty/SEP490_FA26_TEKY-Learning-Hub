using TekyLearningHub.Application.DTOs.Admin;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.Interfaces.Admin;

public interface ICourseRepository
{
    Task<CoursePageDto> List(string? status, string? keyword, int skip, int take, bool isGlobal, int[] departmentIds, CancellationToken ct);
    Task<bool> DepartmentExists(int id, CancellationToken ct);
    Task<CourseDepartmentDto[]> Departments(bool isGlobal, int[] departmentIds, CancellationToken ct);
    Task<Course?> FindCourse(int id, CancellationToken ct);
    Task<Lesson?> FindLesson(int courseId, int lessonId, CancellationToken ct);
    Task<Lesson> LoadLesson(int id, CancellationToken ct);
    Task<List<Lesson>> Lessons(int courseId, CancellationToken ct);
    Task<bool> HasLessons(int courseId, CancellationToken ct);
    Task<bool> IsApproved(int courseId, CancellationToken ct);
    Task<LessonMaterial?> FindMaterial(int courseId, int lessonId, int materialId, CancellationToken ct);
    Task<List<LessonMaterial>> Materials(int lessonId, CancellationToken ct);
    void AddCourse(Course entity); void AddLesson(Lesson entity); void AddMaterial(LessonMaterial entity);
    void RemoveMaterial(LessonMaterial entity); void AddAudit(AuditLog entity);
}
