using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class VwClassGradebook
{
    public int ClassId { get; set; }

    public int StudentId { get; set; }

    public string FullName { get; set; } = null!;

    public int AssignmentId { get; set; }

    public string Title { get; set; } = null!;

    public decimal? AutoAstScore { get; set; }

    public decimal? HardwareScore { get; set; }

    public decimal? FinalScore { get; set; }

    public string? RemarkText { get; set; }
}
