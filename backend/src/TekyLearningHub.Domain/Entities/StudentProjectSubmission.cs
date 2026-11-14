namespace TekyLearningHub.Domain.Entities;

/// <summary>A file handed in for a lesson assignment, separate from Blockly attempts.</summary>
public sealed class StudentProjectSubmission
{
    public int AssignmentId { get; set; }
    public int StudentId { get; set; }
    public string FileName { get; set; } = null!;
    public byte[] Content { get; set; } = null!;
    public DateTime SubmittedAt { get; set; }
}
