using TekyLearningHub.Application.DTOs.Portal;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Application.Interfaces.Portal;
using TekyLearningHub.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Infrastructure.Data;
namespace TekyLearningHub.Infrastructure.Repositories.Portal;
public sealed class StudentAssessmentsRepository(ApplicationDbContext db) : IStudentAssessmentsRepository {
    private IQueryable<Enrollment> Enrollments(int studentId) => db.Enrollments.Where(e =>
        e.StudentId == studentId && (e.Status == "Active" || e.Status == "Completed")
        && e.Student.User.Status == "Active"
        && e.Student.User.RoleAssignments.Any(r => r.RoleId == 1 && r.RevokedAt == null));

    private IQueryable<AssessmentPaper> Papers(int studentId) =>
        from a in db.Assessments.AsNoTracking()
        where a.IsPublished && Enrollments(studentId).Any(e => e.ClassId == a.ClassId)
        join attempt in db.AssessmentAttempts.AsNoTracking().Where(x => x.StudentId == studentId)
            on a.AssessmentId equals attempt.AssessmentId into attempts
        from attempt in attempts.DefaultIfEmpty()
        select new AssessmentPaper {
            Assessment = a, ClassCode = a.Class.ClassCode, CourseName = a.Class.Course.Name,
            Active = a.Class.Status != "Completed" && a.Class.Status != "Cancelled"
                && Enrollments(studentId).Any(e => e.ClassId == a.ClassId && e.Status == "Active"),
            Attempt = attempt
        };


 public async Task<List<AssessmentPaper>> List(int studentId,CancellationToken ct) => await Papers(studentId).OrderBy(p => p.Assessment.ClosesAt == null)
            .ThenBy(p => p.Assessment.ClosesAt).ThenBy(p => p.Assessment.AssessmentId).ToListAsync(ct);
 public Task<AssessmentPaper?> Find(int studentId,int id,CancellationToken ct) => Papers(studentId).Where(p=>p.Assessment.AssessmentId==id).SingleOrDefaultAsync(ct);
 public void Add(AssessmentAttempt attempt)=>db.AssessmentAttempts.Add(attempt);
 public void Detach(AssessmentAttempt attempt)=>db.Entry(attempt).State=EntityState.Detached;
 public async Task<int> Submit(int studentId,int id,DateTime submitted,int correct,string json,CancellationToken ct) {
        var allowed = db.Assessments.Where(a => a.AssessmentId == id && a.IsPublished
            && (a.OpensAt == null || a.OpensAt <= submitted) && (a.ClosesAt == null || a.ClosesAt > submitted)
            && a.Class.Status != "Completed" && a.Class.Status != "Cancelled"
            && Enrollments(studentId).Any(e => e.ClassId == a.ClassId && e.Status == "Active"));
        return await db.AssessmentAttempts.Where(a => a.AssessmentId == id && a.StudentId == studentId
                && a.SubmittedAt == null && allowed.Any())
            .ExecuteUpdateAsync(s => s.SetProperty(a => a.SubmittedAt, submitted)
                .SetProperty(a => a.CorrectCount, correct).SetProperty(a => a.AnswersJson, json), ct);

 }
}