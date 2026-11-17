using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class HardwareRubricCriterion
{
    public int CriterionId { get; set; }

    public int AssignmentId { get; set; }

    public string Name { get; set; } = null!;

    public decimal MaxPoints { get; set; }

    public int SortOrder { get; set; }

    public virtual Assignment Assignment { get; set; } = null!;

    public virtual ICollection<HardwareScore> HardwareScores { get; set; } = new List<HardwareScore>();
}
