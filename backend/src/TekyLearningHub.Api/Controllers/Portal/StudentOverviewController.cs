using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TekyLearningHub.Application.Interfaces.Portal;
namespace TekyLearningHub.Api.Controllers.Portal;

[ApiController, Authorize(Roles = "student"), Route("api/student")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class StudentOverviewController(IStudentOverviewService service) : ControllerBase
{
    [HttpGet("overview")]
    public async Task<IActionResult> Overview(CancellationToken ct)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id)) return Unauthorized();
        var result = await service.Overview(id, ct); return result is null ? Forbid() : Ok(result);
    }
    [HttpGet("classes/{classId:int:min(1)}")]
    public async Task<IActionResult> ClassDetails(int classId, CancellationToken ct)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id)) return Unauthorized();
        var result = await service.ClassDetails(id, classId, ct); return result is null ? NotFound() : Ok(result);
    }
}
