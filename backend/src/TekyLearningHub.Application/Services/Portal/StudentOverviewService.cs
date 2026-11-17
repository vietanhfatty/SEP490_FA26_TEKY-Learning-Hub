using TekyLearningHub.Application.Interfaces.Portal;
using TekyLearningHub.Application.DTOs.Portal;
using TekyLearningHub.Domain.Entities;
namespace TekyLearningHub.Application.Services.Portal;

public sealed class StudentOverviewService(IStudentOverviewRepository db, IStudentClassesService classes) : IStudentOverviewService
{
    private static DateTimeOffset Utc(DateTime date) => new(DateTime.SpecifyKind(date, DateTimeKind.Utc));

    public async Task<StudentOverviewDto?> Overview(int userId, CancellationToken ct)
    {
        var identity = await db.Identity(userId, ct);
        if (identity is null) return null;
        var now = DateTimeOffset.UtcNow;
        var all = await classes.GetClassesAsync(userId, ct);
        var active = all!.Classes.Where(c => c.EnrollmentStatus == "Active" && c.Status != "Completed" && c.Status != "Cancelled").ToList();
        var courseIds = active.Select(c => c.CourseId).Distinct().ToList();
        var metrics = await db.Metrics(userId, courseIds, active.Select(c => c.ClassId).ToList(), now.UtcDateTime, now.UtcDateTime.AddDays(7), ct);
        var courses = metrics.Courses; var projectCount = metrics.ProjectCount; var passed = metrics.Passed; var due = metrics.Deadlines;
        var next = active.SelectMany(c => c.Sessions).Where(s => s.Status == "Scheduled" && s.EndsAt > now)
            .OrderBy(s => s.StartsAt).ThenBy(s => s.SessionId).Take(6).ToList();
        return new(identity, active, courses, courses.Sum(c => c.TotalLessons), courses.Sum(c => c.ReviewedLessons), projectCount, passed,
            due.Select(a => new StudentDeadlineDto(a.AssignmentId, a.Title, a.ClassId, a.ClassCode, a.CourseId, a.LessonId, Utc(a.DueAt!.Value), a.SessionId, a.NeedsRevision)).ToList(), next, now);
    }
    public async Task<StudentClassDetailsDto?> ClassDetails(int userId, int classId, CancellationToken ct)
    {
        var e = await db.Enrollment(userId, classId, ct);
        if (e is null) return null;
        // Notifications are addressed to an individual. Never expose another recipient's class notice.
        var notices = await db.Notices(userId, classId, ct); var count = notices.Count; var recent = notices.Items;
        var materials = await db.Materials(classId, e.CourseId, ct);
        return new(e.ClassId, e.ClassCode, e.Name, e.CourseId, e.CourseName, e.Status, e.EnrollmentStatus, e.StartDate, e.EndDate, e.MaxStudents,
            e.TeacherName, e.TeacherEmail, Utc(e.EnrolledAt), recent.Select(n => new StudentClassNoticeDto(n.NotificationId, n.Title, n.Body, n.IsRead, Utc(n.CreatedAt))).ToList(), materials, count);
    }
}
