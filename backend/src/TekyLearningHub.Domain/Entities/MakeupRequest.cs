using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class MakeupRequest
{
    public int MakeupId { get; set; }

    public long AttendanceId { get; set; }

    public int RequestedBy { get; set; }

    public int? SuggestedLessonId { get; set; }

    public int? PreferredSessionId { get; set; }

    public string? Reason { get; set; }

    public string Status { get; set; } = null!;

    public int? ProcessedBy { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? ProcessedAt { get; set; }

    public virtual AttendanceRecord Attendance { get; set; } = null!;

    public virtual ClassSession? PreferredSession { get; set; }

    public virtual User? ProcessedByNavigation { get; set; }

    public virtual User RequestedByNavigation { get; set; } = null!;

    public virtual Lesson? SuggestedLesson { get; set; }
}
