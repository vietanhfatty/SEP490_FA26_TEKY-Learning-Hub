using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using TekyLearningHub.Application.Interfaces.Auth;

namespace TekyLearningHub.Api.Controllers.Auth;
[ApiController, Route("api/auth/shell-transfer"), EnableRateLimiting("account")]
public class ShellTransferController(IShellTransferService service) : ControllerBase
{
    [Authorize, HttpPost]
    public async Task<IActionResult> Begin(BeginTransferRequest request)
    {
        var result = await service.Begin(int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!), request);
        return result.Status switch { 200 => Ok(new { code = result.Code }), 400 => BadRequest(), 401 => Unauthorized(), _ => StatusCode(result.Status) };
    }
    [HttpPost("exchange")]
    public async Task<IActionResult> Exchange(ExchangeTransferRequest request)
    {
        var result = await service.Exchange(request, Request.Headers.Origin.ToString(), HttpContext.Connection.RemoteIpAddress?.ToString(), Request.Headers.UserAgent);
        return result?.Success == true ? Ok(result) : Unauthorized();
    }
}
