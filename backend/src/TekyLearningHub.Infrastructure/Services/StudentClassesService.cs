using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.DTOs.Student;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Infrastructure.Data;

namespace TekyLearningHub.Infrastructure.Services;

public class StudentClassesService(ApplicationDbContext db) : IStudentClassesService
{
    private IQueryable<StudentProfile> Students(int userId) => db.StudentProfiles.AsNoTracking()
        .Where(s => s.UserId == userId && s.User.Status == "Active" && s.User.Role.RoleName == "Student");

    private IQueryable<Enrollment> Enrollments(int userId) => db.Enrollments.AsNoTracking()
        .Where(e => e.StudentId == userId && (e.Status == "Active" || e.Status == "Completed"));

    public async Task<StudentClassesDto?> GetClassesAsync(int userId, CancellationToken cancellationToken)
    {
        var student = await Students(userId).Select(s => new { s.UserId, s.StudentCode, s.User.FullName })
            .SingleOrDefaultAsync(cancellationToken);
        if (student is null) return null;

        var enrollments = await Enrollments(userId)
            .Include(e => e.Class.Course)
            .Include(e => e.Class.Teacher!).ThenInclude(t => t.User)
            .Include(e => e.Class.ClassSessions).ThenInclude(s => s.Lesson)
            .Include(e => e.Class.ClassSessions).ThenInclude(s => s.Room)
            .AsSplitQuery().OrderBy(e => e.Class.ClassCode).ToListAsync(cancellationToken);

        var classes = enrollments.Select(e => new StudentClassDto(
            e.ClassId, e.Class.ClassCode, e.Class.Name, e.Class.Status, e.Status, e.ProgressPercent,
            e.Class.CourseId, e.Class.Course.CourseCode, e.Class.Course.Name,
            e.Class.Teacher?.User.FullName, e.Class.Teacher?.User.Email,
            e.Class.ClassSessions.OrderBy(s => s.SessionDate).ThenBy(s => s.StartTime).ThenBy(s => s.SessionId)
                .Select(s => MapSession(s, false)).ToList())).ToList();
        return new StudentClassesDto(student.UserId, student.StudentCode, student.FullName, classes);
    }

    public async Task<StudentSessionDto?> GetSessionAsync(int userId, int sessionId, CancellationToken cancellationToken)
    {
        if (!await Students(userId).AnyAsync(cancellationToken)) return null;
        var session = await db.ClassSessions.AsNoTracking()
            .Where(s => s.SessionId == sessionId && Enrollments(userId).Any(e => e.ClassId == s.ClassId))
            .Include(s => s.Class.Course)
            .Include(s => s.Class.Teacher!).ThenInclude(t => t.User)
            .Include(s => s.Lesson!).ThenInclude(l => l.LessonMaterials)
            .Include(s => s.Room).SingleOrDefaultAsync(cancellationToken);
        return session is null ? null : MapSession(session, true);
    }

    private static StudentSessionDto MapSession(ClassSession session, bool includeContent)
    {
        // SQL stores local Vietnam date/time without an offset.
        var startsAt = new DateTimeOffset(session.SessionDate.ToDateTime(session.StartTime), TimeSpan.FromHours(7));
        var endsAt = new DateTimeOffset(session.SessionDate.ToDateTime(session.EndTime), TimeSpan.FromHours(7));
        if (endsAt < startsAt) endsAt = endsAt.AddDays(1);
        var lesson = session.Lesson is { IsDeleted: false } ? session.Lesson : null;
        var materials = includeContent && lesson is not null
            ? lesson.LessonMaterials.OrderBy(m => m.SortOrder)
                .Select(m => new StudentMaterialDto(m.MaterialId, m.Title, m.MaterialType, m.FileUrl)).ToList()
            : new List<StudentMaterialDto>();
        return new StudentSessionDto(session.SessionId, session.ClassId, session.Class.ClassCode,
            session.Class.Name, session.Class.CourseId, session.Class.Course.CourseCode,
            session.Class.Course.Name, lesson?.LessonId, lesson?.Title ?? "Buổi học",
            includeContent ? lesson?.Content : null, startsAt, endsAt, session.Status,
            session.Class.Teacher?.User.FullName, session.Class.Teacher?.User.Email, session.Room?.RoomName, materials);
    }
}
