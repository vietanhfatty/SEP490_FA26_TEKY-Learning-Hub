using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TekyLearningHub.Application.Interfaces.Portal;

namespace TekyLearningHub.Api.Controllers.Portal;

[ApiController]
[Authorize(Roles = "student")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[Route("api/student/assignments")]
public sealed class StudentAssignmentsController(IStudentClassesService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id)) return Unauthorized();
        var result = await service.GetAssignmentsAsync(id, cancellationToken);
        return result is null ? Forbid() : Ok(result);
    }

    [HttpGet("{assignmentId:int:min(1)}")]
    public async Task<IActionResult> Detail(int assignmentId, CancellationToken cancellationToken)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id)) return Unauthorized();
        var result = await service.GetAssignmentAsync(id, assignmentId, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }
}
