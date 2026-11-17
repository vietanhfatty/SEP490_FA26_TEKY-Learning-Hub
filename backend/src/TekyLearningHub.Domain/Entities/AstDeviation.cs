using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class AstDeviation
{
    public long DeviationId { get; set; }

    public long EvaluationId { get; set; }

    public string NodePath { get; set; } = null!;

    public string DeviationType { get; set; } = null!;

    public string? ExpectedBlock { get; set; }

    public string? ActualBlock { get; set; }

    public string? HintText { get; set; }

    public virtual AstEvaluation Evaluation { get; set; } = null!;
}
