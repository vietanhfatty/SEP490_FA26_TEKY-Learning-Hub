using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class UserSession
{
    public long SessionId { get; set; }

    public int UserId { get; set; }

    public string TokenHash { get; set; } = null!;

    public string? IpAddress { get; set; }

    public string? UserAgent { get; set; }

    public DateTime LoginAt { get; set; }

    public DateTime? LogoutAt { get; set; }

    public bool IsActive { get; set; }

    public virtual User User { get; set; } = null!;
}
