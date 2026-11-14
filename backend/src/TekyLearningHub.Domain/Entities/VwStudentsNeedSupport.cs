using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class VwStudentsNeedSupport
{
    public int StudentId { get; set; }

    public string FullName { get; set; } = null!;

    public int ClassId { get; set; }

    public decimal? AvgScore { get; set; }

    public decimal? AttendanceRate { get; set; }
}
