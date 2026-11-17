using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class PasswordResetOtp
{
    public long OtpId { get; set; }

    public int UserId { get; set; }

    public string OtpHash { get; set; } = null!;

    public DateTime ExpiresAt { get; set; }

    public int Attempts { get; set; }

    public DateTime? UsedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User User { get; set; } = null!;
}
