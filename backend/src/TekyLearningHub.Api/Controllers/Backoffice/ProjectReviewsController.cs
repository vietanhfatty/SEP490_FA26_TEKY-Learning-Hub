using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TekyLearningHub.Application.Interfaces.Backoffice;

namespace TekyLearningHub.Api.Controllers.Backoffice;

[ApiController, Authorize(Roles = "teacher"), Route("api/teacher/project-reviews")]
public sealed class ProjectReviewsController(IProjectReviewService service) : ControllerBase
{
    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    public record ReviewRequest(int AttemptNo, string Status, string Feedback);
    [HttpGet] public async Task<IActionResult> List(CancellationToken ct) => Ok(await service.Reviews(UserId, ct));
    [HttpGet("{assignmentId:int}/{studentId:int}/file")]
    public async Task<IActionResult> Download(int assignmentId, int studentId, CancellationToken ct)
    {
        var file = await service.ReviewFile(UserId, assignmentId, studentId, ct);
        if (file is null) return NotFound();
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        Response.Headers.CacheControl = "no-store";
        return File(file.Content, "application/octet-stream", file.FileName);
    }
    [HttpPost("{assignmentId:int}/{studentId:int}")]
    public async Task<IActionResult> Review(int assignmentId, int studentId, ReviewRequest request, CancellationToken ct)
    {
        if (request.Status is not ("NeedsRevision" or "Passed") || request.AttemptNo < 1 || string.IsNullOrWhiteSpace(request.Feedback) || request.Feedback.Length > 2000)
            return Problem(statusCode: 400, title: "Chọn kết quả và nhập phản hồi từ 1 đến 2000 ký tự.");
        return await service.SubmitReview(UserId, assignmentId, studentId, request.AttemptNo, request.Status, request.Feedback.Trim(), ct)
            ? NoContent() : Problem(statusCode: 409, title: "Bài đã thay đổi hoặc không thuộc lớp thầy cô được phân công. Vui lòng tải lại.");
    }
}
