using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TekyLearningHub.Application.Interfaces;

namespace TekyLearningHub.Api.Controllers;

[ApiController]
[Route("api/student")]
[Authorize(Roles = "student")]
public class StudentClassesController(IStudentClassesService service, ILogger<StudentClassesController> logger) : ControllerBase
{
    [HttpGet("classes")]
    public async Task<IActionResult> GetClasses(CancellationToken cancellationToken)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)) return Unauthorized();
        try
        {
            var result = await service.GetClassesAsync(userId, cancellationToken);
            return result is null ? Forbid() : Ok(result);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Unable to load student classes");
            return Problem(statusCode: 503, title: "Không thể tải lớp học. Vui lòng thử lại sau.");
        }
    }

    [HttpGet("sessions/{sessionId:int:min(1)}")]
    public async Task<IActionResult> GetSession(int sessionId, CancellationToken cancellationToken)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)) return Unauthorized();
        try
        {
            var result = await service.GetSessionAsync(userId, sessionId, cancellationToken);
            return result is null ? NotFound() : Ok(result);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Unable to load student session {SessionId}", sessionId);
            return Problem(statusCode: 503, title: "Không thể tải buổi học. Vui lòng thử lại sau.");
        }
    }
}
