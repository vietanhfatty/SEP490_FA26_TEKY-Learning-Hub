using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class WorkspaceDraft
{
    public long DraftId { get; set; }

    public int AssignmentId { get; set; }

    public int StudentId { get; set; }

    public string BlocklyJson { get; set; } = null!;

    public DateTime SavedAt { get; set; }

    public virtual Assignment Assignment { get; set; } = null!;

    public virtual StudentProfile Student { get; set; } = null!;
}
