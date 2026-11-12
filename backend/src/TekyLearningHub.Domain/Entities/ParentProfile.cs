using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class ParentProfile
{
    public int UserId { get; set; }

    public string? Occupation { get; set; }

    public virtual ICollection<CheerMessage> CheerMessages { get; set; } = new List<CheerMessage>();

    public virtual ICollection<ParentStudentLink> ParentStudentLinks { get; set; } = new List<ParentStudentLink>();

    public virtual User User { get; set; } = null!;
}
