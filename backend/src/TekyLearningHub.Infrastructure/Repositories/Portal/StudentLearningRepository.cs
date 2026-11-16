using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.DTOs.Portal;
using TekyLearningHub.Application.Interfaces.Portal;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Infrastructure.Data;

namespace TekyLearningHub.Infrastructure.Repositories.Portal;

public sealed class StudentLearningRepository(ApplicationDbContext db) : IStudentLearningRepository
{
    private IQueryable<Enrollment> Access(int userId) => db.Enrollments.AsNoTracking().Where(e =>
        e.StudentId == userId && (e.Status == "Active" || e.Status == "Completed") && e.Student.User.Status == "Active"
        && e.Student.User.RoleAssignments.Any(r => r.RoleId == 1 && r.RevokedAt == null));

    public async Task<List<LearningCourse>> Courses(int userId, CancellationToken ct)
    {
        var courses = await db.Courses.AsNoTracking().Where(c => Access(userId).Any(e => e.Class.CourseId == c.CourseId))
            .OrderBy(c => c.Name).Select(c => new LearningCourse(c.CourseId, c.CourseCode, c.Name, c.Description, c.LevelCode, c.Lessons.Count(l => !l.IsDeleted), c.Lessons.Count(l => !l.IsDeleted && l.LessonProgresses.Any(p => p.StudentId == userId && p.CompletedAt != null)))).ToListAsync(ct);
        return courses;
    }
    public Task<bool> HasCourse(int userId, int courseId, CancellationToken ct) => Access(userId).AnyAsync(e => e.Class.CourseId == courseId, ct);
    public async Task<LearningCourseInfo> Course(int userId, int courseId, CancellationToken ct) => await db.Courses.AsNoTracking().Where(c => c.CourseId == courseId)
            .Select(c => new LearningCourseInfo(c.CourseId, c.CourseCode, c.Name, c.Description)).SingleAsync(ct);
    public async Task<List<LearningLesson>> Lessons(int userId, int courseId, CancellationToken ct) => await db.Lessons.AsNoTracking().Where(l => l.CourseId == courseId && !l.IsDeleted)
            .OrderBy(l => l.OrderNo).ThenBy(l => l.LessonId).Select(l => new LearningLesson(l.LessonId, l.Title, l.Content, l.OrderNo, l.LessonProgresses.Any(p => p.StudentId == userId && p.CompletedAt != null),
 l.LessonMaterials.OrderBy(m => m.SortOrder).Select(m => new LearningMaterial(m.MaterialId, m.Title, m.FileUrl, m.MaterialType)).ToList()
            )).ToListAsync(ct);
    public async Task<List<LearningSession>> Sessions(int userId, int courseId, CancellationToken ct) => await db.ClassSessions.AsNoTracking().Where(s => s.Class.CourseId == courseId && s.LessonId != null
            && Access(userId).Any(e => e.ClassId == s.ClassId)).OrderBy(s => s.SessionId)
            .Select(s => new LearningSession(s.SessionId, s.LessonId, s.ClassId, s.Class.ClassCode)).ToListAsync(ct);
    public async Task<List<LearningHistory>> History(int userId, int courseId, CancellationToken ct) => await db.StudentProjectVersions.AsNoTracking().Where(v => v.StudentId == userId &&
            db.Assignments.Any(a => a.AssignmentId == v.AssignmentId && a.Lesson != null && a.Lesson.CourseId == courseId
                && Access(userId).Any(e => e.ClassId == a.ClassId)))
            .OrderByDescending(v => v.AttemptNo).Select(v => new LearningHistory(v.AssignmentId, v.AttemptNo, v.FileName, v.Feedback, v.ReviewStatus)).ToListAsync(ct);
    public async Task<bool> MarkReviewed(int userId, int courseId, int lessonId, CancellationToken ct)
    {

        // Atomic upsert protects simultaneous requests from two tabs.
        await db.Database.ExecuteSqlInterpolatedAsync($@"
            MERGE dbo.LessonProgress WITH (HOLDLOCK) AS target
            USING (SELECT {userId} AS StudentId, {lessonId} AS LessonId) AS source
            ON target.StudentId=source.StudentId AND target.LessonId=source.LessonId
            WHEN MATCHED THEN UPDATE SET CompletedAt=SYSUTCDATETIME()
            WHEN NOT MATCHED THEN INSERT(StudentId,LessonId,ViewedAt,CompletedAt)
            VALUES(source.StudentId,source.LessonId,SYSUTCDATETIME(),SYSUTCDATETIME());", ct);
        return true;
    }
    public async Task<bool> CanReview(int userId, int courseId, int lessonId, CancellationToken ct) => await db.Lessons.AnyAsync(l => l.LessonId == lessonId && l.CourseId == courseId && !l.IsDeleted &&
            Access(userId).Any(e => e.Class.CourseId == courseId), ct);
}
