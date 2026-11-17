using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TekyLearningHub.Application.DTOs.Portal;
using TekyLearningHub.Application.Interfaces.Portal;

namespace TekyLearningHub.Api.Controllers.Portal;

[ApiController, Authorize(Roles = "parent,teacher"), Route("api/learning-messages")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class LearningMessagesController(ILearningMessageService service) : ControllerBase
{
    private const int MaxFileBytes = 5 * 1024 * 1024;
    private const string ThreadPath = "{parentId:int:min(1)}/{studentId:int:min(1)}/{teacherId:int:min(1)}";
    private int? Actor => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;
    private bool IsParty(int actor, int parent, int teacher) =>
        (actor == parent && User.IsInRole("parent")) || (actor == teacher && User.IsInRole("teacher"));

    [HttpGet]
    public async Task<IActionResult> Inbox(CancellationToken ct) =>
        Actor is int actor ? Ok(await service.Inbox(actor, User.IsInRole("teacher"), ct)) : Unauthorized();

    [HttpGet(ThreadPath)]
    public async Task<IActionResult> History(int parentId, int studentId, int teacherId, long? before, CancellationToken ct)
    {
        if (Actor is not int actor || !IsParty(actor, parentId, teacherId)) return NotFound();
        return await service.History(actor, new(parentId, studentId, teacherId), before, ct) is { } page ? Ok(page) : NotFound();
    }

    [HttpPost(ThreadPath + "/read/{through:long:min(1)}")]
    public async Task<IActionResult> Read(int parentId, int studentId, int teacherId, long through, CancellationToken ct)
    {
        if (Actor is not int actor || !IsParty(actor, parentId, teacherId)) return NotFound();
        return await service.Read(actor, new(parentId, studentId, teacherId), through, ct) ? NoContent() : NotFound();
    }

    [HttpPost(ThreadPath)]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaxFileBytes + 65536), RequestFormLimits(MultipartBodyLengthLimit = MaxFileBytes, ValueLengthLimit = 10000)]
    public async Task<IActionResult> Send(int parentId, int studentId, int teacherId, [FromForm] Guid clientId,
        [FromForm] string? body, [FromForm] IFormFile? attachment, CancellationToken ct)
    {
        if (Actor is not int actor || !IsParty(actor, parentId, teacherId)) return NotFound();
        LearningAttachment? file = null;
        if (attachment is not null)
        {
            if (attachment.Length is < 1 or > MaxFileBytes)
                return Problem(statusCode: 400, title: "Tệp đính kèm phải có dung lượng từ 1 byte đến 5 MB.");
            using var buffer = new MemoryStream((int)attachment.Length);
            await attachment.CopyToAsync(buffer, ct);
            file = new(attachment.FileName, buffer.ToArray());
        }
        var result = await service.Send(actor, new(parentId, studentId, teacherId), new(clientId, body, file), ct);
        return result switch
        {
            ParentChange.Saved => NoContent(),
            ParentChange.Invalid => Problem(statusCode: 400, title: "Nhập tối đa 2.000 ký tự hoặc chọn một tệp PDF, PNG, JPG tối đa 5 MB."),
            _ => NotFound()
        };
    }

    [HttpGet(ThreadPath + "/attachments/{messageId:long:min(1)}")]
    public async Task<IActionResult> Attachment(int parentId, int studentId, int teacherId, long messageId, CancellationToken ct)
    {
        if (Actor is not int actor || !IsParty(actor, parentId, teacherId)) return NotFound();
        var file = await service.Attachment(actor, new(parentId, studentId, teacherId), messageId, ct);
        if (file is null) return NotFound();
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        return File(file.Bytes, "application/octet-stream", file.FileName);
    }
}
