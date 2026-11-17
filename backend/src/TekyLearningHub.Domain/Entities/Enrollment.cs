using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class Enrollment
{
    public int EnrollmentId { get; set; }

    public int ClassId { get; set; }

    public int StudentId { get; set; }

    public string Status { get; set; } = null!;

    public decimal ProgressPercent { get; set; }

    public int? TransferredFromId { get; set; }

    public DateTime EnrolledAt { get; set; }

    public DateTime? CompletedAt { get; set; }

    public virtual Class Class { get; set; } = null!;

    public virtual ICollection<Enrollment> InverseTransferredFrom { get; set; } = new List<Enrollment>();

    public virtual StudentProfile Student { get; set; } = null!;

    public virtual Enrollment? TransferredFrom { get; set; }
}
