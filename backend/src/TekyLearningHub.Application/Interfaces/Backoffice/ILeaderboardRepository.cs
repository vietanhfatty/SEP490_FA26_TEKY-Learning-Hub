using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.Interfaces.Backoffice;

/// <summary>
/// Cổng dữ liệu cho job tính bảng xếp hạng tuần. Job chạy nền nên chỉ đọc/ghi qua cổng này.
/// </summary>
public interface ILeaderboardRepository
{
    Task<LeaderboardCycle?> CycleByWeek(DateOnly weekStart, CancellationToken ct);

    void AddCycle(LeaderboardCycle cycle);

    Task<int?> DefaultMapId(CancellationToken ct);

    Task<List<Submission>> FinalizedSubmissions(CancellationToken ct);

    Task<SimulationRun?> BestRun(int studentId, int mapId, CancellationToken ct);

    void AddRun(SimulationRun run);

    Task<LeaderboardEntry?> CycleEntry(int cycleId, int studentId, CancellationToken ct);

    void AddEntry(LeaderboardEntry entry);

    Task<StudentProfile?> StudentProfile(int studentId, CancellationToken ct);
}
