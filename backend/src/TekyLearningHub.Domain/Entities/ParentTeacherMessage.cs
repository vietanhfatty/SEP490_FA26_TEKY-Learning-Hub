namespace TekyLearningHub.Domain.Entities;

public sealed class ParentTeacherMessage
{
    public long MessageId { get; set; }
    public Guid ClientId { get; set; }
    public int ParentId { get; set; }
    public int StudentId { get; set; }
    public int TeacherId { get; set; }
    public int SenderId { get; set; }
    public string? Body { get; set; }
    public string? AttachmentName { get; set; }
    public byte[]? AttachmentContent { get; set; }
    public DateTime SentAt { get; set; }
    public DateTime? ReadAt { get; set; }
}
