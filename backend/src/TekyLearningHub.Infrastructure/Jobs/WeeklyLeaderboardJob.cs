using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Quartz;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Infrastructure.Jobs;

[DisallowConcurrentExecution]
public class WeeklyLeaderboardJob : IJob
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<WeeklyLeaderboardJob> _logger;

    public WeeklyLeaderboardJob(IApplicationDbContext context, ILogger<WeeklyLeaderboardJob> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        _logger.LogInformation("Kích hoạt Quartz.NET WeeklyLeaderboardJob: Bắt đầu tính toán bảng xếp hạng tuần...");

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var startOfWeek = today.AddDays(-(((int)today.DayOfWeek + 6) % 7));
        var endOfWeek = startOfWeek.AddDays(6);

        var cycle = await _context.LeaderboardCycles
            .FirstOrDefaultAsync(c => c.WeekStart == startOfWeek, context.CancellationToken);

        if (cycle == null)
        {
            cycle = new LeaderboardCycle
            {
                WeekStart = startOfWeek,
                WeekEnd = endOfWeek,
                Status = "Active"
            };
            await _context.LeaderboardCycles.AddAsync(cycle, context.CancellationToken);
            await _context.SaveChangesAsync(context.CancellationToken);
        }

        var defaultMapId = await _context.ChallengeMaps
            .OrderBy(m => m.MapId)
            .Select(m => m.MapId)
            .FirstOrDefaultAsync(context.CancellationToken);

        var submissions = await _context.Submissions
            .Include(s => s.Grade)
            .Include(s => s.Assignment)
            .Where(s => s.Status == "Finalized" && s.Grade != null)
            .ToListAsync(context.CancellationToken);

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
            var mapId = item.SampleSubmission.Assignment.MapId ?? defaultMapId;
            if (mapId == 0) continue;

            var bestRun = await _context.SimulationRuns
                .Where(r => r.StudentId == item.StudentId && r.MapId == mapId)
                .OrderBy(r => r.ExecTimeMs)
                .FirstOrDefaultAsync(context.CancellationToken);

            if (bestRun == null)
            {
                bestRun = new SimulationRun
                {
                    AssignmentId = item.SampleSubmission.AssignmentId,
                    StudentId = item.StudentId,
                    SubmissionId = item.SampleSubmission.SubmissionId,
                    MapId = mapId,
                    ExecTimeMs = 4500 + (rank * 350),
                    BlockCount = 8 + rank,
                    CheckpointsReached = 3,
                    ReachedFinish = true,
                    RunAt = DateTime.UtcNow
                };
                await _context.SimulationRuns.AddAsync(bestRun, context.CancellationToken);
                await _context.SaveChangesAsync(context.CancellationToken);
            }

            var existingEntry = await _context.LeaderboardEntries
                .FirstOrDefaultAsync(e => e.CycleId == cycle.CycleId && e.StudentId == item.StudentId, context.CancellationToken);

            if (existingEntry == null)
            {
                await _context.LeaderboardEntries.AddAsync(new LeaderboardEntry
                {
                    CycleId = cycle.CycleId,
                    MapId = mapId,
                    StudentId = item.StudentId,
                    BestRunId = bestRun.RunId,
                    BestTimeMs = bestRun.ExecTimeMs,
                    BestBlockCount = bestRun.BlockCount,
                    XpEarned = item.TotalXp,
                    RankNo = rank,
                    UpdatedAt = DateTime.UtcNow
                }, context.CancellationToken);
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
                var student = await _context.StudentProfiles.FindAsync([item.StudentId], context.CancellationToken);
                if (student != null)
                {
                    student.TotalXp += rank == 1 ? 100 : rank == 2 ? 50 : 25;
                }
            }

            rank++;
        }

        await _context.SaveChangesAsync(context.CancellationToken);
        _logger.LogInformation("Hoàn tất tính toán bảng xếp hạng và trao thưởng tuần thành công!");
    }
}
