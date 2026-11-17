using TekyLearningHub.Application.DTOs.Portal;
using TekyLearningHub.Application.Interfaces.Portal;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.Services.Portal;

public sealed class StudentLearningService(IStudentLearningRepository repository, IStudentClassesService classes) : IStudentLearningService
{
    public Task<List<LearningCourse>> Courses(int userId, CancellationToken ct) => repository.Courses(userId, ct);
    public async Task<LearningDetail?> Course(int userId, int courseId, CancellationToken ct)
    {
        if (!await repository.HasCourse(userId, courseId, ct)) return null;
        var course = await repository.Course(userId, courseId, ct); var lessons = await repository.Lessons(userId, courseId, ct);
        var sessions = await repository.Sessions(userId, courseId, ct); var work = new List<LearningWork>();
        foreach (var session in sessions.DistinctBy(s => (s.ClassId, s.LessonId)))
        {
            var detail = await classes.GetSessionAsync(userId, session.SessionId, ct);
            if (detail != null) foreach (var assignment in detail.Assignments) work.Add(new(session.LessonId, session.SessionId, session.ClassCode, assignment));
        }
        return new(course, lessons, work, await repository.History(userId, courseId, ct));
    }
    public async Task<bool> ReviewLesson(int userId, int courseId, int lessonId, CancellationToken ct) =>
     await repository.CanReview(userId, courseId, lessonId, ct) && await repository.MarkReviewed(userId, courseId, lessonId, ct);
}
