using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class SimulationRun
{
    public long RunId { get; set; }

    public int AssignmentId { get; set; }

    public int StudentId { get; set; }

    public long? SubmissionId { get; set; }

    public int MapId { get; set; }

    public int ExecTimeMs { get; set; }

    public int BlockCount { get; set; }

    public int CheckpointsReached { get; set; }

    public bool ReachedFinish { get; set; }

    public string? TrajectoryJson { get; set; }

    public DateTime RunAt { get; set; }

    public virtual Assignment Assignment { get; set; } = null!;

    public virtual ICollection<LeaderboardEntry> LeaderboardEntries { get; set; } = new List<LeaderboardEntry>();

    public virtual ChallengeMap Map { get; set; } = null!;

    public virtual StudentProfile Student { get; set; } = null!;

    public virtual Submission? Submission { get; set; }

    public virtual ICollection<XpTransaction> XpTransactions { get; set; } = new List<XpTransaction>();
}
