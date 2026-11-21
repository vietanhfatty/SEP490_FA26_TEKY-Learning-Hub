using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.DTOs.Portal;
using TekyLearningHub.Application.Interfaces.Portal;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Infrastructure.Data;

namespace TekyLearningHub.Infrastructure.Repositories.Portal;

public sealed class StudentClassesRepository(ApplicationDbContext db) : IStudentClassesRepository
{
    private IQueryable<StudentProfile> Students(int userId) => db.StudentProfiles.AsNoTracking()
        .Where(s => s.UserId == userId && s.User.Status == "Active" && s.User.RoleAssignments.Any(r => r.RoleId == 1 && r.RevokedAt == null));

    private IQueryable<Enrollment> Enrollments(int userId) => db.Enrollments.AsNoTracking()
        .Where(e => e.StudentId == userId && (e.Status == "Active" || e.Status == "Completed"));

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


    public async Task<StudentIdentity?> Student(int userId, CancellationToken cancellationToken) => await Students(userId).Select(s => new StudentIdentity(s.UserId, s.StudentCode, s.User.FullName))
               .SingleOrDefaultAsync(cancellationToken);
    public Task<bool> IsStudent(int userId, CancellationToken cancellationToken) => Students(userId).AnyAsync(cancellationToken);
    public async Task<List<Enrollment>> EnrolledClasses(int userId, CancellationToken cancellationToken) => await Enrollments(userId)
               .Include(e => e.Class.Course)
               .Include(e => e.Class.Teacher!).ThenInclude(t => t.User)
               .Include(e => e.Class.ClassSessions).ThenInclude(s => s.Lesson)
               .Include(e => e.Class.ClassSessions).ThenInclude(s => s.Room)
               .AsSplitQuery().OrderBy(e => e.Class.ClassCode).ToListAsync(cancellationToken);
    public async Task<List<ClassSession>> MakeupSessions(int userId, CancellationToken cancellationToken) =>
        await db.ClassSessions.AsNoTracking().Where(s => db.MakeupRequests.Any(m =>
                m.Status == "Approved" && m.PreferredSessionId == s.SessionId && m.Attendance.StudentId == userId))
            .Include(s => s.Class.Course)
            .Include(s => s.Class.Teacher!).ThenInclude(t => t.User)
            .Include(s => s.Lesson)
            .Include(s => s.Room)
            .OrderBy(s => s.SessionDate).ThenBy(s => s.StartTime)
            .ToListAsync(cancellationToken);
    public async Task<ClassSession?> Session(int userId, int sessionId, CancellationToken cancellationToken) => await db.ClassSessions.AsNoTracking()
               .Where(s => s.SessionId == sessionId && (Enrollments(userId).Any(e => e.ClassId == s.ClassId)
                   || db.MakeupRequests.Any(m => m.Status == "Approved" && m.PreferredSessionId == s.SessionId
                       && m.Attendance.StudentId == userId)))
               .Include(s => s.Class.Course)
               .Include(s => s.Class.Teacher!).ThenInclude(t => t.User)
               .Include(s => s.Lesson!).ThenInclude(l => l.LessonMaterials)
               .Include(s => s.Room).SingleOrDefaultAsync(cancellationToken);
    public Task<bool> ActiveEnrollment(int userId, int classId, CancellationToken cancellationToken) => Enrollments(userId).AnyAsync(e => e.ClassId == classId && e.Status == "Active", cancellationToken);
    public async Task<List<StudentAssignmentRow>> AssignmentRows(int userId,int? sessionId,int? assignmentId,CancellationToken cancellationToken) {
        var query=AccessibleAssignments(userId,sessionId);
        if(assignmentId.HasValue) query=query.Where(a=>a.AssignmentId==assignmentId.Value);
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
            select new StudentAssignmentRow
            {
                AssignmentId = a.AssignmentId, Title = a.Title, Instructions = a.Instructions, DueAt = a.DueAt, Status = a.Status, ClassId = a.ClassId, LessonId = a.LessonId, MaxScore = a.MaxScore,
                ClassCode = a.Class.ClassCode, ClassName = a.Class.Name, CourseId = a.Class.CourseId, CourseName = a.Class.Course.Name,
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

        return rows;
    }
    public Task<Assignment?> WritableAssignment(int userId,int? sessionId,int assignmentId,CancellationToken ct)=>AccessibleAssignments(userId,sessionId,true).SingleOrDefaultAsync(a=>a.AssignmentId==assignmentId,ct);
    public Task<bool> HasCodeSubmission(int userId,int assignmentId,CancellationToken ct)=>db.Submissions.AnyAsync(s=>s.AssignmentId==assignmentId && s.StudentId==userId && s.IsCurrent,ct);
    public Task<StudentProjectSubmission?> Submission(int userId, int assignmentId, CancellationToken cancellationToken) => db.StudentProjectSubmissions.SingleOrDefaultAsync(s => s.AssignmentId == assignmentId && s.StudentId == userId, cancellationToken);
    public void AddVersion(StudentProjectVersion entity) => db.StudentProjectVersions.Add(entity);
    public void AddSubmission(StudentProjectSubmission entity) => db.StudentProjectSubmissions.Add(entity);
    public void Detach(StudentProjectSubmission entity) => db.Entry(entity).State = EntityState.Detached;
    public Task<StudentProjectFile?> File(int userId, int? sessionId, int assignmentId, CancellationToken cancellationToken)
    {
        var assignments = AccessibleAssignments(userId, sessionId);
        return db.StudentProjectSubmissions.AsNoTracking()
            .Where(s => s.AssignmentId == assignmentId && s.StudentId == userId &&
                assignments.Any(a => a.AssignmentId == s.AssignmentId))
            .Select(s => new StudentProjectFile(s.FileName, s.Content))
            .SingleOrDefaultAsync(cancellationToken);
    }
 public async Task<List<StudentProjectVersion>> Versions(int userId,int assignmentId,CancellationToken cancellationToken) {
        var accessible = AccessibleAssignments(userId, null);
        var versions = await db.StudentProjectVersions.AsNoTracking()
            .Where(v => v.AssignmentId == assignmentId && v.StudentId == userId &&
                accessible.Any(a => a.AssignmentId == v.AssignmentId))
            .OrderByDescending(v => v.AttemptNo)
            .ToListAsync(cancellationToken);
return versions;
 }
 public async Task<ProjectLibraryData> Projects(int userId,CancellationToken cancellationToken) {
        var assignments = AccessibleAssignments(userId, null);
        var files = await (
            from file in db.StudentProjectSubmissions.AsNoTracking()
            join a in assignments on file.AssignmentId equals a.AssignmentId
            where file.StudentId == userId
            select new FileProjectRow(a.AssignmentId,a.Title,a.Class.ClassCode,a.Class.Course.Name,file.SubmittedAt,file.AttemptNo,file.ReviewStatus,file.FileName,file.Feedback)).ToListAsync(cancellationToken);
        var portfolio = await (
            from item in db.PortfolioItems.AsNoTracking()
            join a in assignments on item.Submission.AssignmentId equals a.AssignmentId
            where item.StudentId == userId && item.Submission.StudentId == userId && item.Submission.IsCurrent
            let grade = item.Submission.Grade
            select new PortfolioProjectRow(a.AssignmentId,item.Title,a.Class.ClassCode,a.Class.Course.Name,item.Submission.SubmittedAt,item.Submission.AttemptNo,item.Summary,a.MaxScore,grade != null && grade.IsFinalized,grade != null && grade.IsFinalized ? grade.FinalScore : null,grade != null && grade.IsFinalized ? grade.RemarkText : null)).ToListAsync(cancellationToken);
return new(files,portfolio);
 }
}
