using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using TekyLearningHub.Application.DTOs;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Application.Interfaces.Backoffice;
using TekyLearningHub.Application.Interfaces.Portal;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.Services.Portal;

public class ParentService(
    IParentRepository repository,
    IUnitOfWork unit,
    IClassroomRealtimeService realtimeService) : IParentService
{
    // ==================== SCR-PAR-01: TỔNG QUAN HỒ SƠ CON & ĐIỂM DANH THỜI GIAN THỰC ====================

    public async Task<ParentDashboardDto> GetParentDashboardAsync(int parentId, CancellationToken ct = default)
    {
        var parentUser = await repository.FindUser(parentId, ct)
            ?? throw new KeyNotFoundException("Không tìm thấy thông tin phụ huynh.");

        var links = await repository.ActiveChildren(parentId, ct);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var childrenList = new List<ChildOverviewDto>();

        foreach (var link in links)
        {
            var student = link.Student;
            if (student == null) continue;

            var activeClass = student.Enrollments
                .FirstOrDefault(e => e.Status == "Active")?.Class;

            var todayAttendance = await repository.AttendanceOn(student.UserId, today, ct);

            var todaySession = activeClass?.ClassSessions.FirstOrDefault(s => s.SessionDate == today);
            var nowTime = TimeOnly.FromDateTime(DateTime.Now);
            bool isInActive = todaySession != null
                && todaySession.Status == "Scheduled"
                && nowTime >= todaySession.StartTime
                && nowTime <= todaySession.EndTime;

            childrenList.Add(new ChildOverviewDto
            {
                StudentId = student.UserId,
                StudentCode = student.StudentCode,
                FullName = student.User?.FullName ?? string.Empty,
                AvatarUrl = student.User?.AvatarUrl,
                TotalXp = student.TotalXp,
                StemPoints = student.StemPoints,
                CurrentClassName = activeClass?.Name ?? "Chưa xếp lớp",
                CurrentLabRoom = todaySession?.Room?.RoomName ?? "Phòng Lab STEM",
                TodayAttendanceStatus = todayAttendance?.Status ?? (todaySession == null ? "NoSession" : "NotMarked"),
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

    // ==================== SCR-PAR-02: SỔ LIÊN LẠC ĐIỆN TỬ & ĐÁNH GIÁ 5 SAO ====================

    public async Task<List<EContactBookItemDto>> GetChildContactBookHistoryAsync(int studentId, int parentId, CancellationToken ct = default)
    {
        var hasRelation = await repository.HasActiveLink(parentId, studentId, ct);

        if (!hasRelation)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền truy cập hồ sơ học sinh này.");
        }

        var attendances = await repository.StudentAttendances(studentId, ct);
        var grades = await repository.StudentGrades(studentId, ct);

        var result = new List<EContactBookItemDto>();
        foreach (var att in attendances)
        {
            if (att.Session is null) continue;
            var grade = grades
                .Where(g => g.Submission?.Assignment?.ClassId == att.Session.ClassId
                            && g.Submission.SubmittedAt != default
                            && DateOnly.FromDateTime(g.Submission.SubmittedAt) == att.Session.SessionDate)
                .OrderByDescending(g => g.FinalizedAt)
                .FirstOrDefault();

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
                RemarkText = grade?.RemarkText,
                RemarkSource = grade?.RemarkSource
            });
        }

        return result;
    }

    public async Task<bool> SubmitParentFeedbackAsync(SubmitParentFeedbackRequest request, int parentId, CancellationToken ct = default)
    {
        repository.AddCheerMessage(new CheerMessage
        {
            ParentId = parentId,
            StudentId = request.StudentId,
            SessionId = request.SessionId,
            Message = $"[Đánh giá {request.StarRating} sao]: {request.FeedbackNote}",
            SentAt = DateTime.UtcNow
        });

        await unit.SaveChangesAsync(ct);
        return true;
    }

    // ==================== SCR-PAR-03: HỒ SƠ NĂNG LỰC SỐ STEM & MÃ XÁC THỰC QR ====================

    public async Task<List<StudentPortfolioDetailDto>> GetStudentPortfoliosAsync(int studentId, CancellationToken ct = default)
    {
        var items = await repository.StudentPortfolios(studentId, ct);

        return items.Select(p =>
        {
            var card = p.AchievementCards.FirstOrDefault();
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
        var card = await repository.PublicAchievementCard(qrToken, ct)
            ?? throw new KeyNotFoundException("Không tìm thấy sản phẩm STEM hợp lệ.");

        card.ViewCount++;
        await unit.SaveChangesAsync(ct);

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

    // ==================== SCR-PAR-04 & CRON-03: TUYÊN DƯƠNG TRỰC TUYẾN & BẢNG XẾP HẠNG TUẦN ====================

    public async Task<List<CheerStickerDto>> GetCheerStickersAsync(CancellationToken ct = default)
    {
        var stickers = await repository.CheerStickers(ct);
        return stickers
            .OrderBy(s => s.StickerId)
            .Select(s => new CheerStickerDto
            {
                StickerId = s.StickerId,
                Code = s.Code,
                Name = s.Name,
                ImageUrl = s.ImageUrl
            })
            .ToList();
    }

    public async Task<bool> SendCheerMessageAsync(SendCheerMessageRequest request, CancellationToken ct = default)
    {
        repository.AddCheerMessage(new CheerMessage
        {
            ParentId = request.ParentId,
            StudentId = request.StudentId,
            StickerId = request.StickerId,
            SessionId = request.SessionId,
            Message = request.Message,
            SentAt = DateTime.UtcNow
        });

        var studentClass = await repository.ActiveClassId(request.StudentId, ct);

        var stickerCode = request.StickerId.HasValue
            ? await repository.StickerCode(request.StickerId.Value, ct)
            : null;

        await realtimeService.SendCheerConfettiAsync(studentClass ?? 0, request.StudentId, stickerCode ?? "PROUD", request.Message, ct);

        await unit.SaveChangesAsync(ct);
        return true;
    }

    public async Task<ClassLeaderboardDto> GetClassLeaderboardAsync(int classId, CancellationToken ct = default)
    {
        var classroom = await repository.FindClass(classId, ct)
            ?? throw new KeyNotFoundException("Không tìm thấy lớp học.");

        var activeCycle = await repository.LatestLeaderboardCycle(ct);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var weekStart = activeCycle?.WeekStart ?? today.AddDays(-(int)today.DayOfWeek);
        var weekEnd = activeCycle?.WeekEnd ?? weekStart.AddDays(7);

        var classStudentIds = await repository.ActiveClassStudentIds(classId, ct);

        var entries = activeCycle is null || classStudentIds.Count == 0
            ? new List<LeaderboardEntry>()
            : await repository.LeaderboardEntries(activeCycle.CycleId, classStudentIds, ct);

        return new ClassLeaderboardDto
        {
            ClassId = classId,
            ClassName = classroom.Name,
            WeekStartDate = weekStart,
            WeekEndDate = weekEnd,
            TopRankings = entries
                .OrderBy(e => e.RankNo)
                .Take(10)
                .Select(e => new LeaderboardRankItemDto
                {
                    Rank = e.RankNo,
                    StudentId = e.StudentId,
                    StudentName = e.Student?.User?.FullName ?? "Học sinh",
                    AvatarUrl = e.Student?.User?.AvatarUrl,
                    XpEarned = e.XpEarned,
                    BestTimeMs = e.BestTimeMs,
                    BestBlockCount = e.BestBlockCount
                })
                .ToList()
        };
    }
}
