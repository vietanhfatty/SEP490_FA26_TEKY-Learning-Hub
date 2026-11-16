using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TekyLearningHub.Application.DTOs.Portal;
using TekyLearningHub.Application.Interfaces.Portal;

namespace TekyLearningHub.Api.Controllers.Portal;

[ApiController]
[Authorize(Roles = "student")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[Route("api/student/assessments")]
public sealed class StudentAssessmentsController(IStudentAssessmentsService service) : ControllerBase
{
    private int? StudentId => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct) =>
        StudentId is int student ? Ok(await service.List(student, ct)) : Unauthorized();

    [HttpGet("{id:int:min(1)}")]
    public async Task<IActionResult> Detail(int id, CancellationToken ct)
    {
        if (StudentId is not int student) return Unauthorized();
        return await service.Detail(student, id, ct) is { } detail ? Ok(detail) : NotFound();
    }

    [HttpPost("{id:int:min(1)}/start")]
    public async Task<IActionResult> Start(int id, CancellationToken ct) =>
        StudentId is int student ? ToResponse(await service.Start(student, id, ct)) : Unauthorized();

    [HttpPost("{id:int:min(1)}/submit")]
    [RequestSizeLimit(8192)]
    public async Task<IActionResult> Submit(int id, StudentAssessmentSubmission request, CancellationToken ct) =>
        StudentId is int student ? ToResponse(await service.Submit(student, id, request.Answers, ct)) : Unauthorized();

    private IActionResult ToResponse(StudentAssessmentOutcome outcome) => outcome.Detail is not null ? Ok(outcome.Detail)
        : outcome.Error is null ? NotFound() : Problem(statusCode: outcome.Invalid ? 400 : 409, title: outcome.Error);
}
