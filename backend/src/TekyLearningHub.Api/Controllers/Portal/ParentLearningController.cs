using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TekyLearningHub.Application.Interfaces.Portal;

namespace TekyLearningHub.Api.Controllers.Portal;

[ApiController, Authorize(Roles = "parent"), Route("api/parent/children")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class ParentLearningController(IParentLearningService service) : ControllerBase
{
    private int? ParentId => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    [HttpGet]
    public async Task<IActionResult> Children(CancellationToken ct) =>
        ParentId is int id ? Ok(await service.Children(id, ct)) : Unauthorized();

    [HttpGet("{studentId:int:min(1)}/learning")]
    public async Task<IActionResult> Learning(int studentId, CancellationToken ct)
    {
        if (ParentId is not int id) return Unauthorized();
        return await service.Learning(id, studentId, ct) is { } data ? Ok(data) : NotFound();
    }
}
