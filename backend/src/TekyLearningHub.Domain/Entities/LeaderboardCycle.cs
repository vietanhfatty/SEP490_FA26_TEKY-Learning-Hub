using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class LeaderboardCycle
{
    public int CycleId { get; set; }

    public DateOnly WeekStart { get; set; }

    public DateOnly WeekEnd { get; set; }

    public string Status { get; set; } = null!;

    public virtual ICollection<LeaderboardEntry> LeaderboardEntries { get; set; } = new List<LeaderboardEntry>();
}
