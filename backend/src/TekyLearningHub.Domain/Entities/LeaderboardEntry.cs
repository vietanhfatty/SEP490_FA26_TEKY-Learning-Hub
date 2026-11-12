using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class LeaderboardEntry
{
    public long EntryId { get; set; }

    public int CycleId { get; set; }

    public int MapId { get; set; }

    public int StudentId { get; set; }

    public long BestRunId { get; set; }

    public int BestTimeMs { get; set; }

    public int BestBlockCount { get; set; }

    public int XpEarned { get; set; }

    public int? RankNo { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual SimulationRun BestRun { get; set; } = null!;

    public virtual LeaderboardCycle Cycle { get; set; } = null!;

    public virtual ChallengeMap Map { get; set; } = null!;

    public virtual StudentProfile Student { get; set; } = null!;
}
