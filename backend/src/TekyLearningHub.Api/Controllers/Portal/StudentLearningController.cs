using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TekyLearningHub.Infrastructure.Services.Portal;

namespace TekyLearningHub.Api.Controllers.Portal;
[ApiController, Authorize(Roles="student"), Route("api/student/courses")]
public sealed class StudentLearningController(StudentLearningService service) : ControllerBase {
    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    [HttpGet] public async Task<IActionResult> List(CancellationToken ct) => Ok(await service.Courses(UserId,ct));
    [HttpGet("{courseId:int:min(1)}")] public async Task<IActionResult> Detail(int courseId,CancellationToken ct) {
        var result=await service.Course(UserId,courseId,ct); return result is null ? NotFound() : Ok(result);
    }
    [HttpPost("{courseId:int:min(1)}/lessons/{lessonId:int:min(1)}/reviewed")]
    public async Task<IActionResult> Reviewed(int courseId,int lessonId,CancellationToken ct) =>
        await service.ReviewLesson(UserId,courseId,lessonId,ct) ? NoContent() : NotFound();
}
