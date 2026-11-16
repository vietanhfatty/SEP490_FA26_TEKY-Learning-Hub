using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.Interfaces.Backoffice;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Infrastructure.Data;

namespace TekyLearningHub.Infrastructure.Repositories.Backoffice;

/// <summary>Adapter EF cho job tính bảng xếp hạng tuần.</summary>
public sealed class LeaderboardRepository(ApplicationDbContext db) : ILeaderboardRepository
{
    public Task<LeaderboardCycle?> CycleByWeek(DateOnly weekStart, CancellationToken ct) =>
        db.LeaderboardCycles.FirstOrDefaultAsync(c => c.WeekStart == weekStart, ct);

    public void AddCycle(LeaderboardCycle cycle) => db.LeaderboardCycles.Add(cycle);

    public Task<int?> DefaultMapId(CancellationToken ct) =>
        db.ChallengeMaps.OrderBy(m => m.MapId).Select(m => (int?)m.MapId).FirstOrDefaultAsync(ct);

    public Task<List<Submission>> FinalizedSubmissions(CancellationToken ct) =>
        db.Submissions.AsNoTracking()
            .Include(s => s.Grade)
            .Include(s => s.Assignment)
            .Where(s => s.Status == "Finalized" && s.Grade != null)
            .ToListAsync(ct);

    public Task<SimulationRun?> BestRun(int studentId, int mapId, CancellationToken ct) =>
        db.SimulationRuns
            .Where(r => r.StudentId == studentId && r.MapId == mapId)
            .OrderBy(r => r.ExecTimeMs)
            .FirstOrDefaultAsync(ct);

    public void AddRun(SimulationRun run) => db.SimulationRuns.Add(run);

    public Task<LeaderboardEntry?> CycleEntry(int cycleId, int studentId, CancellationToken ct) =>
        db.LeaderboardEntries.FirstOrDefaultAsync(e => e.CycleId == cycleId && e.StudentId == studentId, ct);

    public void AddEntry(LeaderboardEntry entry) => db.LeaderboardEntries.Add(entry);

    public Task<StudentProfile?> StudentProfile(int studentId, CancellationToken ct) =>
        db.StudentProfiles.FindAsync([studentId], ct).AsTask();
}
