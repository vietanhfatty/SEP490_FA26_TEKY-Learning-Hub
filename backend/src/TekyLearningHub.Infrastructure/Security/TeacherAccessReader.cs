using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.Interfaces.Backoffice;
using TekyLearningHub.Infrastructure.Data;

namespace TekyLearningHub.Infrastructure.Security;

public sealed class TeacherAccessReader(ApplicationDbContext db) : ITeacherAccessReader
{
    public async Task<bool> CanAccess(int teacherId, string resource, long id, CancellationToken ct)
    {
        var grants = db.UserRoles.WithEffectiveSources();
        var classes = db.Classes.Where(c => c.TeacherId == teacherId && grants.Any(grant => grant.UserId == teacherId &&
            grant.RoleId == 2 && grant.User.Status == "Active" && !grant.User.ActivationPending &&
            (grant.ScopeType == "GLOBAL" || c.Course.DepartmentId != null && grant.DepartmentId == c.Course.DepartmentId)));
        return resource switch
        {
            "class" => await classes.AnyAsync(c => c.ClassId == id, ct),
            "session" => await db.ClassSessions.AnyAsync(s => s.SessionId == id && classes.Any(c => c.ClassId == s.ClassId), ct),
            "submission" => await db.Submissions.AnyAsync(s => s.SubmissionId == id && classes.Any(c => c.ClassId == s.Assignment.ClassId), ct),
            "makeup" => await db.MakeupRequests.AnyAsync(m => m.MakeupId == id && classes.Any(c => c.ClassId == m.Attendance.Session.ClassId) &&
                (m.PreferredSessionId == null || db.ClassSessions.Any(s => s.SessionId == m.PreferredSessionId && classes.Any(c => c.ClassId == s.ClassId))), ct),
            _ => false
        };
    }
    public Task<bool> Enrolled(int sessionId, int studentId, CancellationToken ct) => db.ClassSessions.AnyAsync(s => s.SessionId == sessionId &&
        db.Enrollments.Any(e => e.ClassId == s.ClassId && e.StudentId == studentId && e.Status == "Active"), ct);
}
