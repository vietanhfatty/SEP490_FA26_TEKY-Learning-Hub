using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class MapCheckpoint
{
    public int CheckpointId { get; set; }

    public int MapId { get; set; }

    public int SeqNo { get; set; }

    public int X { get; set; }

    public int Y { get; set; }

    public string? UnlockMessage { get; set; }

    public bool IsFinish { get; set; }

    public virtual ChallengeMap Map { get; set; } = null!;
}
