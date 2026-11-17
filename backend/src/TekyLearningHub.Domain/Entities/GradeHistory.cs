using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class GradeHistory
{
    public long HistoryId { get; set; }

    public long GradeId { get; set; }

    public decimal? OldFinal { get; set; }

    public decimal NewFinal { get; set; }

    public string Reason { get; set; } = null!;

    public int ChangedBy { get; set; }

    public DateTime ChangedAt { get; set; }

    public virtual User ChangedByNavigation { get; set; } = null!;

    public virtual Grade Grade { get; set; } = null!;
}
