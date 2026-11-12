using System;
using System.Collections.Generic;

namespace TekyLearningHub.Application.DTOs;

public class ParentDashboardDto
{
    public int ParentId { get; set; }
    public string ParentName { get; set; } = string.Empty;
    public List<ChildOverviewDto> Children { get; set; } = new();
}

public class ChildOverviewDto
{
    public int StudentId { get; set; }
    public string StudentCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public int TotalXp { get; set; }
    public int StemPoints { get; set; }
    public string CurrentClassName { get; set; } = string.Empty;
    public string CurrentLabRoom { get; set; } = string.Empty;
    public string TodayAttendanceStatus { get; set; } = "Absent";
    public DateTime? TodayMarkedAt { get; set; }
    public bool IsInActiveSession { get; set; }
}

public class EContactBookItemDto
{
    public int SessionId { get; set; }
    public string SessionTitle { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public string AttendanceStatus { get; set; } = "Present";
    public string? AbsenceReason { get; set; }
    public decimal? AutoAstScore { get; set; }
    public decimal? HardwareScore { get; set; }
    public decimal? FinalScore { get; set; }
    public string? RemarkText { get; set; }
    public string? RemarkSource { get; set; }
}

public class SubmitParentFeedbackRequest
{
    public int SessionId { get; set; }
    public int StudentId { get; set; }
    public int StarRating { get; set; } // 1 - 5
    public string? FeedbackNote { get; set; }
}

public class SendCheerMessageRequest
{
    public int ParentId { get; set; }
    public int StudentId { get; set; }
    public int? StickerId { get; set; }
    public int? SessionId { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class StudentPortfolioDetailDto
{
    public int ItemId { get; set; }
    public int StudentId { get; set; }
    public long SubmissionId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Summary { get; set; }
    public string? ThumbnailUrl { get; set; }
    public decimal? FinalScore { get; set; }
    public Guid QrToken { get; set; }
    public string QrCodeShareUrl { get; set; } = string.Empty;
    public int ViewCount { get; set; }
    public DateTime CompletedAt { get; set; }
}

public class ClassLeaderboardDto
{
    public int ClassId { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public DateOnly WeekStartDate { get; set; }
    public DateOnly WeekEndDate { get; set; }
    public List<LeaderboardRankItemDto> TopRankings { get; set; } = new();
}

public class LeaderboardRankItemDto
{
    public int? Rank { get; set; }
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public int XpEarned { get; set; }
    public int BestTimeMs { get; set; }
    public int BestBlockCount { get; set; }
}
