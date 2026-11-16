using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Application.Interfaces.Portal;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Infrastructure.Data;

namespace TekyLearningHub.Infrastructure.Services.Portal;

public sealed class StudentLearningService(ApplicationDbContext db, IStudentClassesService classes)
{
    private IQueryable<Enrollment> Access(int userId) => db.Enrollments.AsNoTracking().Where(e =>
        e.StudentId == userId && (e.Status == "Active" || e.Status == "Completed") && e.Student.User.Status == "Active"
        && e.Student.User.RoleAssignments.Any(r => r.RoleId == 1 && r.RevokedAt == null));

    public async Task<object> Courses(int userId, CancellationToken ct) {
        var courses = await db.Courses.AsNoTracking().Where(c => Access(userId).Any(e => e.Class.CourseId == c.CourseId))
            .OrderBy(c => c.Name).Select(c => new { c.CourseId, c.CourseCode, c.Name, c.Description, c.LevelCode,
                TotalLessons = c.Lessons.Count(l => !l.IsDeleted),
                ReviewedLessons = c.Lessons.Count(l => !l.IsDeleted && l.LessonProgresses.Any(p => p.StudentId == userId && p.CompletedAt != null))
            }).ToListAsync(ct);
        return courses;
    }
    public async Task<object?> Course(int userId, int courseId, CancellationToken ct) {
        if (!await Access(userId).AnyAsync(e => e.Class.CourseId == courseId,ct)) return null;
        var course = await db.Courses.AsNoTracking().Where(c => c.CourseId == courseId)
            .Select(c => new {c.CourseId,c.CourseCode,c.Name,c.Description}).SingleAsync(ct);
        var lessons = await db.Lessons.AsNoTracking().Where(l => l.CourseId == courseId && !l.IsDeleted)
            .OrderBy(l => l.OrderNo).ThenBy(l => l.LessonId).Select(l => new {
                l.LessonId,l.Title,l.Content,l.OrderNo,
                Reviewed = l.LessonProgresses.Any(p => p.StudentId == userId && p.CompletedAt != null),
                Materials = l.LessonMaterials.OrderBy(m => m.SortOrder).Select(m => new {m.MaterialId,m.Title,m.FileUrl,m.MaterialType}).ToList()
            }).ToListAsync(ct);
        var sessions = await db.ClassSessions.AsNoTracking().Where(s => s.Class.CourseId == courseId && s.LessonId != null
            && Access(userId).Any(e => e.ClassId == s.ClassId)).OrderBy(s => s.SessionId)
            .Select(s => new {s.SessionId,s.LessonId,s.ClassId,s.Class.ClassCode}).ToListAsync(ct);
        // Each assignment is shared with the class screen. Deduplicate repeat sessions for the same lesson/class.
        var work = new List<object>();
        foreach (var session in sessions.DistinctBy(s => (s.ClassId,s.LessonId))) {
            var detail = await classes.GetSessionAsync(userId,session.SessionId,ct);
            if (detail != null) foreach(var a in detail.Assignments)
                work.Add(new {session.LessonId,session.SessionId,session.ClassCode,Assignment=a});
        }
        var history = await db.StudentProjectVersions.AsNoTracking().Where(v => v.StudentId == userId &&
            db.Assignments.Any(a => a.AssignmentId == v.AssignmentId && a.Lesson != null && a.Lesson.CourseId == courseId
                && Access(userId).Any(e => e.ClassId == a.ClassId)))
            .OrderByDescending(v => v.AttemptNo).Select(v => new {v.AssignmentId,v.AttemptNo,v.FileName,v.Feedback,v.ReviewStatus}).ToListAsync(ct);
        return new {Course=course,Lessons=lessons,Work=work,History=history};
    }
    public async Task<bool> ReviewLesson(int userId,int courseId,int lessonId,CancellationToken ct) {
        if (!await db.Lessons.AnyAsync(l => l.LessonId == lessonId && l.CourseId == courseId && !l.IsDeleted &&
            Access(userId).Any(e => e.Class.CourseId == courseId),ct)) return false;
        // Atomic upsert protects simultaneous requests from two tabs.
        await db.Database.ExecuteSqlInterpolatedAsync($@"
            MERGE dbo.LessonProgress WITH (HOLDLOCK) AS target
            USING (SELECT {userId} AS StudentId, {lessonId} AS LessonId) AS source
            ON target.StudentId=source.StudentId AND target.LessonId=source.LessonId
            WHEN MATCHED THEN UPDATE SET CompletedAt=SYSUTCDATETIME()
            WHEN NOT MATCHED THEN INSERT(StudentId,LessonId,ViewedAt,CompletedAt)
            VALUES(source.StudentId,source.LessonId,SYSUTCDATETIME(),SYSUTCDATETIME());",ct);
        return true;
    }
}
