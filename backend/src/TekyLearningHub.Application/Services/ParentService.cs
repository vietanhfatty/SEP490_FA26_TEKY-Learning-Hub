using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.DTOs;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.Services;

public interface IParentService
{
    Task<ParentDashboardDto> GetParentDashboardAsync(int parentId, CancellationToken ct = default);
    Task<List<EContactBookItemDto>> GetChildContactBookHistoryAsync(int studentId, int parentId, CancellationToken ct = default);
    Task<bool> SubmitParentFeedbackAsync(SubmitParentFeedbackRequest request, int parentId, CancellationToken ct = default);
    Task<bool> SendCheerMessageAsync(SendCheerMessageRequest request, CancellationToken ct = default);
    Task<List<StudentPortfolioDetailDto>> GetStudentPortfoliosAsync(int studentId, CancellationToken ct = default);
    Task<StudentPortfolioDetailDto> GetPublicPortfolioByQrTokenAsync(Guid qrToken, CancellationToken ct = default);
    Task<ClassLeaderboardDto> GetClassLeaderboardAsync(int classId, CancellationToken ct = default);
}

public class ParentService : IParentService
{
    private readonly IApplicationDbContext _context;
    private readonly IClassroomRealtimeService _realtimeService;

    public ParentService(
        IApplicationDbContext context,
        IClassroomRealtimeService realtimeService)
    {
        _context = context;
        _realtimeService = realtimeService;
    }

    public async Task<ParentDashboardDto> GetParentDashboardAsync(int parentId, CancellationToken ct = default)
    {
        var parentUser = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.UserId == parentId, ct)
            ?? throw new KeyNotFoundException("Không tìm thấy thông tin phụ huynh.");

        var links = await _context.ParentStudentLinks
            .AsNoTracking()
            .Where(l => l.ParentId == parentId && l.Status == "Active")
            .Include(l => l.Student)
                .ThenInclude(s => s.User)
            .Include(l => l.Student)
                .ThenInclude(s => s.Enrollments)
                    .ThenInclude(e => e.Class)
                        .ThenInclude(c => c.Sessions)
                            .ThenInclude(ses => ses.Room)
            .ToListAsync(ct);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var childrenList = new List<ChildOverviewDto>();

        foreach (var link in links)
        {
            var student = link.Student;
            var activeClass = student.Enrollments.FirstOrDefault(e => e.Status == "Enrolled")?.Class;

            var todayAttendance = await _context.AttendanceRecords
                .AsNoTracking()
                .Include(a => a.Session)
                .Where(a => a.StudentId == student.UserId && a.Session.SessionDate == today)
                .FirstOrDefaultAsync(ct);

            var todaySession = activeClass?.Sessions.FirstOrDefault(s => s.SessionDate == today);
            bool isInActive = todaySession?.Status == "InProgress";

            childrenList.Add(new ChildOverviewDto
            {
                StudentId = student.UserId,
                StudentCode = student.StudentCode,
                FullName = student.User.FullName,
                AvatarUrl = student.User.AvatarUrl,
                TotalXp = student.TotalXp,
                StemPoints = student.StemPoints,
                CurrentClassName = activeClass?.Name ?? "Chưa xếp lớp",
                CurrentLabRoom = todaySession?.Room?.RoomName ?? "Phòng Lab STEM",
                TodayAttendanceStatus = todayAttendance?.Status ?? "Absent",
                TodayMarkedAt = todayAttendance?.MarkedAt,
                IsInActiveSession = isInActive
            });
        }

        return new ParentDashboardDto
        {
            ParentId = parentId,
            ParentName = parentUser.FullName,
            Children = childrenList
        };
    }

    public async Task<List<EContactBookItemDto>> GetChildContactBookHistoryAsync(int studentId, int parentId, CancellationToken ct = default)
    {
        var hasRelation = await _context.ParentStudentLinks
            .AnyAsync(r => r.ParentId == parentId && r.StudentId == studentId && r.Status == "Active", ct);

        if (!hasRelation)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền truy cập hồ sơ học sinh này.");
        }

        var attendances = await _context.AttendanceRecords
            .AsNoTracking()
            .Where(a => a.StudentId == studentId)
            .Include(a => a.Session)
            .OrderByDescending(a => a.Session.SessionDate)
            .ToListAsync(ct);

        var grades = await _context.Grades
            .AsNoTracking()
            .Include(g => g.Submission)
            .Where(g => g.Submission.StudentId == studentId)
            .ToListAsync(ct);

        var result = new List<EContactBookItemDto>();
        foreach (var att in attendances)
        {
            var grade = grades.FirstOrDefault(g => g.Submission.Assignment.ClassId == att.Session.ClassId);

            result.Add(new EContactBookItemDto
            {
                SessionId = att.SessionId,
                SessionTitle = $"Buổi học ngày {att.Session.SessionDate:dd/MM/yyyy}",
                Date = att.Session.SessionDate,
                AttendanceStatus = att.Status,
                AbsenceReason = att.AbsenceReason,
                AutoAstScore = grade?.AutoAstScore,
                HardwareScore = grade?.HardwareScore,
                FinalScore = grade?.FinalScore,
                RemarkText = grade?.RemarkText ?? (att.Status == "Present" ? "Con học tập chăm chỉ và hoàn thành bài tốt." : "Con vắng mặt."),
                RemarkSource = grade?.RemarkSource ?? "Text"
            });
        }

        return result;
    }

    public async Task<bool> SubmitParentFeedbackAsync(SubmitParentFeedbackRequest request, int parentId, CancellationToken ct = default)
    {
        // Log feedback into CheerMessages or Notification
        var cheer = new CheerMessage
        {
            ParentId = parentId,
            StudentId = request.StudentId,
            SessionId = request.SessionId,
            Message = $"[Đánh giá {request.StarRating} sao]: {request.FeedbackNote}",
            SentAt = DateTime.UtcNow
        };

        await _context.CheerMessages.AddAsync(cheer, ct);
        await _context.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> SendCheerMessageAsync(SendCheerMessageRequest request, CancellationToken ct = default)
    {
        var cheer = new CheerMessage
        {
            ParentId = request.ParentId,
            StudentId = request.StudentId,
            StickerId = request.StickerId,
            SessionId = request.SessionId,
            Message = request.Message,
            SentAt = DateTime.UtcNow
        };

        await _context.CheerMessages.AddAsync(cheer, ct);

        // SignalR trigger
        var studentClass = await _context.Enrollments
            .Where(e => e.StudentId == request.StudentId && e.Status == "Enrolled")
            .Select(e => e.ClassId)
            .FirstOrDefaultAsync(ct);

        await _realtimeService.SendCheerConfettiAsync(studentClass, request.StudentId, request.StickerId?.ToString() ?? "PROUD", request.Message, ct);

        await _context.SaveChangesAsync(ct);
        return true;
    }

    public async Task<List<StudentPortfolioDetailDto>> GetStudentPortfoliosAsync(int studentId, CancellationToken ct = default)
    {
        var items = await _context.PortfolioItems
            .AsNoTracking()
            .Where(p => p.StudentId == studentId)
            .Include(p => p.Cards)
            .OrderByDescending(p => p.CompletedAt)
            .ToListAsync(ct);

        return items.Select(p =>
        {
            var card = p.Cards.FirstOrDefault();
            return new StudentPortfolioDetailDto
            {
                ItemId = p.ItemId,
                StudentId = p.StudentId,
                SubmissionId = p.SubmissionId,
                Title = p.Title,
                Summary = p.Summary,
                ThumbnailUrl = p.ThumbnailUrl,
                FinalScore = p.FinalScore,
                QrToken = card?.QrToken ?? Guid.Empty,
                QrCodeShareUrl = card != null ? $"/portfolio/verify/{card.QrToken}" : "",
                ViewCount = card?.ViewCount ?? 0,
                CompletedAt = p.CompletedAt
            };
        }).ToList();
    }

    public async Task<StudentPortfolioDetailDto> GetPublicPortfolioByQrTokenAsync(Guid qrToken, CancellationToken ct = default)
    {
        var card = await _context.AchievementCards
            .Include(ac => ac.Item)
            .FirstOrDefaultAsync(ac => ac.QrToken == qrToken && ac.IsPublic, ct)
            ?? throw new KeyNotFoundException("Không tìm thấy sản phẩm STEM hợp lệ.");

        card.ViewCount++;
        await _context.SaveChangesAsync(ct);

        var item = card.Item;
        return new StudentPortfolioDetailDto
        {
            ItemId = card.CardId,
            StudentId = card.StudentId,
            SubmissionId = item?.SubmissionId ?? 0,
            Title = card.Title,
            Summary = item?.Summary,
            ThumbnailUrl = item?.ThumbnailUrl ?? card.CardImageUrl,
            FinalScore = item?.FinalScore,
            QrToken = card.QrToken,
            QrCodeShareUrl = $"/portfolio/verify/{card.QrToken}",
            ViewCount = card.ViewCount,
            CompletedAt = card.CreatedAt
        };
    }

    public async Task<ClassLeaderboardDto> GetClassLeaderboardAsync(int classId, CancellationToken ct = default)
    {
        var classroom = await _context.Classes
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.ClassId == classId, ct)
            ?? throw new KeyNotFoundException("Không tìm thấy lớp học.");

        var activeCycle = await _context.LeaderboardCycles
            .AsNoTracking()
            .OrderByDescending(c => c.WeekStart)
            .FirstOrDefaultAsync(ct);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var weekStart = activeCycle?.WeekStart ?? today.AddDays(-(int)today.DayOfWeek);
        var weekEnd = activeCycle?.WeekEnd ?? weekStart.AddDays(7);

        var entries = await _context.LeaderboardEntries
            .AsNoTracking()
            .Where(e => activeCycle != null && e.CycleId == activeCycle.CycleId)
            .Include(e => e.Student)
                .ThenInclude(s => s.User)
            .OrderBy(e => e.RankNo)
            .Take(10)
            .Select(e => new LeaderboardRankItemDto
            {
                Rank = e.RankNo,
                StudentId = e.StudentId,
                StudentName = e.Student.User.FullName,
                AvatarUrl = e.Student.User.AvatarUrl,
                XpEarned = e.XpEarned,
                BestTimeMs = e.BestTimeMs,
                BestBlockCount = e.BestBlockCount
            })
            .ToListAsync(ct);

        return new ClassLeaderboardDto
        {
            ClassId = classId,
            ClassName = classroom.Name,
            WeekStartDate = weekStart,
            WeekEndDate = weekEnd,
            TopRankings = entries
        };
    }
}
