using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.DTOs;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Domain.Enums;

namespace TekyLearningHub.Application.Services;

public interface IParentService
{
    Task<ParentDashboardDto> GetParentDashboardAsync(Guid parentId, CancellationToken ct = default);
    Task<List<EContactBookItemDto>> GetChildContactBookHistoryAsync(Guid studentId, Guid parentId, CancellationToken ct = default);
    Task<bool> SubmitParentFeedbackAsync(SubmitParentFeedbackRequest request, Guid parentId, CancellationToken ct = default);
    Task<bool> SendCheerMessageAsync(SendCheerMessageRequest request, CancellationToken ct = default);
    Task<List<StudentPortfolioDetailDto>> GetStudentPortfoliosAsync(Guid studentId, CancellationToken ct = default);
    Task<StudentPortfolioDetailDto> GetPublicPortfolioByQrKeyAsync(string qrKey, CancellationToken ct = default);
    Task<ClassLeaderboardDto> GetClassLeaderboardAsync(Guid classroomId, CancellationToken ct = default);
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

    public async Task<ParentDashboardDto> GetParentDashboardAsync(Guid parentId, CancellationToken ct = default)
    {
        var parent = await _context.Parents
            .AsNoTracking()
            .Include(p => p.StudentRelations)
                .ThenInclude(r => r.Student)
                    .ThenInclude(s => s.ClassEnrollments)
                        .ThenInclude(ce => ce.Classroom)
            .FirstOrDefaultAsync(p => p.Id == parentId, ct)
            ?? throw new KeyNotFoundException("Không tìm thấy thông tin phụ huynh.");

        var childrenList = new List<ChildOverviewDto>();
        var today = DateTime.UtcNow.Date;

        foreach (var rel in parent.StudentRelations)
        {
            var student = rel.Student;
            var activeClass = student.ClassEnrollments.FirstOrDefault(ce => ce.IsActive)?.Classroom;

            var todayAttendance = await _context.Attendances
                .AsNoTracking()
                .Include(a => a.ClassSession)
                .Where(a => a.StudentId == student.Id && a.ClassSession.ScheduledDate.Date == today)
                .FirstOrDefaultAsync(ct);

            bool isInActive = todayAttendance?.ClassSession?.Status == ClassSessionStatus.InProgress;

            childrenList.Add(new ChildOverviewDto
            {
                StudentId = student.Id,
                StudentCode = student.StudentCode,
                FullName = student.FullName,
                AvatarUrl = student.AvatarUrl,
                Level = student.CurrentLevel,
                TotalXp = student.TotalXp,
                StreakDays = student.CurrentStreakDays,
                CurrentClassName = activeClass?.Name ?? "Chưa xếp lớp",
                CurrentLabRoom = activeClass?.RoomName ?? "Lab STEM",
                TodayAttendanceStatus = todayAttendance?.Status ?? AttendanceStatus.Absent,
                TodayCheckInTime = todayAttendance?.CheckInTime,
                IsInActiveSession = isInActive
            });
        }

        return new ParentDashboardDto
        {
            ParentId = parent.Id,
            ParentName = parent.FullName,
            Children = childrenList
        };
    }

    public async Task<List<EContactBookItemDto>> GetChildContactBookHistoryAsync(Guid studentId, Guid parentId, CancellationToken ct = default)
    {
        // Verify relationship
        var hasRelation = await _context.ParentStudentRelations
            .AnyAsync(r => r.ParentId == parentId && r.StudentId == studentId, ct);

        if (!hasRelation)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền truy cập hồ sơ học sinh này.");
        }

        var contactBooks = await _context.EContactBooks
            .AsNoTracking()
            .Where(cb => cb.StudentId == studentId)
            .Include(cb => cb.ClassSession)
            .OrderByDescending(cb => cb.ClassSession.ScheduledDate)
            .ToListAsync(ct);

        var submissions = await _context.StudentSubmissions
            .AsNoTracking()
            .Where(s => s.StudentId == studentId && s.ClassSessionId.HasValue)
            .ToDictionaryAsync(s => s.ClassSessionId!.Value, s => s.TotalScore, ct);

        return contactBooks.Select(cb => new EContactBookItemDto
        {
            ContactBookId = cb.Id,
            ClassSessionId = cb.ClassSessionId,
            SessionTitle = cb.ClassSession.Title,
            Date = cb.ClassSession.ScheduledDate,
            AttendanceStatus = cb.AttendanceStatus,
            SummaryNote = cb.SummaryNote,
            TeacherVoiceMemoUrl = cb.TeacherVoiceMemoUrl,
            TeacherTranscript = cb.TeacherTranscript,
            TotalScore = submissions.TryGetValue(cb.ClassSessionId, out var score) ? score : null,
            ParentStarRating = cb.ParentStarRating,
            ParentFeedbackNote = cb.ParentFeedbackNote
        }).ToList();
    }

    public async Task<bool> SubmitParentFeedbackAsync(SubmitParentFeedbackRequest request, Guid parentId, CancellationToken ct = default)
    {
        var contactBook = await _context.EContactBooks
            .FirstOrDefaultAsync(cb => cb.Id == request.ContactBookId, ct)
            ?? throw new KeyNotFoundException("Không tìm thấy sổ liên lạc buổi học.");

        contactBook.ParentStarRating = Math.Clamp(request.StarRating, 1, 5);
        contactBook.ParentFeedbackNote = request.FeedbackNote;
        contactBook.ParentReviewedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> SendCheerMessageAsync(SendCheerMessageRequest request, CancellationToken ct = default)
    {
        var cheer = new CheerMessage
        {
            Id = Guid.NewGuid(),
            ParentId = request.ParentId,
            StudentId = request.StudentId,
            ClassSessionId = request.ClassSessionId,
            StickerType = request.StickerType,
            MessageText = request.MessageText,
            SentAt = DateTime.UtcNow,
            IsDeliveredToWorkstation = true
        };

        await _context.CheerMessages.AddAsync(cheer, ct);

        var session = await _context.ClassSessions.FindAsync([request.ClassSessionId], ct);
        if (session != null)
        {
            // Realtime SignalR trigger -> Explode Confetti on student's lab screen!
            await _realtimeService.SendCheerConfettiAsync(session.ClassroomId, request.StudentId, request.StickerType, request.MessageText, ct);
        }

        await _context.SaveChangesAsync(ct);
        return true;
    }

    public async Task<List<StudentPortfolioDetailDto>> GetStudentPortfoliosAsync(Guid studentId, CancellationToken ct = default)
    {
        return await _context.StudentPortfolios
            .AsNoTracking()
            .Where(p => p.StudentId == studentId)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new StudentPortfolioDetailDto
            {
                PortfolioId = p.Id,
                Title = p.Title,
                Description = p.Description,
                BlocklyXml = p.BlocklyXml,
                CanvasThumbnailUrl = p.CanvasThumbnailUrl,
                QrCodeKey = p.QrCodeKey,
                QrCodeShareUrl = $"/portfolio/verify/{p.QrCodeKey}",
                ViewsCount = p.ViewsCount,
                CreatedAt = p.CreatedAt
            })
            .ToListAsync(ct);
    }

    public async Task<StudentPortfolioDetailDto> GetPublicPortfolioByQrKeyAsync(string qrKey, CancellationToken ct = default)
    {
        var portfolio = await _context.StudentPortfolios
            .FirstOrDefaultAsync(p => p.QrCodeKey == qrKey && p.IsPublic, ct)
            ?? throw new KeyNotFoundException("Không tìm thấy sản phẩm STEM hợp lệ.");

        portfolio.ViewsCount++;
        await _context.SaveChangesAsync(ct);

        return new StudentPortfolioDetailDto
        {
            PortfolioId = portfolio.Id,
            Title = portfolio.Title,
            Description = portfolio.Description,
            BlocklyXml = portfolio.BlocklyXml,
            CanvasThumbnailUrl = portfolio.CanvasThumbnailUrl,
            QrCodeKey = portfolio.QrCodeKey,
            QrCodeShareUrl = $"/portfolio/verify/{portfolio.QrCodeKey}",
            ViewsCount = portfolio.ViewsCount,
            CreatedAt = portfolio.CreatedAt
        };
    }

    public async Task<ClassLeaderboardDto> GetClassLeaderboardAsync(Guid classroomId, CancellationToken ct = default)
    {
        var classroom = await _context.Classrooms
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == classroomId, ct)
            ?? throw new KeyNotFoundException("Không tìm thấy lớp học.");

        var today = DateTime.UtcNow.Date;
        var startOfWeek = today.AddDays(-(int)today.DayOfWeek);
        var endOfWeek = startOfWeek.AddDays(7);

        var rankings = await _context.WeeklyLeaderboards
            .AsNoTracking()
            .Where(w => w.ClassroomId == classroomId && w.WeekStartDate >= startOfWeek.AddDays(-7))
            .Include(w => w.Student)
            .OrderBy(w => w.Rank)
            .Take(10)
            .Select(w => new LeaderboardRankItemDto
            {
                Rank = w.Rank,
                StudentId = w.StudentId,
                StudentName = w.Student.FullName,
                AvatarUrl = w.Student.AvatarUrl,
                WeeklyXp = w.WeeklyXpEarned
            })
            .ToListAsync(ct);

        return new ClassLeaderboardDto
        {
            ClassroomId = classroomId,
            ClassName = classroom.Name,
            WeekStartDate = startOfWeek,
            WeekEndDate = endOfWeek,
            TopRankings = rankings
        };
    }
}
