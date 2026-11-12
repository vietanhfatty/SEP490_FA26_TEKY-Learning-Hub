using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class Badge
{
    public int BadgeId { get; set; }

    public string Code { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public string? IconUrl { get; set; }

    public virtual ICollection<StudentBadge> StudentBadges { get; set; } = new List<StudentBadge>();
}
