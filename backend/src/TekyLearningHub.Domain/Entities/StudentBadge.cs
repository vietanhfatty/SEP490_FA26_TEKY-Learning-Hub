using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class StudentBadge
{
    public int StudentId { get; set; }

    public int BadgeId { get; set; }

    public DateTime AwardedAt { get; set; }

    public virtual Badge Badge { get; set; } = null!;

    public virtual StudentProfile Student { get; set; } = null!;
}
