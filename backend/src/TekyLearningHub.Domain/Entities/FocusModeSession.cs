using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class FocusModeSession
{
    public int FocusId { get; set; }

    public int SessionId { get; set; }

    public int TeacherId { get; set; }

    public string? Message { get; set; }

    public DateTime StartedAt { get; set; }

    public DateTime? EndedAt { get; set; }

    public virtual ClassSession Session { get; set; } = null!;

    public virtual TeacherProfile Teacher { get; set; } = null!;
}
