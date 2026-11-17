using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class XpTransaction
{
    public long XpId { get; set; }

    public int StudentId { get; set; }

    public string PointType { get; set; } = null!;

    public int Points { get; set; }

    public string Source { get; set; } = null!;

    public long? SubmissionId { get; set; }

    public long? RunId { get; set; }

    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual SimulationRun? Run { get; set; }

    public virtual StudentProfile Student { get; set; } = null!;

    public virtual Submission? Submission { get; set; }
}
