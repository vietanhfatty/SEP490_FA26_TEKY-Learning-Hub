using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class AttendanceRecord
{
    public long AttendanceId { get; set; }

    public int SessionId { get; set; }

    public int StudentId { get; set; }

    public string Status { get; set; } = null!;

    public string? AbsenceReason { get; set; }

    public int MarkedBy { get; set; }

    public DateTime MarkedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<MakeupRequest> MakeupRequests { get; set; } = new List<MakeupRequest>();

    public virtual User MarkedByNavigation { get; set; } = null!;

    public virtual ClassSession Session { get; set; } = null!;

    public virtual StudentProfile Student { get; set; } = null!;
}
