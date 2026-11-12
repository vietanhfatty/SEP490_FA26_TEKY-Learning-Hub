using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TekyLearningHub.Application.DTOs.Auth;
using TekyLearningHub.Application.DTOs.Common;
using TekyLearningHub.Application.Interfaces;

namespace TekyLearningHub.Api.Controllers;

[ApiController]
[Route("api/auth")]
[Produces("application/json")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    /// <summary>
    /// Đăng nhập tập trung đa vai trò (Học sinh, Phụ huynh, Giáo viên, QL Học thuật, Quản trị viên)
    /// </summary>
    [HttpPost("login")]
    [ProducesResponseType(typeof(ApiResponse<AuthResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<AuthResponseDto>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<AuthResponseDto>), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
                .ToList();

            return BadRequest(ApiResponse<AuthResponseDto>.FailureResult("Dữ liệu đăng nhập không hợp lệ.", errors));
        }

        var ipAddress = GetClientIpAddress();
        var userAgent = Request.Headers.UserAgent.ToString();

        var result = await _authService.LoginAsync(request, ipAddress, userAgent);
        if (!result.Success)
        {
            return Unauthorized(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Cấp phát lại JWT Access Token mới bằng Refresh Token
    /// </summary>
    [HttpPost("refresh-token")]
    [ProducesResponseType(typeof(ApiResponse<AuthResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<AuthResponseDto>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return BadRequest(ApiResponse<AuthResponseDto>.FailureResult("Refresh token không được để trống."));
        }

        var ipAddress = GetClientIpAddress();
        var userAgent = Request.Headers.UserAgent.ToString();

        var result = await _authService.RefreshTokenAsync(request.RefreshToken, ipAddress, userAgent);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Thu hồi Refresh Token khi người dùng chủ động đăng xuất
    /// </summary>
    [HttpPost("revoke-token")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    public async Task<IActionResult> RevokeToken([FromBody] RevokeTokenRequestDto request)
    {
        var ipAddress = GetClientIpAddress();
        var result = await _authService.RevokeTokenAsync(request.RefreshToken, ipAddress);
        return Ok(result);
    }

    /// <summary>
    /// Lấy thông tin người dùng hiện tại từ JWT Bearer Token
    /// </summary>
    [Authorize]
    [HttpGet("me")]
    [ProducesResponseType(typeof(ApiResponse<UserDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(ApiResponse<UserDto>.FailureResult("Token không hợp lệ hoặc đã hết hạn."));
        }

        var result = await _authService.GetCurrentUserAsync(userId);
        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }

    private string? GetClientIpAddress()
    {
        if (Request.Headers.TryGetValue("X-Forwarded-For", out var forwarded))
        {
            return forwarded.ToString().Split(',')[0].Trim();
        }
        return HttpContext.Connection.RemoteIpAddress?.ToString();
    }
}

