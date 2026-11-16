using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using TekyLearningHub.Application.DTOs.Auth;
using TekyLearningHub.Application.Interfaces.Auth;

namespace TekyLearningHub.Api.Controllers.Auth;
[ApiController, Route("api"), EnableRateLimiting("account")]
public class AccountController(IAccountService service) : ControllerBase
{
    int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    IActionResult ResponseFor(AccountResult result) => result.Status switch
    {
        200 => Ok(new { success = true, message = result.Message }),
        400 => BadRequest(new { message = result.Message }),
        409 => Conflict(new { message = result.Message }),
        _ => StatusCode(result.Status, new { message = result.Message })
    };
    [HttpPost("auth/forgot-password")]
    public async Task<IActionResult> Forgot(ForgotPasswordRequest request) => ResponseFor(await service.Forgot(request));
    [HttpPost("auth/reset-password")]
    public async Task<IActionResult> Reset(ResetPasswordRequest request) => ResponseFor(await service.Reset(request));
    [Authorize, HttpPost("auth/change-password")]
    public async Task<IActionResult> Change(ChangePasswordRequest request) => ResponseFor(await service.Change(UserId, request));
    [Authorize, HttpPatch("users/me")]
    public async Task<IActionResult> Profile(UpdateProfileRequest request) => ResponseFor(await service.Profile(UserId, request));
    [Authorize, HttpPost("users/me/avatar"), RequestSizeLimit(2200000)]
    public async Task<IActionResult> Avatar(IFormFile avatar)
    {
        if (avatar.Length < 33 || avatar.Length > 2 * 1024 * 1024) return BadRequest(new { message = "Ảnh PNG phải nhỏ hơn 2 MB." });
        using var memory = new MemoryStream(); await avatar.CopyToAsync(memory); return ResponseFor(await service.Avatar(UserId, memory.ToArray()));
    }
    [Authorize, HttpGet("users/me/avatar")]
    public async Task<IActionResult> GetAvatar()
    {
        var bytes = await service.GetAvatar(UserId); if (bytes is null) return NotFound();
        Response.Headers.CacheControl = "private, no-store"; Response.Headers["X-Content-Type-Options"] = "nosniff";
        return File(bytes, "image/png");
    }
}
