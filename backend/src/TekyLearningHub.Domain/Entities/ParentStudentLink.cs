using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class ParentStudentLink
{
    public int LinkId { get; set; }

    public int ParentId { get; set; }

    public int StudentId { get; set; }

    public string? Relationship { get; set; }

    public string Status { get; set; } = null!;

    public DateTime LinkedAt { get; set; }

    public virtual ParentProfile Parent { get; set; } = null!;

    public virtual StudentProfile Student { get; set; } = null!;
}
