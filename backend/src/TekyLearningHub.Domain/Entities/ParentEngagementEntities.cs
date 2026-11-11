using TekyLearningHub.Domain.Common;
using TekyLearningHub.Domain.Enums;

namespace TekyLearningHub.Domain.Entities;

public class EContactBook : BaseAuditableEntity<Guid>
{
    public Guid ClassSessionId { get; set; }
    public ClassSession ClassSession { get; set; } = null!;

    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;

    public AttendanceStatus AttendanceStatus { get; set; } = AttendanceStatus.Present;
    public string SummaryNote { get; set; } = string.Empty;
    public string? TeacherVoiceMemoUrl { get; set; }
    public string? TeacherTranscript { get; set; }

    // Parent feedback
    public int? ParentStarRating { get; set; } // 1 - 5 stars
    public string? ParentFeedbackNote { get; set; }
    public DateTime? ParentReviewedAt { get; set; }

    public DateTime PublishedAt { get; set; } = DateTime.UtcNow;
}

public class CheerMessage : BaseAuditableEntity<Guid>
{
    public Guid ParentId { get; set; }
    public Parent Parent { get; set; } = null!;

    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;

    public Guid ClassSessionId { get; set; }
    public ClassSession ClassSession { get; set; } = null!;

    public CheerStickerType StickerType { get; set; } = CheerStickerType.ProudOfYou;
    public string MessageText { get; set; } = string.Empty;
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
    public bool IsDeliveredToWorkstation { get; set; } = false;
}

public class StudentPortfolio : BaseAuditableEntity<Guid>
{
    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;

    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string BlocklyXml { get; set; } = string.Empty;
    public string? CanvasThumbnailUrl { get; set; }
    public string QrCodeKey { get; set; } = Guid.NewGuid().ToString("N");
    public bool IsPublic { get; set; } = true;
    public int ViewsCount { get; set; } = 0;
}

public class WeeklyLeaderboard : BaseAuditableEntity<Guid>
{
    public Guid ClassroomId { get; set; }
    public Classroom Classroom { get; set; } = null!;

    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;

    public DateTime WeekStartDate { get; set; }
    public DateTime WeekEndDate { get; set; }
    public int Rank { get; set; }
    public int WeeklyXpEarned { get; set; }
    public DateTime CalculatedAt { get; set; } = DateTime.UtcNow;
}

public class NotificationLog : BaseAuditableEntity<Guid>
{
    public string RecipientUserId { get; set; } = string.Empty;
    public NotificationChannel Channel { get; set; } = NotificationChannel.InAppSignalR;
    public NotificationType Type { get; set; } = NotificationType.AttendanceAlert;
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string? PayloadJson { get; set; }
    public bool IsSent { get; set; } = false;
    public DateTime? SentAt { get; set; }
    public string? ErrorMessage { get; set; }
}
