using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class SpotlightBroadcast
{
    public int BroadcastId { get; set; }

    public int SessionId { get; set; }

    public long SubmissionId { get; set; }

    public int TeacherId { get; set; }

    public DateTime StartedAt { get; set; }

    public DateTime? EndedAt { get; set; }

    public virtual ClassSession Session { get; set; } = null!;

    public virtual Submission Submission { get; set; } = null!;

    public virtual TeacherProfile Teacher { get; set; } = null!;
}
