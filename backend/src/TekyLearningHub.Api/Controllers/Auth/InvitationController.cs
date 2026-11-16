using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using TekyLearningHub.Application.DTOs.Auth;
using TekyLearningHub.Application.Interfaces.Admin;
using TekyLearningHub.Application.Services.Admin;

namespace TekyLearningHub.Api.Controllers.Auth;

[ApiController, Route("api/auth"), AllowAnonymous, EnableRateLimiting("account")]
public sealed class InvitationController(IUserAdministrationService service, ILogger<InvitationController> logger) : ControllerBase
{
    [HttpPost("accept-invitation")] public async Task<IActionResult> Accept(AcceptInvitationRequest r, CancellationToken ct) { try { return Ok(await service.Accept(r, ct)); } catch (UserAdministrationException e) { return StatusCode(e.Status, new { message = e.Message }); } catch (OperationCanceledException) { throw; } catch (Exception e) { logger.LogError(e, "Invitation activation failed"); return Problem(statusCode: 503, title: "Không thể kích hoạt tài khoản."); } }
}
