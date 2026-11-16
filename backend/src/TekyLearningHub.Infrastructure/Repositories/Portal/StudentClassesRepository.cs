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


    public async Task<StudentIdentity?> Student(int userId, CancellationToken cancellationToken) => await Students(userId).Select(s => new StudentIdentity(s.UserId, s.StudentCode, s.User.FullName))
               .SingleOrDefaultAsync(cancellationToken);
    public Task<bool> IsStudent(int userId, CancellationToken cancellationToken) => Students(userId).AnyAsync(cancellationToken);
    public async Task<List<Enrollment>> EnrolledClasses(int userId, CancellationToken cancellationToken) => await Enrollments(userId)
               .Include(e => e.Class.Course)
               .Include(e => e.Class.Teacher!).ThenInclude(t => t.User)
               .Include(e => e.Class.ClassSessions).ThenInclude(s => s.Lesson)
               .Include(e => e.Class.ClassSessions).ThenInclude(s => s.Room)
               .AsSplitQuery().OrderBy(e => e.Class.ClassCode).ToListAsync(cancellationToken);
    public async Task<ClassSession?> Session(int userId, int sessionId, CancellationToken cancellationToken) => await db.ClassSessions.AsNoTracking()
               .Where(s => s.SessionId == sessionId && Enrollments(userId).Any(e => e.ClassId == s.ClassId))
               .Include(s => s.Class.Course)
               .Include(s => s.Class.Teacher!).ThenInclude(t => t.User)
               .Include(s => s.Lesson!).ThenInclude(l => l.LessonMaterials)
               .Include(s => s.Room).SingleOrDefaultAsync(cancellationToken);
    public Task<bool> ActiveEnrollment(int userId, int classId, CancellationToken cancellationToken) => Enrollments(userId).AnyAsync(e => e.ClassId == classId && e.Status == "Active", cancellationToken);
    public async Task<List<AssignmentWorkData>> Assignments(int userId, int sessionId, CancellationToken cancellationToken) => await (
               from assignment in SessionAssignments(userId, sessionId, writable: false)
               join submission in db.StudentProjectSubmissions.AsNoTracking().Where(s => s.StudentId == userId)
                   on assignment.AssignmentId equals submission.AssignmentId into submissions
               from submission in submissions.DefaultIfEmpty()
               orderby assignment.AssignmentId
               select new AssignmentWorkData(
                   assignment.AssignmentId, assignment.Title, assignment.Instructions, assignment.DueAt, assignment.Status,
                   submission == null ? null : submission.FileName, submission == null ? (DateTime?)null : submission.SubmittedAt,
                   submission == null ? 0 : submission.AttemptNo, submission == null ? null : submission.ReviewStatus,
                   submission == null ? null : submission.Feedback, submission == null ? (DateTime?)null : submission.ReviewedAt)).ToListAsync(cancellationToken);
    public Task<Assignment?> WritableAssignment(int userId, int sessionId, int assignmentId, CancellationToken cancellationToken) => SessionAssignments(userId, sessionId, true).SingleOrDefaultAsync(a => a.AssignmentId == assignmentId, cancellationToken);
    public Task<StudentProjectSubmission?> Submission(int userId, int assignmentId, CancellationToken cancellationToken) => db.StudentProjectSubmissions.SingleOrDefaultAsync(s => s.AssignmentId == assignmentId && s.StudentId == userId, cancellationToken);
    public void AddVersion(StudentProjectVersion entity) => db.StudentProjectVersions.Add(entity);
    public void AddSubmission(StudentProjectSubmission entity) => db.StudentProjectSubmissions.Add(entity);
    public void Detach(StudentProjectSubmission entity) => db.Entry(entity).State = EntityState.Detached;
    public Task<StudentProjectFile?> File(int userId, int sessionId, int assignmentId, CancellationToken cancellationToken)
    {
        var assignments = SessionAssignments(userId, sessionId, writable: false);
        return db.StudentProjectSubmissions.AsNoTracking()
            .Where(s => s.AssignmentId == assignmentId && s.StudentId == userId &&
                assignments.Any(a => a.AssignmentId == s.AssignmentId))
            .Select(s => new StudentProjectFile(s.FileName, s.Content))
            .SingleOrDefaultAsync(cancellationToken);
    }
}
