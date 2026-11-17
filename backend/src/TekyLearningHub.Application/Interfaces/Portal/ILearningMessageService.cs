using TekyLearningHub.Application.DTOs.Portal;

namespace TekyLearningHub.Application.Interfaces.Portal;

public interface ILearningMessageService
{
    Task<IReadOnlyList<LearningContactDto>> Inbox(int actor, bool teacher, CancellationToken ct);
    Task<LearningMessagePage?> History(int actor, LearningThread thread, long? before, CancellationToken ct);
    Task<bool> Read(int actor, LearningThread thread, long through, CancellationToken ct);
    Task<ParentChange> Send(int actor, LearningThread thread, LearningMessageDraft draft, CancellationToken ct);
    Task<LearningAttachment?> Attachment(int actor, LearningThread thread, long id, CancellationToken ct);
}

public interface ILearningMessageRepository
{
    Task<IReadOnlyList<LearningContactDto>> Inbox(int actor, bool teacher, CancellationToken ct);
    Task<bool> HasAccess(int actor, LearningThread thread, CancellationToken ct);
    Task<IReadOnlyList<LearningMessageDto>> History(int actor, LearningThread thread, long? before, int take, CancellationToken ct);
    Task Read(int actor, LearningThread thread, long through, CancellationToken ct);
    Task<bool> Send(int actor, LearningThread thread, LearningMessageDraft draft, CancellationToken ct);
    Task<LearningAttachment?> Attachment(int actor, LearningThread thread, long id, CancellationToken ct);
}
