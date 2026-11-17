using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class AchievementCard
{
    public int CardId { get; set; }

    public int StudentId { get; set; }

    public int? ItemId { get; set; }

    public string Title { get; set; } = null!;

    public string? CardImageUrl { get; set; }

    public Guid QrToken { get; set; }

    public bool IsPublic { get; set; }

    public int ExportedBy { get; set; }

    public int ViewCount { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User ExportedByNavigation { get; set; } = null!;

    public virtual PortfolioItem? Item { get; set; }

    public virtual StudentProfile Student { get; set; } = null!;
}
