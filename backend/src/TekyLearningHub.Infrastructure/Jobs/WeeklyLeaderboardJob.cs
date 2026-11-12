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
        var startOfWeek = today.AddDays(-7);
        var endOfWeek = today;

        var cycle = await _context.LeaderboardCycles
            .FirstOrDefaultAsync(c => c.WeekStart == startOfWeek && c.WeekEnd == endOfWeek, context.CancellationToken);

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

        var submissions = await _context.Submissions
            .Include(s => s.Grade)
            .Include(s => s.Assignment)
            .Where(s => s.Status == "Graded" && s.Grade != null)
            .ToListAsync(context.CancellationToken);

        var studentXp = submissions
            .GroupBy(s => s.StudentId)
            .Select(g => new
            {
                StudentId = g.Key,
                TotalXp = (int)g.Sum(s => (s.Grade?.FinalScore ?? 0m) * 10m)
            })
            .OrderByDescending(x => x.TotalXp)
            .Take(10)
            .ToList();

        int rank = 1;
        foreach (var item in studentXp)
        {
            var entry = new LeaderboardEntry
            {
                CycleId = cycle.CycleId,
                MapId = 1,
                StudentId = item.StudentId,
                XpEarned = item.TotalXp,
                RankNo = rank,
                UpdatedAt = DateTime.UtcNow
            };
            await _context.LeaderboardEntries.AddAsync(entry, context.CancellationToken);

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
