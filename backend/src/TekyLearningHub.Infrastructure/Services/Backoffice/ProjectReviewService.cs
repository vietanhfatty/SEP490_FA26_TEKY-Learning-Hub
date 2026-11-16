using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Infrastructure.Data;

namespace TekyLearningHub.Infrastructure.Services.Backoffice;

public sealed class ProjectReviewService(ApplicationDbContext db)
{
    private IQueryable<Assignment> TeacherAssignments(int teacherId) => db.Assignments.Where(a => a.Class.TeacherId == teacherId
        && a.Class.Teacher!.User.Status == "Active" && a.Class.Teacher.User.RoleAssignments.Any(r => r.RoleId == 2 && r.RevokedAt == null));
    public async Task<object> Reviews(int teacherId,CancellationToken ct) => await (
        from s in db.StudentProjectSubmissions.AsNoTracking()
        join a in TeacherAssignments(teacherId) on s.AssignmentId equals a.AssignmentId
        join u in db.Users on s.StudentId equals u.UserId
        orderby s.ReviewStatus, s.SubmittedAt
        select new {s.AssignmentId,s.StudentId,s.AttemptNo,s.FileName,s.SubmittedAt,s.ReviewStatus,s.Feedback,
            StudentName=u.FullName,AssignmentTitle=a.Title,a.Class.ClassCode}).ToListAsync(ct);
    public async Task<StudentProjectSubmission?> ReviewFile(int teacherId,int assignmentId,int studentId,CancellationToken ct) =>
        await db.StudentProjectSubmissions.AsNoTracking().SingleOrDefaultAsync(s => s.AssignmentId == assignmentId && s.StudentId == studentId &&
            TeacherAssignments(teacherId).Any(a => a.AssignmentId == s.AssignmentId),ct);
    public async Task<bool> SubmitReview(int teacherId,int assignmentId,int studentId,int attemptNo,string status,string feedback,CancellationToken ct) {
        // One atomic conditional update: a stale teacher tab cannot grade a newer attempt.
        return await db.StudentProjectSubmissions.Where(s => s.AssignmentId == assignmentId && s.StudentId == studentId &&
            s.AttemptNo == attemptNo && s.ReviewStatus == "Pending" && TeacherAssignments(teacherId).Any(a => a.AssignmentId == s.AssignmentId))
            .ExecuteUpdateAsync(set => set.SetProperty(s => s.ReviewStatus,status).SetProperty(s => s.Feedback,feedback)
                .SetProperty(s => s.ReviewedBy,teacherId).SetProperty(s => s.ReviewedAt,DateTime.UtcNow),ct) == 1;
    }
}
