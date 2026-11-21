namespace TekyLearningHub.Domain.Entities;

public sealed class ParentCourseRequest
{
    public long RequestId { get; set; }
    public string? ManagerNote { get; set; }
    public int ParentId { get; set; }
    public int StudentId { get; set; }
    public int ClassId { get; set; }
    public string Status { get; set; } = null!;
    public DateTime RequestedAt { get; set; }
    public Class Class { get; set; } = null!;
}

public sealed class ParentPayment
{
    public int PaymentId { get; set; }
    public int ParentId { get; set; }
    public int StudentId { get; set; }
    public int CourseId { get; set; }
    public string Reference { get; set; } = null!;
    public string? InvoiceNumber { get; set; }
    public int AmountVnd { get; set; }
    public string Status { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public DateTime? PaidAt { get; set; }
    public Course Course { get; set; } = null!;
    public ParentRefundRequest? Refund { get; set; }
}

public sealed class ParentRefundRequest
{
    public int PaymentId { get; set; }
    public string Reason { get; set; } = null!;
    public string Status { get; set; } = null!;
    public DateTime RequestedAt { get; set; }
}
