using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class Grade
{
    public long GradeId { get; set; }

    public long SubmissionId { get; set; }

    public decimal? AutoAstScore { get; set; }

    public decimal? HardwareScore { get; set; }

    public decimal? FinalScore { get; set; }

    public string? RemarkText { get; set; }

    public string? RemarkSource { get; set; }

    public bool IsFinalized { get; set; }

    public int? FinalizedBy { get; set; }

    public DateTime? FinalizedAt { get; set; }

    public virtual User? FinalizedByNavigation { get; set; }

    public virtual ICollection<GradeHistory> GradeHistories { get; set; } = new List<GradeHistory>();

    public virtual ICollection<HardwareScore> HardwareScores { get; set; } = new List<HardwareScore>();

    public virtual Submission Submission { get; set; } = null!;
}
