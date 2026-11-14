using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class AstEvaluation
{
    public long EvaluationId { get; set; }

    public long SubmissionId { get; set; }

    public decimal AutoAstScore { get; set; }

    public decimal MatchPercent { get; set; }

    public string? EngineVersion { get; set; }

    public DateTime EvaluatedAt { get; set; }

    public virtual ICollection<AstDeviation> AstDeviations { get; set; } = new List<AstDeviation>();

    public virtual Submission Submission { get; set; } = null!;
}
