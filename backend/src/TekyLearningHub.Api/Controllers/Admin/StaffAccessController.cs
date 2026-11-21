using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TekyLearningHub.Application.DTOs.Admin;
using TekyLearningHub.Application.Interfaces.Admin;

namespace TekyLearningHub.Api.Controllers.Admin;

[ApiController, Authorize, Route("api/admin")]
public sealed class StaffAccessController(IStaffAccessService service) : ControllerBase
{
    private int Actor => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    [HttpPost("staff-access/preview")] public async Task<IActionResult> PreviewNew(AppointmentInput[] appointments, CancellationToken ct) => Ok(await service.PreviewNew(Actor, appointments, ct));
    [HttpGet("position-policies")] public async Task<IActionResult> Policies(CancellationToken ct) => Ok(await service.Policies(Actor, ct));
    [HttpPost("position-policies/{id:int}/preview")] public async Task<IActionResult> PolicyPreview(int id, PolicyRequest request, CancellationToken ct) => Ok(await service.PolicyPreview(Actor, id, request, ct));
    [HttpPut("position-policies/{id:int}")] public async Task<IActionResult> Policy(int id, PolicyRequest request, CancellationToken ct) => Ok(await service.SavePolicy(Actor, id, request, ct));
    [HttpPost("positions")] public async Task<IActionResult> CreatePosition(PositionSaveRequest request, CancellationToken ct) => StatusCode(201, await service.SavePosition(Actor, null, request, ct));
    [HttpPut("positions/{id:int}")] public async Task<IActionResult> UpdatePosition(int id, PositionSaveRequest request, CancellationToken ct) => Ok(await service.SavePosition(Actor, id, request, ct));
    [HttpPost("users/{id:int}/staff-access/preview")] public async Task<IActionResult> Preview(int id, StaffChangeRequest request, CancellationToken ct) => Ok(await service.Preview(Actor, id, request, ct));
    [HttpPost("users/{id:int}/staff-access")] public async Task<IActionResult> Change(int id, StaffChangeRequest request, CancellationToken ct) => Ok(await service.Change(Actor, id, request, ct));
    [HttpPost("users/{id:int}/staff-access/reconcile/preview")] public async Task<IActionResult> ReconcilePreview(int id, ReconcileStaffRequest request, CancellationToken ct) => Ok(await service.ReconcilePreview(Actor, id, request, ct));
    [HttpPost("users/{id:int}/staff-access/reconcile")] public async Task<IActionResult> Reconcile(int id, ReconcileStaffRequest request, CancellationToken ct) => Ok(await service.Reconcile(Actor, id, request, ct));
    [HttpPost("users/{id:int}/staff-access/exceptions/preview")] public async Task<IActionResult> ExceptionPreview(int id, StaffExceptionRequest request, CancellationToken ct) => Ok(await service.ExceptionPreview(Actor, id, request, ct));
    [HttpPost("users/{id:int}/staff-access/exceptions")] public async Task<IActionResult> Exception(int id, StaffExceptionRequest request, CancellationToken ct) => Ok(await service.GrantException(Actor, id, request, ct));
}
