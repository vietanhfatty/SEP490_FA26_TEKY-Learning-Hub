using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TekyLearningHub.Application.DTOs.Student;
using TekyLearningHub.Application.Interfaces;

namespace TekyLearningHub.Api.Controllers;

[ApiController]
[Authorize(Roles = "student")]
[Route("api/student/sessions/{sessionId:int:min(1)}/assignments/{assignmentId:int:min(1)}/project")]
public sealed class StudentProjectsController(IStudentClassesService service) : ControllerBase
{
    private const int MaxFileBytes = 10 * 1024 * 1024;
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".sb3", ".py", ".stl", ".rbxl", ".rbxlx", ".pdf", ".png", ".jpg", ".jpeg", ".zip"
    };

    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaxFileBytes + 64 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxFileBytes)]
    public async Task<IActionResult> Submit(int sessionId, int assignmentId, [FromForm] IFormFile? file,
        CancellationToken cancellationToken)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)) return Unauthorized();
        if (file is null || file.Length is <= 0 or > MaxFileBytes)
            return Problem(statusCode: 400, title: "Chọn một tệp có dung lượng tối đa 10 MB.");

        var name = Path.GetFileName(file.FileName.Replace('\\', '/')).Trim();
        if (name.Length is 0 or > 180 || name.Any(char.IsControl) ||
            !AllowedExtensions.Contains(Path.GetExtension(name)))
            return Problem(statusCode: 400, title: "Tên hoặc định dạng tệp chưa được hỗ trợ.");

        await using var buffer = new MemoryStream((int)file.Length);
        await file.CopyToAsync(buffer, cancellationToken);
        var result = await service.SubmitProjectAsync(userId, sessionId, assignmentId, name, buffer.ToArray(), cancellationToken);
        return result.Result switch
        {
            StudentProjectResult.Submitted => Ok(result.Submission),
            StudentProjectResult.NotFound => NotFound(),
            StudentProjectResult.AlreadySubmitted => Problem(statusCode: 409, title: "Em đã nộp sản phẩm cho bài tập này."),
            _ => Problem(statusCode: 409, title: "Bài tập hiện đã đóng hoặc hết hạn nộp.")
        };
    }

    [HttpGet]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<IActionResult> Download(int sessionId, int assignmentId, CancellationToken cancellationToken)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)) return Unauthorized();
        var file = await service.GetProjectFileAsync(userId, sessionId, assignmentId, cancellationToken);
        if (file is null) return NotFound();

        Response.Headers["X-Content-Type-Options"] = "nosniff";
        return File(file.Content, "application/octet-stream", file.FileName);
    }
}
