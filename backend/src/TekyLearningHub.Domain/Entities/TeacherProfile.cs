using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class TeacherProfile
{
    public int UserId { get; set; }

    public string TeacherCode { get; set; } = null!;

    public string? Specialty { get; set; }

    public string? Bio { get; set; }

    public DateOnly? HireDate { get; set; }

    public virtual ICollection<Class> Classes { get; set; } = new List<Class>();

    public virtual ICollection<FocusModeSession> FocusModeSessions { get; set; } = new List<FocusModeSession>();

    public virtual ICollection<SpotlightBroadcast> SpotlightBroadcasts { get; set; } = new List<SpotlightBroadcast>();

    public virtual User User { get; set; } = null!;
}
