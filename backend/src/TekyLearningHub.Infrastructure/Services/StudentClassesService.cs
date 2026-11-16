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
        .Where(s => s.UserId == userId && s.User.Status == "Active" && s.User.RoleAssignments.Any(r => r.RoleId == 1 && r.RevokedAt == null));

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
        var assignments = await ReadAssignmentsAsync(userId, AccessibleAssignments(userId, sessionId), session, cancellationToken);
        return MapSession(session, true) with { Assignments = assignments.Select(a => a.Assignment).ToList() };
    }

    private IQueryable<Assignment> AccessibleAssignments(int userId, int? sessionId, bool writable = false)
    {
        var enrollment = Enrollments(userId);
        if (writable) enrollment = enrollment.Where(e => e.Status == "Active");
        var query = db.Assignments.AsNoTracking().Where(a =>
            Students(userId).Any() && enrollment.Any(e => e.ClassId == a.ClassId)
            && (a.Status == "Published" || a.Status == "Closed")
            && (a.LessonId == null || (!a.Lesson!.IsDeleted && a.Lesson.CourseId == a.Class.CourseId)));
        if (writable) query = query.Where(a => a.Class.Status != "Cancelled" && a.Class.Status != "Completed");
        if (sessionId is int id)
            query = query.Where(a => a.LessonId != null && db.ClassSessions.Any(s =>
                s.SessionId == id && s.ClassId == a.ClassId && s.LessonId == a.LessonId
                && (!writable || s.Status != "Cancelled")));
        return query;
    }

    public async Task<IReadOnlyList<StudentAssignmentItemDto>?> GetAssignmentsAsync(int userId, CancellationToken cancellationToken)
    {
        if (!await Students(userId).AnyAsync(cancellationToken)) return null;
        return await ReadAssignmentsAsync(userId, AccessibleAssignments(userId, null), null, cancellationToken);
    }

    public async Task<StudentAssignmentDetailDto?> GetAssignmentAsync(int userId, int assignmentId, CancellationToken cancellationToken)
    {
        var items = await ReadAssignmentsAsync(userId,
            AccessibleAssignments(userId, null).Where(a => a.AssignmentId == assignmentId), null, cancellationToken);
        if (items.Count == 0) return null;
        var accessible = AccessibleAssignments(userId, null);
        var versions = await db.StudentProjectVersions.AsNoTracking()
            .Where(v => v.AssignmentId == assignmentId && v.StudentId == userId &&
                accessible.Any(a => a.AssignmentId == v.AssignmentId))
            .OrderByDescending(v => v.AttemptNo)
            .Select(v => new { v.FileName, v.SubmittedAt, v.AttemptNo, v.ReviewStatus, v.Feedback, v.ReviewedAt })
            .ToListAsync(cancellationToken);
        return new(items[0], versions.Select(v => new StudentProjectDto(v.FileName, Utc(v.SubmittedAt),
            v.AttemptNo, v.ReviewStatus, v.Feedback, v.ReviewedAt is { } reviewed ? Utc(reviewed) : null)).ToList());
    }

    private async Task<IReadOnlyList<StudentAssignmentItemDto>> ReadAssignmentsAsync(
        int userId, IQueryable<Assignment> query, ClassSession? session, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var active = Enrollments(userId).Where(e => e.Status == "Active");
        var rows = await (
            from a in query
            join file in db.StudentProjectSubmissions.AsNoTracking().Where(s => s.StudentId == userId)
                on a.AssignmentId equals file.AssignmentId into files
            from file in files.DefaultIfEmpty()
            join code in db.Submissions.AsNoTracking().Where(s => s.StudentId == userId && s.IsCurrent)
                on a.AssignmentId equals code.AssignmentId into codes
            from code in codes.DefaultIfEmpty()
            orderby a.DueAt == null, a.DueAt, a.AssignmentId
            select new
            {
                a.AssignmentId, a.Title, a.Instructions, a.DueAt, a.Status, a.ClassId, a.LessonId, a.MaxScore,
                a.Class.ClassCode, ClassName = a.Class.Name, a.Class.CourseId, CourseName = a.Class.Course.Name,
                LessonTitle = a.Lesson == null ? null : a.Lesson!.Title,
                Active = a.Class.Status != "Cancelled" && a.Class.Status != "Completed" && active.Any(e => e.ClassId == a.ClassId),
                SessionId = db.ClassSessions.Where(s => s.ClassId == a.ClassId && a.LessonId != null &&
                    s.LessonId == a.LessonId && s.Status != "Cancelled")
                    .OrderBy(s => s.SessionDate).ThenBy(s => s.StartTime).ThenBy(s => s.SessionId)
                    .Select(s => (int?)s.SessionId).FirstOrDefault(),
                FileName = file == null ? null : file.FileName,
                FileSubmittedAt = file == null ? (DateTime?)null : file.SubmittedAt,
                FileAttempt = file == null ? 0 : file.AttemptNo,
                ReviewStatus = file == null ? null : file.ReviewStatus,
                Feedback = file == null ? null : file.Feedback,
                ReviewedAt = file == null ? (DateTime?)null : file.ReviewedAt,
                CodeSubmittedAt = code == null ? (DateTime?)null : code.SubmittedAt,
                CodeAttempt = code == null ? 0 : code.AttemptNo,
                IsFinalized = code != null && code.Grade != null && code.Grade.IsFinalized,
                Score = code != null && code.Grade != null && code.Grade.IsFinalized ? code.Grade.FinalScore : null,
                Remark = code != null && code.Grade != null && code.Grade.IsFinalized ? code.Grade.RemarkText : null
            }).ToListAsync(cancellationToken);

        return rows.Select(a => new StudentAssignmentItemDto(
            new(a.AssignmentId, a.Title, a.Instructions, a.DueAt is { } dueAt ? Utc(dueAt) : null,
                session?.Status != "Cancelled" && a.Active && a.Status == "Published"
                    && (a.DueAt is null || a.DueAt > now) && a.CodeSubmittedAt is null
                    && (a.FileSubmittedAt is null || a.ReviewStatus == "NeedsRevision"),
                a.FileSubmittedAt is { } submittedAt ? new(a.FileName!, Utc(submittedAt), a.FileAttempt,
                    a.ReviewStatus!, a.Feedback, a.ReviewedAt is { } reviewed ? Utc(reviewed) : null) : null,
                a.CodeSubmittedAt is { } codedAt ? new(a.CodeAttempt, Utc(codedAt), a.IsFinalized,
                    a.Score, a.MaxScore, a.Remark) : null),
            a.ClassId, a.ClassCode, a.ClassName, a.CourseId, a.CourseName, a.LessonId, a.LessonTitle,
            session?.SessionId ?? a.SessionId)).ToList();
    }

    public async Task<IReadOnlyList<StudentProjectItemDto>?> GetProjectsAsync(int userId, CancellationToken cancellationToken)
    {
        if (!await Students(userId).AnyAsync(cancellationToken)) return null;
        var assignments = AccessibleAssignments(userId, null);
        var files = await (
            from file in db.StudentProjectSubmissions.AsNoTracking()
            join a in assignments on file.AssignmentId equals a.AssignmentId
            where file.StudentId == userId
            select new
            {
                a.AssignmentId, a.Title, a.Class.ClassCode, CourseName = a.Class.Course.Name,
                file.SubmittedAt, file.AttemptNo, file.ReviewStatus, file.FileName, file.Feedback
            }).ToListAsync(cancellationToken);
        var portfolio = await (
            from item in db.PortfolioItems.AsNoTracking()
            join a in assignments on item.Submission.AssignmentId equals a.AssignmentId
            where item.StudentId == userId && item.Submission.StudentId == userId && item.Submission.IsCurrent
            let grade = item.Submission.Grade
            select new
            {
                a.AssignmentId, item.Title, a.Class.ClassCode, CourseName = a.Class.Course.Name,
                item.Submission.SubmittedAt, item.Submission.AttemptNo, item.Summary, a.MaxScore,
                Finalized = grade != null && grade.IsFinalized,
                Score = grade != null && grade.IsFinalized ? grade.FinalScore : null,
                Feedback = grade != null && grade.IsFinalized ? grade.RemarkText : null
            }).ToListAsync(cancellationToken);

        return files.Select(file => new StudentProjectItemDto(file.AssignmentId, file.Title, file.ClassCode, file.CourseName,
                Utc(file.SubmittedAt), file.AttemptNo, file.ReviewStatus, file.FileName, file.Feedback))
            .Concat(portfolio.Select(item => new StudentProjectItemDto(item.AssignmentId, item.Title, item.ClassCode, item.CourseName,
                Utc(item.SubmittedAt), item.AttemptNo, item.Finalized ? "Graded" : "Pending", null,
                item.Feedback, item.Summary, item.Score, item.MaxScore)))
            .OrderByDescending(project => project.SubmittedAt).ThenBy(project => project.AssignmentId).ToList();
    }

    public async Task<StudentProjectOutcome> SubmitProjectAsync(int userId, int? sessionId, int assignmentId,
        string fileName, byte[] content, CancellationToken cancellationToken)
    {
        var strategy = db.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync<StudentProjectOutcome>(async cancellation =>
        {
            await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellation);
            var assignment = await AccessibleAssignments(userId, sessionId, writable: true)
                .SingleOrDefaultAsync(a => a.AssignmentId == assignmentId, cancellation);
            if (assignment is null) return new StudentProjectOutcome(StudentProjectResult.NotFound);

            var now = DateTime.UtcNow;
            if (assignment.Status != "Published" || assignment.DueAt <= now)
                return new StudentProjectOutcome(StudentProjectResult.Closed);

            if (await db.Submissions.AnyAsync(s => s.AssignmentId == assignmentId && s.StudentId == userId && s.IsCurrent, cancellation))
                return new StudentProjectOutcome(StudentProjectResult.AlreadySubmitted);

            var previous = await db.StudentProjectSubmissions.SingleOrDefaultAsync(
                s => s.AssignmentId == assignmentId && s.StudentId == userId, cancellation);
            if (previous != null && previous.ReviewStatus != "NeedsRevision")
                return new StudentProjectOutcome(StudentProjectResult.AlreadySubmitted);
            if (previous != null) {
                db.StudentProjectVersions.Add(new StudentProjectVersion {
                    AssignmentId = assignmentId, StudentId = userId, AttemptNo = previous.AttemptNo,
                    FileName = previous.FileName, Content = previous.Content, SubmittedAt = previous.SubmittedAt,
                    ReviewStatus = previous.ReviewStatus, Feedback = previous.Feedback,
                    ReviewedBy = previous.ReviewedBy, ReviewedAt = previous.ReviewedAt
                });
                previous.AttemptNo++;
                previous.FileName = fileName; previous.Content = content; previous.SubmittedAt = now;
                previous.ReviewStatus = "Pending"; previous.Feedback = null; previous.ReviewedBy = null; previous.ReviewedAt = null;
                await db.SaveChangesAsync(cancellation);
                await transaction.CommitAsync(cancellation);
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

    public Task<StudentProjectFile?> GetProjectFileAsync(int userId, int? sessionId, int assignmentId,
        CancellationToken cancellationToken)
    {
        var assignments = AccessibleAssignments(userId, sessionId, writable: false);
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
