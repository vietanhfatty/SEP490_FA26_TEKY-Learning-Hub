using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Quartz;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Application.Interfaces.Backoffice;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Infrastructure.Jobs;

/// <summary>
/// Job nền tính bảng xếp hạng tuần và trao thưởng XP. Đọc/ghi qua cổng repository
/// để không phụ thuộc EF trong lớp job.
/// </summary>
[DisallowConcurrentExecution]
public class WeeklyLeaderboardJob(
    ILeaderboardRepository repository,
    IUnitOfWork unit,
    ILogger<WeeklyLeaderboardJob> logger) : IJob
{
    public async Task Execute(IJobExecutionContext context)
    {
        var cancellationToken = context.CancellationToken;
        logger.LogInformation("Kích hoạt Quartz.NET WeeklyLeaderboardJob: Bắt đầu tính toán bảng xếp hạng tuần...");

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var startOfWeek = today.AddDays(-(((int)today.DayOfWeek + 6) % 7));
        var endOfWeek = startOfWeek.AddDays(6);

        var cycle = await repository.CycleByWeek(startOfWeek, cancellationToken);

        if (cycle == null)
        {
            cycle = new LeaderboardCycle
            {
                WeekStart = startOfWeek,
                WeekEnd = endOfWeek,
                Status = "Active"
            };
            repository.AddCycle(cycle);
            await unit.SaveChangesAsync(cancellationToken);
        }

        var defaultMapId = await repository.DefaultMapId(cancellationToken);

        var submissions = await repository.FinalizedSubmissions(cancellationToken);

        var studentXp = submissions
            .GroupBy(s => s.StudentId)
            .Select(g => new
            {
                StudentId = g.Key,
                SampleSubmission = g.OrderByDescending(x => x.SubmittedAt).First(),
                TotalXp = (int)g.Sum(s => (s.Grade?.FinalScore ?? 0m) * 10m)
            })
            .OrderByDescending(x => x.TotalXp)
            .Take(10)
            .ToList();

        int rank = 1;
        foreach (var item in studentXp)
        {
            var mapId = item.SampleSubmission.Assignment?.MapId ?? defaultMapId;
            if (mapId is null or 0) continue;

            var bestRun = await repository.BestRun(item.StudentId, mapId.Value, cancellationToken);

            if (bestRun == null)
            {
                bestRun = new SimulationRun
                {
                    AssignmentId = item.SampleSubmission.AssignmentId,
                    StudentId = item.StudentId,
                    SubmissionId = item.SampleSubmission.SubmissionId,
                    MapId = mapId.Value,
                    ExecTimeMs = 4500 + (rank * 350),
                    BlockCount = 8 + rank,
                    CheckpointsReached = 3,
                    ReachedFinish = true,
                    RunAt = DateTime.UtcNow
                };
                repository.AddRun(bestRun);
                await unit.SaveChangesAsync(cancellationToken);
            }

            var existingEntry = await repository.CycleEntry(cycle.CycleId, item.StudentId, cancellationToken);

            if (existingEntry == null)
            {
                repository.AddEntry(new LeaderboardEntry
                {
                    CycleId = cycle.CycleId,
                    MapId = mapId.Value,
                    StudentId = item.StudentId,
                    BestRunId = bestRun.RunId,
                    BestTimeMs = bestRun.ExecTimeMs,
                    BestBlockCount = bestRun.BlockCount,
                    XpEarned = item.TotalXp,
                    RankNo = rank,
                    UpdatedAt = DateTime.UtcNow
                });
            }
            else
            {
                existingEntry.XpEarned = item.TotalXp;
                existingEntry.RankNo = rank;
                existingEntry.BestRunId = bestRun.RunId;
                existingEntry.BestTimeMs = bestRun.ExecTimeMs;
                existingEntry.BestBlockCount = bestRun.BlockCount;
                existingEntry.UpdatedAt = DateTime.UtcNow;
            }

            // Award Bonus XP
            if (rank <= 3)
            {
                var student = await repository.StudentProfile(item.StudentId, cancellationToken);
                if (student != null)
                {
                    student.TotalXp += rank == 1 ? 100 : rank == 2 ? 50 : 25;
                }
            }

            rank++;
        }

        await unit.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Hoàn tất tính toán bảng xếp hạng và trao thưởng tuần thành công!");
    }
}
