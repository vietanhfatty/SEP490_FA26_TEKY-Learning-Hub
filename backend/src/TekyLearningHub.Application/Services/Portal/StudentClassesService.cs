using TekyLearningHub.Application.DTOs.Portal;
using TekyLearningHub.Application.Interfaces.Portal;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.Services.Portal;

public class StudentClassesService(IStudentClassesRepository db, IUnitOfWork unit) : IStudentClassesService
{
    public async Task<StudentClassesDto?> GetClassesAsync(int userId, CancellationToken cancellationToken)
    {
        var student = await db.Student(userId, cancellationToken);
        if (student is null) return null;

        var enrollments = await db.EnrolledClasses(userId, cancellationToken);

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
        if (!await db.IsStudent(userId, cancellationToken)) return null;
        var session = await db.Session(userId, sessionId, cancellationToken);
        if (session is null) return null;
        var assignments = await GetAssignmentsAsync(userId, session, cancellationToken);
        return MapSession(session, true) with { Assignments = assignments };
    }

    private async Task<IReadOnlyList<StudentAssignmentDto>> GetAssignmentsAsync(
        int userId, ClassSession session, CancellationToken cancellationToken)
    {
        if (session.Lesson is not { IsDeleted: false }) return [];

        var now = DateTime.UtcNow;
        var active = session.Status != "Cancelled" && await db.ActiveEnrollment(userId, session.ClassId, cancellationToken);
        var assignments = await db.Assignments(userId, session.SessionId, cancellationToken);

        return assignments.Select(a => new StudentAssignmentDto(a.AssignmentId, a.Title, a.Instructions,
            a.DueAt is { } dueAt ? Utc(dueAt) : null,
            active && a.Status == "Published" && (a.DueAt is null || a.DueAt > now) && (a.SubmittedAt is null || a.ReviewStatus == "NeedsRevision"),
            a.SubmittedAt is { } submittedAt ? new StudentProjectDto(a.FileName!, Utc(submittedAt), a.AttemptNo, a.ReviewStatus!, a.Feedback, a.ReviewedAt is { } reviewed ? Utc(reviewed) : null) : null)).ToList();
    }

    public async Task<StudentProjectOutcome> SubmitProjectAsync(int userId, int sessionId, int assignmentId,
        string fileName, byte[] content, CancellationToken cancellationToken)
    {
        return await unit.ExecuteAsync(TransactionKind.ProjectSubmission, async () =>
        {
            var cancellation = cancellationToken;
            var assignment = await db.WritableAssignment(userId, sessionId, assignmentId, cancellation);
            if (assignment is null) return new StudentProjectOutcome(StudentProjectResult.NotFound);

            var now = DateTime.UtcNow;
            if (assignment.Status != "Published" || assignment.DueAt <= now)
                return new StudentProjectOutcome(StudentProjectResult.Closed);

            var previous = await db.Submission(userId, assignmentId, cancellation);
            if (previous != null && previous.ReviewStatus != "NeedsRevision")
                return new StudentProjectOutcome(StudentProjectResult.AlreadySubmitted);
            if (previous != null)
            {
                db.AddVersion(new StudentProjectVersion
                {
                    AssignmentId = assignmentId,
                    StudentId = userId,
                    AttemptNo = previous.AttemptNo,
                    FileName = previous.FileName,
                    Content = previous.Content,
                    SubmittedAt = previous.SubmittedAt,
                    ReviewStatus = previous.ReviewStatus,
                    Feedback = previous.Feedback,
                    ReviewedBy = previous.ReviewedBy,
                    ReviewedAt = previous.ReviewedAt
                });
                previous.AttemptNo++;
                previous.FileName = fileName; previous.Content = content; previous.SubmittedAt = now;
                previous.ReviewStatus = "Pending"; previous.Feedback = null; previous.ReviewedBy = null; previous.ReviewedAt = null;
                await unit.SaveChangesAsync(cancellation);
                return new StudentProjectOutcome(StudentProjectResult.Submitted, new StudentProjectDto(fileName, Utc(now), previous.AttemptNo));
            }
            var submission = new StudentProjectSubmission
            {
                AssignmentId = assignmentId,
                StudentId = userId,
                FileName = fileName,
                Content = content,
                SubmittedAt = now
            };
            db.AddSubmission(submission);
            try
            {
                await unit.SaveChangesAsync(cancellation);
                return new StudentProjectOutcome(StudentProjectResult.Submitted, new StudentProjectDto(fileName, Utc(now)));
            }
            catch (PersistenceConflictException ex) when (ex.Duplicate)
            {
                return new StudentProjectOutcome(StudentProjectResult.AlreadySubmitted);
            }
            finally
            {
                db.Detach(submission);
            }
        }, cancellationToken);
    }

    public Task<StudentProjectFile?> GetProjectFileAsync(int userId, int sessionId, int assignmentId,
        CancellationToken cancellationToken)
    {
        return db.File(userId, sessionId, assignmentId, cancellationToken);
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
