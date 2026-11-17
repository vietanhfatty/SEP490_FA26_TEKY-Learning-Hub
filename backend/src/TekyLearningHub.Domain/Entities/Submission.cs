using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class Submission
{
    public long SubmissionId { get; set; }

    public int AssignmentId { get; set; }

    public int StudentId { get; set; }

    public int AttemptNo { get; set; }

    public string BlocklyJson { get; set; } = null!;

    public string? AstJson { get; set; }

    public string Status { get; set; } = null!;

    public bool IsCurrent { get; set; }

    public DateTime SubmittedAt { get; set; }

    public virtual Assignment Assignment { get; set; } = null!;

    public virtual AstEvaluation? AstEvaluation { get; set; }

    public virtual Grade? Grade { get; set; }

    public virtual PortfolioItem? PortfolioItem { get; set; }

    public virtual ICollection<SimulationRun> SimulationRuns { get; set; } = new List<SimulationRun>();

    public virtual ICollection<SpotlightBroadcast> SpotlightBroadcasts { get; set; } = new List<SpotlightBroadcast>();

    public virtual StudentProfile Student { get; set; } = null!;

    public virtual ICollection<XpTransaction> XpTransactions { get; set; } = new List<XpTransaction>();
}
