using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class HardwareScore
{
    public long GradeId { get; set; }

    public int CriterionId { get; set; }

    public decimal Points { get; set; }

    public int ScoredBy { get; set; }

    public DateTime ScoredAt { get; set; }

    public virtual HardwareRubricCriterion Criterion { get; set; } = null!;

    public virtual Grade Grade { get; set; } = null!;

    public virtual User ScoredByNavigation { get; set; } = null!;
}
