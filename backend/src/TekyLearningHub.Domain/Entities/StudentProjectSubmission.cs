namespace TekyLearningHub.Domain.Entities;

/// <summary>A file handed in for a lesson assignment, separate from Blockly attempts.</summary>
public sealed class StudentProjectSubmission
{
    public int AttemptNo { get; set; } = 1;
    public string ReviewStatus { get; set; } = "Pending";
    public string? Feedback { get; set; }
    public int? ReviewedBy { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public int AssignmentId { get; set; }
    public int StudentId { get; set; }
    public string FileName { get; set; } = null!;
    public byte[] Content { get; set; } = null!;
    public DateTime SubmittedAt { get; set; }
}
