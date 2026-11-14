using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class ChallengeMap
{
    public int MapId { get; set; }

    public string Name { get; set; } = null!;

    public string? Theme { get; set; }

    public string LayoutJson { get; set; } = null!;

    public int StartX { get; set; }

    public int StartY { get; set; }

    public string Status { get; set; } = null!;

    public int? CreatedBy { get; set; }

    public virtual ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();

    public virtual User? CreatedByNavigation { get; set; }

    public virtual ICollection<LeaderboardEntry> LeaderboardEntries { get; set; } = new List<LeaderboardEntry>();

    public virtual ICollection<MapCheckpoint> MapCheckpoints { get; set; } = new List<MapCheckpoint>();

    public virtual ICollection<SimulationRun> SimulationRuns { get; set; } = new List<SimulationRun>();
}
