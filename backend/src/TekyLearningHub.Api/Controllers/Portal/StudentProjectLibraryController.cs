using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TekyLearningHub.Application.Interfaces.Portal;

namespace TekyLearningHub.Api.Controllers.Portal;

[ApiController]
[Authorize(Roles = "student")]
[Route("api/student/projects")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class StudentProjectLibraryController(IStudentClassesService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id)) return Unauthorized();
        var projects = await service.GetProjectsAsync(id, cancellationToken);
        return projects is null ? Forbid() : Ok(projects);
    }
}
