using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class ClassSession
{
    public int SessionId { get; set; }

    public int ClassId { get; set; }

    public int? LessonId { get; set; }

    public int? RoomId { get; set; }

    public DateOnly SessionDate { get; set; }

    public TimeOnly StartTime { get; set; }

    public TimeOnly EndTime { get; set; }

    public string Status { get; set; } = null!;

    public virtual ICollection<AttendanceRecord> AttendanceRecords { get; set; } = new List<AttendanceRecord>();

    public virtual ICollection<CheerMessage> CheerMessages { get; set; } = new List<CheerMessage>();

    public virtual Class Class { get; set; } = null!;

    public virtual ICollection<FocusModeSession> FocusModeSessions { get; set; } = new List<FocusModeSession>();

    public virtual Lesson? Lesson { get; set; }

    public virtual ICollection<MakeupRequest> MakeupRequests { get; set; } = new List<MakeupRequest>();

    public virtual Room? Room { get; set; }

    public virtual ICollection<SpotlightBroadcast> SpotlightBroadcasts { get; set; } = new List<SpotlightBroadcast>();
}
