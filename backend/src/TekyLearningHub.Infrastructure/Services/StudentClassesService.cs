using System.Data;
using Microsoft.Data.SqlClient;
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
        if (session is null) return null;
        var assignments = await GetAssignmentsAsync(userId, session, cancellationToken);
        return MapSession(session, true) with { Assignments = assignments };
    }

    private IQueryable<Assignment> SessionAssignments(int userId, int sessionId, bool writable)
    {
        var enrollment = Enrollments(userId);
        if (writable) enrollment = enrollment.Where(e => e.Status == "Active");

        return from session in db.ClassSessions.AsNoTracking()
               join assignment in db.Assignments.AsNoTracking()
                   on new { session.ClassId, session.LessonId } equals new { assignment.ClassId, assignment.LessonId }
               where session.SessionId == sessionId && session.Lesson != null && !session.Lesson.IsDeleted
                   && (!writable || session.Status != "Cancelled")
                   && Students(userId).Any() && enrollment.Any(e => e.ClassId == session.ClassId)
                   && (assignment.Status == "Published" || assignment.Status == "Closed")
               select assignment;
    }

    private async Task<IReadOnlyList<StudentAssignmentDto>> GetAssignmentsAsync(
        int userId, ClassSession session, CancellationToken cancellationToken)
    {
        if (session.Lesson is not { IsDeleted: false }) return [];

        var now = DateTime.UtcNow;
        var active = session.Status != "Cancelled" && await Enrollments(userId)
            .AnyAsync(e => e.ClassId == session.ClassId && e.Status == "Active", cancellationToken);
        var assignments = await (
            from assignment in SessionAssignments(userId, session.SessionId, writable: false)
            join submission in db.StudentProjectSubmissions.AsNoTracking().Where(s => s.StudentId == userId)
                on assignment.AssignmentId equals submission.AssignmentId into submissions
            from submission in submissions.DefaultIfEmpty()
            orderby assignment.AssignmentId
            select new
            {
                assignment.AssignmentId, assignment.Title, assignment.Instructions, assignment.DueAt, assignment.Status,
                FileName = submission == null ? null : submission.FileName,
                SubmittedAt = submission == null ? (DateTime?)null : submission.SubmittedAt
            }).ToListAsync(cancellationToken);

        return assignments.Select(a => new StudentAssignmentDto(a.AssignmentId, a.Title, a.Instructions,
            a.DueAt is { } dueAt ? Utc(dueAt) : null,
            active && a.Status == "Published" && (a.DueAt is null || a.DueAt > now) && a.SubmittedAt is null,
            a.SubmittedAt is { } submittedAt ? new StudentProjectDto(a.FileName!, Utc(submittedAt)) : null)).ToList();
    }

    public async Task<StudentProjectOutcome> SubmitProjectAsync(int userId, int sessionId, int assignmentId,
        string fileName, byte[] content, CancellationToken cancellationToken)
    {
        var strategy = db.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync<StudentProjectOutcome>(async cancellation =>
        {
            await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellation);
            var assignment = await SessionAssignments(userId, sessionId, writable: true)
                .SingleOrDefaultAsync(a => a.AssignmentId == assignmentId, cancellation);
            if (assignment is null) return new StudentProjectOutcome(StudentProjectResult.NotFound);

            var now = DateTime.UtcNow;
            if (assignment.Status != "Published" || assignment.DueAt <= now)
                return new StudentProjectOutcome(StudentProjectResult.Closed);

            var submission = new StudentProjectSubmission
            {
                AssignmentId = assignmentId,
                StudentId = userId,
                FileName = fileName,
                Content = content,
                SubmittedAt = now
            };
            db.StudentProjectSubmissions.Add(submission);
            try
            {
                await db.SaveChangesAsync(cancellation);
                await transaction.CommitAsync(cancellation);
                return new StudentProjectOutcome(StudentProjectResult.Submitted, new StudentProjectDto(fileName, Utc(now)));
            }
            catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 })
            {
                return new StudentProjectOutcome(StudentProjectResult.AlreadySubmitted);
            }
            finally
            {
                db.Entry(submission).State = EntityState.Detached;
            }
        }, cancellationToken);
    }

    public Task<StudentProjectFile?> GetProjectFileAsync(int userId, int sessionId, int assignmentId,
        CancellationToken cancellationToken)
    {
        var assignments = SessionAssignments(userId, sessionId, writable: false);
        return db.StudentProjectSubmissions.AsNoTracking()
            .Where(s => s.AssignmentId == assignmentId && s.StudentId == userId &&
                assignments.Any(a => a.AssignmentId == s.AssignmentId))
            .Select(s => new StudentProjectFile(s.FileName, s.Content))
            .SingleOrDefaultAsync(cancellationToken);
    }

    private static DateTimeOffset Utc(DateTime value) => new(DateTime.SpecifyKind(value, DateTimeKind.Utc));


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
