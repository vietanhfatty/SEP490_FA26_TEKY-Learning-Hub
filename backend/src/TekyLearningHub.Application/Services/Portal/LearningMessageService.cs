using TekyLearningHub.Application.DTOs.Portal;
using TekyLearningHub.Application.Interfaces.Portal;

namespace TekyLearningHub.Application.Services.Portal;

public sealed class LearningMessageService(ILearningMessageRepository repository) : ILearningMessageService
{
    public const int MaxFileBytes = 5 * 1024 * 1024;
    private const int PageSize = 50;
    private static readonly HashSet<string> Extensions = new(StringComparer.OrdinalIgnoreCase) { ".pdf", ".png", ".jpg", ".jpeg" };

    public Task<IReadOnlyList<LearningContactDto>> Inbox(int actor, bool teacher, CancellationToken ct) =>
        repository.Inbox(actor, teacher, ct);

    public async Task<LearningMessagePage?> History(int actor, LearningThread thread, long? before, CancellationToken ct)
    {
        if (!await repository.HasAccess(actor, thread, ct)) return null;
        var rows = await repository.History(actor, thread, before, PageSize + 1, ct);
        var page = rows.Take(PageSize).Reverse().ToArray();
        return new(page, rows.Count > PageSize ? page[0].MessageId : null);
    }

    public async Task<bool> Read(int actor, LearningThread thread, long through, CancellationToken ct)
    {
        if (!await repository.HasAccess(actor, thread, ct)) return false;
        await repository.Read(actor, thread, through, ct);
        return true;
    }

    public async Task<ParentChange> Send(int actor, LearningThread thread, LearningMessageDraft draft, CancellationToken ct)
    {
        var body = string.IsNullOrWhiteSpace(draft.Body) ? null : draft.Body.Trim();
        if (draft.ClientId == Guid.Empty || body?.Length > 2000 || (body is null && draft.Attachment is null))
            return ParentChange.Invalid;
        var file = draft.Attachment;
        if (file is not null)
        {
            var name = Path.GetFileName(file.FileName.Replace('\\', '/'));
            if (name.Length is < 1 or > 180 || name.Any(char.IsControl) || !Extensions.Contains(Path.GetExtension(name))
                || file.Bytes.Length is < 1 or > MaxFileBytes) return ParentChange.Invalid;
            file = file with { FileName = name };
        }
        return await repository.Send(actor, thread, new(draft.ClientId, body, file), ct)
            ? ParentChange.Saved : ParentChange.NotFound;
    }

    public Task<LearningAttachment?> Attachment(int actor, LearningThread thread, long id, CancellationToken ct) =>
        repository.Attachment(actor, thread, id, ct);
}
