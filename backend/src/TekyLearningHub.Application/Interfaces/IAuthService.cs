using TekyLearningHub.Application.DTOs.Auth;
using TekyLearningHub.Application.DTOs.Common;

namespace TekyLearningHub.Application.Interfaces;

public interface IAuthService
{
    Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginRequestDto request, string? ipAddress, string? userAgent);
    Task<ApiResponse<AuthResponseDto>> RefreshTokenAsync(string refreshToken, string? ipAddress, string? userAgent);
    Task<ApiResponse<bool>> RevokeTokenAsync(string refreshToken, string? ipAddress);
    Task<ApiResponse<UserDto>> GetCurrentUserAsync(int userId);
}

