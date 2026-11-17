using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class PortfolioItem
{
    public int ItemId { get; set; }

    public int StudentId { get; set; }

    public long SubmissionId { get; set; }

    public string Title { get; set; } = null!;

    public string? Summary { get; set; }

    public string? ThumbnailUrl { get; set; }

    public decimal? FinalScore { get; set; }

    public DateTime CompletedAt { get; set; }

    public virtual ICollection<AchievementCard> AchievementCards { get; set; } = new List<AchievementCard>();

    public virtual StudentProfile Student { get; set; } = null!;

    public virtual Submission Submission { get; set; } = null!;
}
