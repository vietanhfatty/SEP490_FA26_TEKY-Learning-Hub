using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.Interfaces.Backoffice;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Infrastructure.Data;

namespace TekyLearningHub.Infrastructure.Repositories.Backoffice;

/// <summary>
/// Adapter EF cho use case giáo viên. Mọi truy vấn được vật chất hoá tại đây;
/// Application chỉ nhận entity/DTO đã truy vấn xong.
/// </summary>
public sealed class TeacherRepository(ApplicationDbContext db) : ITeacherRepository
{
    public Task<User?> FindUser(int userId, CancellationToken ct) =>
        db.Users.AsNoTracking().SingleOrDefaultAsync(u => u.UserId == userId, ct);

    public Task<User?> FindUserForUpdate(int userId, CancellationToken ct) =>
        db.Users.SingleOrDefaultAsync(u => u.UserId == userId, ct);

    public Task<List<Class>> TeacherClasses(int teacherId, CancellationToken ct) =>
        db.Classes.AsNoTracking()
            .Where(c => c.TeacherId == teacherId && c.Status == "Open")
            .Include(c => c.ClassSessions)
            .Include(c => c.Enrollments)
            .ToListAsync(ct);

    public Task<List<Class>> TeacherClassesIncludingPlanned(int teacherId, CancellationToken ct) =>
        db.Classes.AsNoTracking()
            .Where(c => c.TeacherId == teacherId && (c.Status == "Open" || c.Status == "Planned"))
            .Include(c => c.Enrollments)
            .ToListAsync(ct);

    public Task<int> PendingSubmissionCount(IReadOnlyCollection<int> classIds, CancellationToken ct) =>
        db.Submissions.CountAsync(s => s.Status != "Finalized" && classIds.Contains(s.Assignment.ClassId), ct);

    public Task<List<ClassSession>> WeekSessions(IReadOnlyCollection<int> classIds, DateOnly startOfWeek, DateOnly endOfWeek, CancellationToken ct) =>
        db.ClassSessions.AsNoTracking()
            .Where(s => classIds.Contains(s.ClassId) && s.SessionDate >= startOfWeek && s.SessionDate < endOfWeek)
            .Include(s => s.Class)
                .ThenInclude(c => c.Enrollments)
            .Include(s => s.Room)
            .Include(s => s.AttendanceRecords)
            .OrderBy(s => s.SessionDate)
            .ThenBy(s => s.StartTime)
            .ToListAsync(ct);

    public Task<List<AttendanceRecord>> RecentAbsences(IReadOnlyCollection<int> classIds, int take, CancellationToken ct) =>
        db.AttendanceRecords.AsNoTracking()
            .Where(a => a.Status == "Absent" && classIds.Contains(a.Session.ClassId))
            .Include(a => a.Student).ThenInclude(s => s!.User)
            .Include(a => a.Session).ThenInclude(s => s.Class)
            .OrderByDescending(a => a.MarkedAt)
            .Take(take)
            .ToListAsync(ct);

    public Task<ClassSession?> SessionWithAttendance(int sessionId, CancellationToken ct) =>
        db.ClassSessions.AsNoTracking()
            .Include(s => s.Class)
                .ThenInclude(c => c.Enrollments)
                    .ThenInclude(e => e.Student)
                        .ThenInclude(st => st!.User)
            .Include(s => s.AttendanceRecords)
            .FirstOrDefaultAsync(s => s.SessionId == sessionId, ct);

    public Task<ClassSession?> SessionForUpdate(int sessionId, CancellationToken ct) =>
        db.ClassSessions
            .Include(s => s.Class)
            .Include(s => s.AttendanceRecords)
            .FirstOrDefaultAsync(s => s.SessionId == sessionId, ct);

    public Task<AttendanceRecord?> FindAttendance(int sessionId, int studentId, CancellationToken ct) =>
        db.AttendanceRecords.SingleOrDefaultAsync(a => a.SessionId == sessionId && a.StudentId == studentId, ct);

    public void AddAttendance(AttendanceRecord attendance) => db.AttendanceRecords.Add(attendance);

    public Task<List<MakeupRequest>> TeacherMakeupRequests(int teacherId, CancellationToken ct) =>
        db.MakeupRequests.AsNoTracking()
            .Where(m => m.Attendance.Session.Class.TeacherId == teacherId)
            .Include(m => m.Attendance).ThenInclude(a => a.Student).ThenInclude(s => s!.User)
            .Include(m => m.Attendance).ThenInclude(a => a.Session).ThenInclude(s => s!.Class)
            .Include(m => m.PreferredSession)
            .ToListAsync(ct);

    public Task<MakeupRequest?> FindMakeupRequest(int makeupId, CancellationToken ct) =>
        db.MakeupRequests
            .Include(m => m.Attendance)
                .ThenInclude(a => a.Student)
            .FirstOrDefaultAsync(m => m.MakeupId == makeupId, ct);

    public void AddChallengeMap(ChallengeMap map) => db.ChallengeMaps.Add(map);

    public Task<List<Submission>> GradingQueue(int teacherId, int? classId, CancellationToken ct)
    {
        var query = db.Submissions.AsNoTracking()
            .Where(s => s.IsCurrent && s.Assignment.Class.TeacherId == teacherId);
        if (classId.HasValue) query = query.Where(s => s.Assignment.ClassId == classId.Value);
        return query
            .Include(s => s.Assignment).ThenInclude(a => a.Class)
            .Include(s => s.Student).ThenInclude(st => st!.User)
            .Include(s => s.AstEvaluation)
            .Include(s => s.Grade)
            .ToListAsync(ct);
    }

    public Task<Submission?> SubmissionForGrading(long submissionId, CancellationToken ct) =>
        db.Submissions
            .Include(s => s.Assignment)
            .Include(s => s.AstEvaluation)
            .Include(s => s.Grade)
                .ThenInclude(g => g!.HardwareScores)
            .Include(s => s.Student).ThenInclude(st => st!.User)
            .FirstOrDefaultAsync(s => s.SubmissionId == submissionId, ct);

    public Task<Grade?> FindGrade(long submissionId, CancellationToken ct) =>
        db.Grades.SingleOrDefaultAsync(g => g.SubmissionId == submissionId, ct);

    public void AddGrade(Grade grade) => db.Grades.Add(grade);

    public void AddAstEvaluation(AstEvaluation evaluation) => db.AstEvaluations.Add(evaluation);

    public Task<PortfolioItem?> FindPortfolioBySubmission(long submissionId, CancellationToken ct) =>
        db.PortfolioItems
            .Include(p => p.AchievementCards)
            .FirstOrDefaultAsync(p => p.SubmissionId == submissionId, ct);

    public void AddPortfolio(PortfolioItem portfolio) => db.PortfolioItems.Add(portfolio);

    public Task<Class?> FindClass(int classId, CancellationToken ct) =>
        db.Classes.AsNoTracking()
            .Include(c => c.Enrollments)
            .FirstOrDefaultAsync(c => c.ClassId == classId, ct);

    public Task<List<Grade>> ClassGrades(int classId, CancellationToken ct) =>
        db.Grades.AsNoTracking()
            .Include(g => g.Submission).ThenInclude(s => s.Assignment)
            .Where(g => g.Submission.Assignment.ClassId == classId && g.FinalScore.HasValue)
            .ToListAsync(ct);

    public Task<StudentProfile?> FindStudentProfile(int studentId, CancellationToken ct) =>
        db.StudentProfiles.SingleOrDefaultAsync(s => s.UserId == studentId, ct);

    public async Task<ClassGradebookRow?> GradebookRow(int classId, CancellationToken ct)
    {
        var classroom = await db.Classes.AsNoTracking()
            .Include(c => c.Teacher).ThenInclude(t => t!.User)
            .Include(c => c.Enrollments).ThenInclude(e => e.Student).ThenInclude(s => s!.User)
            .Include(c => c.Assignments).ThenInclude(a => a.Submissions).ThenInclude(s => s.Grade)
            .AsSplitQuery()
            .FirstOrDefaultAsync(c => c.ClassId == classId, ct);
        if (classroom is null) return null;

        var students = classroom.Enrollments
            .Where(e => e.Status == "Active")
            .OrderBy(e => e.Student!.User!.FullName)
            .Select(enrollment =>
            {
                var student = enrollment.Student!;
                var submission = classroom.Assignments
                    .SelectMany(a => a.Submissions)
                    .Where(s => s.StudentId == student.UserId && s.Grade != null)
                    .OrderByDescending(s => s.SubmittedAt)
                    .FirstOrDefault();
                return new ClassGradebookStudentRow
                {
                    StudentCode = student.StudentCode,
                    FullName = student.User!.FullName,
                    AutoAstScore = submission?.Grade?.AutoAstScore,
                    HardwareScore = submission?.Grade?.HardwareScore,
                    FinalScore = submission?.Grade?.FinalScore
                };
            })
            .ToList();

        return new ClassGradebookRow
        {
            ClassCode = classroom.ClassCode,
            ClassName = classroom.Name,
            TeacherName = classroom.Teacher?.User?.FullName ?? "Chưa phân công",
            Students = students
        };
    }
}
