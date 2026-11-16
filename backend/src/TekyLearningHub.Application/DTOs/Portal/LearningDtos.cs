using TekyLearningHub.Application.DTOs.Portal;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.DTOs.Portal;

public record LearningCourse(int CourseId, string CourseCode, string Name, string? Description, string? LevelCode, int TotalLessons, int ReviewedLessons);
public record LearningCourseInfo(int CourseId, string CourseCode, string Name, string? Description);
public record LearningMaterial(int MaterialId, string Title, string FileUrl, string MaterialType);
public record LearningLesson(int LessonId, string Title, string? Content, int OrderNo, bool Reviewed, List<LearningMaterial> Materials);
public record LearningSession(int SessionId, int? LessonId, int ClassId, string ClassCode);
public record LearningWork(int? LessonId, int SessionId, string ClassCode, StudentAssignmentDto Assignment);
public record LearningHistory(int AssignmentId, int AttemptNo, string FileName, string? Feedback, string ReviewStatus);
public record LearningDetail(LearningCourseInfo Course, List<LearningLesson> Lessons, List<LearningWork> Work, List<LearningHistory> History);
