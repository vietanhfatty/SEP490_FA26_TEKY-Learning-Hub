using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Quartz;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Domain.Enums;

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

        var today = DateTime.UtcNow.Date;
        var startOfWeek = today.AddDays(-7);
        var endOfWeek = today;

        var activeClasses = await _context.Classrooms
            .Where(c => c.IsActive)
            .Include(c => c.Students)
                .ThenInclude(cs => cs.Student)
            .ToListAsync(context.CancellationToken);

        foreach (var classroom in activeClasses)
        {
            var studentIds = classroom.Students.Where(cs => cs.IsActive).Select(cs => cs.StudentId).ToList();

            var weeklySubmissions = await _context.StudentSubmissions
                .Where(s => studentIds.Contains(s.StudentId) && s.SubmittedAt >= startOfWeek && s.SubmittedAt < endOfWeek && s.Status == SubmissionStatus.Graded)
                .ToListAsync(context.CancellationToken);

            var studentXpDict = weeklySubmissions
                .GroupBy(s => s.StudentId)
                .ToDictionary(g => g.Key, g => (int)g.Sum(s => s.TotalScore * 10));

            var orderedStudents = studentIds
                .Select(id => new
                {
                    StudentId = id,
                    WeeklyXp = studentXpDict.TryGetValue(id, out var xp) ? xp : 0
                })
                .OrderByDescending(x => x.WeeklyXp)
                .Take(10)
                .ToList();

            int rank = 1;
            foreach (var item in orderedStudents)
            {
                var entry = new WeeklyLeaderboard
                {
                    Id = Guid.NewGuid(),
                    ClassroomId = classroom.Id,
                    StudentId = item.StudentId,
                    WeekStartDate = startOfWeek,
                    WeekEndDate = endOfWeek,
                    Rank = rank,
                    WeeklyXpEarned = item.WeeklyXp,
                    CalculatedAt = DateTime.UtcNow
                };

                await _context.WeeklyLeaderboards.AddAsync(entry, context.CancellationToken);

                // Top 3 Weekly Bonus
                if (rank <= 3)
                {
                    var student = await _context.Students.FindAsync([item.StudentId], context.CancellationToken);
                    if (student != null)
                    {
                        int bonus = rank == 1 ? 100 : rank == 2 ? 50 : 25;
                        student.TotalXp += bonus;
                    }
                }

                rank++;
            }
        }

        await _context.SaveChangesAsync(context.CancellationToken);
        _logger.LogInformation("Hoàn tất tính toán bảng xếp hạng và trao thưởng tuần thành công!");
    }
}
