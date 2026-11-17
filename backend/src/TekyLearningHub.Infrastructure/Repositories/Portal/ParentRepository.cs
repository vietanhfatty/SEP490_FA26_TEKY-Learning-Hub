using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.Interfaces.Portal;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Infrastructure.Data;

namespace TekyLearningHub.Infrastructure.Repositories.Portal;

/// <summary>
/// Adapter EF cho use case phụ huynh. Mọi truy vấn được vật chất hoá tại đây;
/// Application chỉ nhận entity/DTO đã truy vấn xong.
/// </summary>
public sealed class ParentRepository(ApplicationDbContext db) : IParentRepository
{
    public Task<User?> FindUser(int userId, CancellationToken ct) =>
        db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == userId, ct);

    public Task<List<ParentStudentLink>> ActiveChildren(int parentId, CancellationToken ct) =>
        db.ParentStudentLinks.AsNoTracking()
            .Where(l => l.ParentId == parentId && l.Status == "Active")
            .Include(l => l.Student).ThenInclude(s => s!.User)
            .Include(l => l.Student).ThenInclude(s => s!.Enrollments).ThenInclude(e => e.Class).ThenInclude(c => c.ClassSessions).ThenInclude(ses => ses.Room)
            .AsSplitQuery()
            .ToListAsync(ct);

    public Task<AttendanceRecord?> AttendanceOn(int studentId, DateOnly date, CancellationToken ct) =>
        db.AttendanceRecords.AsNoTracking()
            .Include(a => a.Session)
            .Where(a => a.StudentId == studentId && a.Session.SessionDate == date)
            .FirstOrDefaultAsync(ct);

    public Task<bool> HasActiveLink(int parentId, int studentId, CancellationToken ct) =>
        db.ParentStudentLinks.AnyAsync(r => r.ParentId == parentId && r.StudentId == studentId && r.Status == "Active", ct);

    public Task<List<AttendanceRecord>> StudentAttendances(int studentId, CancellationToken ct) =>
        db.AttendanceRecords.AsNoTracking()
            .Where(a => a.StudentId == studentId)
            .Include(a => a.Session).ThenInclude(s => s!.Class)
            .OrderByDescending(a => a.Session!.SessionDate)
            .ToListAsync(ct);

    public Task<List<Grade>> StudentGrades(int studentId, CancellationToken ct) =>
        db.Grades.AsNoTracking()
            .Include(g => g.Submission).ThenInclude(s => s!.Assignment)
            .Where(g => g.Submission!.StudentId == studentId)
            .ToListAsync(ct);

    public void AddCheerMessage(CheerMessage message) => db.CheerMessages.Add(message);

    public Task<List<PortfolioItem>> StudentPortfolios(int studentId, CancellationToken ct) =>
        db.PortfolioItems.AsNoTracking()
            .Where(p => p.StudentId == studentId)
            .Include(p => p.AchievementCards)
            .OrderByDescending(p => p.CompletedAt)
            .ToListAsync(ct);

    public Task<AchievementCard?> PublicAchievementCard(Guid qrToken, CancellationToken ct) =>
        db.AchievementCards
            .Include(ac => ac.Item)
            .FirstOrDefaultAsync(ac => ac.QrToken == qrToken && ac.IsPublic, ct);

    public Task<List<CheerSticker>> CheerStickers(CancellationToken ct) =>
        db.CheerStickers.AsNoTracking().OrderBy(s => s.StickerId).ToListAsync(ct);

    public Task<int?> ActiveClassId(int studentId, CancellationToken ct) =>
        db.Enrollments
            .Where(e => e.StudentId == studentId && e.Status == "Active")
            .Select(e => (int?)e.ClassId)
            .FirstOrDefaultAsync(ct);

    public Task<string?> StickerCode(int stickerId, CancellationToken ct) =>
        db.CheerStickers.Where(s => s.StickerId == stickerId).Select(s => s.Code).FirstOrDefaultAsync(ct);

    public Task<Class?> FindClass(int classId, CancellationToken ct) =>
        db.Classes.AsNoTracking().FirstOrDefaultAsync(c => c.ClassId == classId, ct);

    public Task<LeaderboardCycle?> LatestLeaderboardCycle(CancellationToken ct) =>
        db.LeaderboardCycles.AsNoTracking().OrderByDescending(c => c.WeekStart).FirstOrDefaultAsync(ct);

    public Task<List<int>> ActiveClassStudentIds(int classId, CancellationToken ct) =>
        db.Enrollments.AsNoTracking()
            .Where(e => e.ClassId == classId && e.Status == "Active")
            .Select(e => e.StudentId)
            .ToListAsync(ct);

    public Task<List<LeaderboardEntry>> LeaderboardEntries(int cycleId, IReadOnlyCollection<int> studentIds, CancellationToken ct) =>
        db.LeaderboardEntries.AsNoTracking()
            .Where(e => e.CycleId == cycleId && studentIds.Contains(e.StudentId))
            .Include(e => e.Student).ThenInclude(s => s!.User)
            .OrderBy(e => e.RankNo)
            .Take(10)
            .ToListAsync(ct);

    public async Task<ParentDigestData?> DigestData(int sessionId, int studentId, CancellationToken ct)
    {
        var session = await db.ClassSessions.AsNoTracking()
            .Include(s => s.Class)
            .FirstOrDefaultAsync(s => s.SessionId == sessionId, ct);

        var student = await db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.UserId == studentId, ct);

        var grade = await db.Grades.AsNoTracking()
            .Include(g => g.Submission)
            .Where(g => g.Submission!.StudentId == studentId && g.Submission.Assignment.ClassId == (session != null ? session.ClassId : 0))
            .OrderByDescending(g => g.FinalizedAt)
            .FirstOrDefaultAsync(ct);

        return new ParentDigestData
        {
            StudentName = student?.FullName ?? "con",
            ClassName = session?.Class.Name ?? "lớp STEM",
            FinalScore = grade?.FinalScore
        };
    }
}
