namespace TekyLearningHub.Application.DTOs.Portal;

public record LearningThread(int ParentId, int StudentId, int TeacherId);
public record LearningContactDto(int ParentId, int StudentId, int TeacherId, string ParentName, string StudentName,
    string TeacherName, string? Specialty, string? Bio, int Unread);
public record LearningMessageDto(long MessageId, bool Mine, string? Body, string? AttachmentName, DateTime SentAt);
public record LearningMessagePage(IReadOnlyList<LearningMessageDto> Messages, long? OlderThan);
public record LearningAttachment(string FileName, byte[] Bytes);
public record LearningMessageDraft(Guid ClientId, string? Body, LearningAttachment? Attachment);
