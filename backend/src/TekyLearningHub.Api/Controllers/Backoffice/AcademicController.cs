using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TekyLearningHub.Application.DTOs.Backoffice;
using TekyLearningHub.Application.Interfaces.Backoffice;
namespace TekyLearningHub.Api.Controllers.Backoffice;

[ApiController, Authorize, Route("api/academic")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class AcademicController(IAcademicService service) : ControllerBase
{
    private int Actor => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    [HttpGet("workspace")]
    public Task<AcademicWorkspace> Workspace(DateOnly from, DateOnly to, CancellationToken ct) => service.Workspace(Actor, from, to, ct);
    [HttpPost("classes")]
    public Task<AcademicMutation> SaveClass(AcademicClassDraft request, CancellationToken ct) => service.SaveClass(Actor, request, ct);
    [HttpPost("placements")]
    public Task<AcademicMutation> PlaceStudent(AcademicPlacement request, CancellationToken ct) => service.PlaceStudent(Actor, request, ct);
    [HttpPost("teachers/assign")]
    public Task<AcademicMutation> AssignTeacher(AcademicTeacherAssignment request, CancellationToken ct) => service.AssignTeacher(Actor, request, ct);
    [HttpPost("teachers/availability")]
    public Task<AcademicMutation> SaveAvailability(AcademicAvailabilityDraft request, CancellationToken ct) => service.SaveAvailability(Actor, request, ct);
    [HttpPost("sessions")]
    public Task<AcademicMutation> SaveSession(AcademicSessionDraft request, CancellationToken ct) => service.SaveSession(Actor, request, ct);
    [HttpPost("rooms")]
    public Task<AcademicMutation> SaveRoom(AcademicRoomDraft request, CancellationToken ct) => service.SaveRoom(Actor, request, ct);
    [HttpPost("courses/review")]
    public Task<AcademicMutation> ReviewCourse(AcademicReview request, CancellationToken ct) => service.ReviewCourse(Actor, request, ct);
    [HttpPost("registrations/review")]
    public Task<AcademicMutation> ReviewRegistration(AcademicRegistrationReview request, CancellationToken ct) => service.ReviewRegistration(Actor, request, ct);
    [HttpPost("makeup/review")]
    public Task<AcademicMutation> ReviewMakeup(AcademicMakeupReview request, CancellationToken ct) => service.ReviewMakeup(Actor, request, ct);
    [HttpPost("equipment")]
    public Task<AcademicMutation> SaveEquipment(AcademicEquipmentDraft request, CancellationToken ct) => service.SaveEquipment(Actor, request, ct);
}
