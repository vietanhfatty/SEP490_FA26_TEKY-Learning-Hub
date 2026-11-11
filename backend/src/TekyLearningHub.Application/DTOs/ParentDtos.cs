using TekyLearningHub.Domain.Enums;

namespace TekyLearningHub.Application.DTOs;

public class ParentDashboardDto
{
    public Guid ParentId { get; set; }
    public string ParentName { get; set; } = string.Empty;
    public List<ChildOverviewDto> Children { get; set; } = new();
}

public class ChildOverviewDto
{
    public Guid StudentId { get; set; }
    public string StudentCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public int Level { get; set; }
    public int TotalXp { get; set; }
    public int StreakDays { get; set; }
    public string CurrentClassName { get; set; } = string.Empty;
    public string CurrentLabRoom { get; set; } = string.Empty;
    public AttendanceStatus TodayAttendanceStatus { get; set; }
    public DateTime? TodayCheckInTime { get; set; }
    public bool IsInActiveSession { get; set; }
}

public class EContactBookItemDto
{
    public Guid ContactBookId { get; set; }
    public Guid ClassSessionId { get; set; }
    public string SessionTitle { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public AttendanceStatus AttendanceStatus { get; set; }
    public string SummaryNote { get; set; } = string.Empty;
    public string? TeacherVoiceMemoUrl { get; set; }
    public string? TeacherTranscript { get; set; }
    public double? TotalScore { get; set; }
    public int? ParentStarRating { get; set; }
    public string? ParentFeedbackNote { get; set; }
}

public class SubmitParentFeedbackRequest
{
    public Guid ContactBookId { get; set; }
    public int StarRating { get; set; } // 1 - 5
    public string? FeedbackNote { get; set; }
}

public class SendCheerMessageRequest
{
    public Guid ParentId { get; set; }
    public Guid StudentId { get; set; }
    public Guid ClassSessionId { get; set; }
    public CheerStickerType StickerType { get; set; }
    public string MessageText { get; set; } = string.Empty;
}

public class StudentPortfolioDetailDto
{
    public Guid PortfolioId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string BlocklyXml { get; set; } = string.Empty;
    public string? CanvasThumbnailUrl { get; set; }
    public string QrCodeKey { get; set; } = string.Empty;
    public string QrCodeShareUrl { get; set; } = string.Empty;
    public int ViewsCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ClassLeaderboardDto
{
    public Guid ClassroomId { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public DateTime WeekStartDate { get; set; }
    public DateTime WeekEndDate { get; set; }
    public List<LeaderboardRankItemDto> TopRankings { get; set; } = new();
}

public class LeaderboardRankItemDto
{
    public int Rank { get; set; }
    public Guid StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public int WeeklyXp { get; set; }
}
