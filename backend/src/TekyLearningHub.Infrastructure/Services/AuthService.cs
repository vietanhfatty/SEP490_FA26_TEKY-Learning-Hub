using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.DTOs.Auth;
using TekyLearningHub.Application.DTOs.Common;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly IApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;

    public AuthService(
        IApplicationDbContext context,
        IPasswordHasher passwordHasher,
        IJwtTokenGenerator jwtTokenGenerator)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _jwtTokenGenerator = jwtTokenGenerator;
    }

    public async Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginRequestDto request, string? ipAddress, string? userAgent)
    {
        var identifier = request.EmailOrUsername.Trim();
        var isEmail = identifier.Contains('@');

        // Search user by email or by username prefix/phone
        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u =>
                (isEmail && u.Email.ToLower() == identifier.ToLower()) ||
                (!isEmail && (u.Email.ToLower().StartsWith(identifier.ToLower() + "@") ||
                              u.Email.ToLower() == identifier.ToLower() ||
                              u.Phone == identifier)));

        if (user == null)
        {
            return ApiResponse<AuthResponseDto>.FailureResult("Tài khoản hoặc mật khẩu không chính xác.");
        }

        if (user.Status.Equals("Locked", StringComparison.OrdinalIgnoreCase))
        {
            return ApiResponse<AuthResponseDto>.FailureResult("Tài khoản đã bị tạm khóa do nhập sai mật khẩu nhiều lần. Vui lòng liên hệ quản trị viên.");
        }

        if (!user.Status.Equals("Active", StringComparison.OrdinalIgnoreCase))
        {
            return ApiResponse<AuthResponseDto>.FailureResult($"Tài khoản hiện đang ở trạng thái '{user.Status}'. Vui lòng liên hệ ban đào tạo.");
        }

        var isPasswordValid = _passwordHasher.VerifyPassword(request.Password, user.PasswordHash);
        if (!isPasswordValid)
        {
            user.FailedLoginCount++;
            if (user.FailedLoginCount >= 5)
            {
                user.Status = "Locked";
            }
            await _context.SaveChangesAsync();

            return ApiResponse<AuthResponseDto>.FailureResult("Tài khoản hoặc mật khẩu không chính xác.");
        }

        // Successful authentication
        user.FailedLoginCount = 0;
        user.LastLoginAt = DateTime.UtcNow;

        var accessToken = _jwtTokenGenerator.GenerateAccessToken(user);
        var refreshToken = _jwtTokenGenerator.GenerateRefreshToken();
        var tokenHash = HashToken(refreshToken);

        var session = new UserSession
        {
            UserId = user.UserId,
            TokenHash = tokenHash,
            IpAddress = ipAddress,
            UserAgent = userAgent,
            LoginAt = DateTime.UtcNow,
            IsActive = true
        };

        _context.UserSessions.Add(session);
        await _context.SaveChangesAsync();

        var authResponse = new AuthResponseDto
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            TokenType = "Bearer",
            ExpiresIn = _jwtTokenGenerator.GetAccessTokenExpiryMinutes() * 60,
            User = MapToUserDto(user)
        };

        return ApiResponse<AuthResponseDto>.SuccessResult(authResponse, "Đăng nhập thành công.");
    }

    public async Task<ApiResponse<AuthResponseDto>> RefreshTokenAsync(string refreshToken, string? ipAddress, string? userAgent)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return ApiResponse<AuthResponseDto>.FailureResult("Refresh token không được để trống.");
        }

        var tokenHash = HashToken(refreshToken);
        var session = await _context.UserSessions
            .Include(s => s.User)
            .ThenInclude(u => u.Role)
            .FirstOrDefaultAsync(s => s.TokenHash == tokenHash && s.IsActive);

        if (session == null)
        {
            return ApiResponse<AuthResponseDto>.FailureResult("Refresh token không hợp lệ hoặc phiên đăng nhập đã kết thúc.");
        }

        var user = session.User;
        if (user == null || !user.Status.Equals("Active", StringComparison.OrdinalIgnoreCase))
        {
            return ApiResponse<AuthResponseDto>.FailureResult("Tài khoản không hoạt động hoặc không tồn tại.");
        }

        // Check token expiration (30 days)
        if (DateTime.UtcNow - session.LoginAt > TimeSpan.FromDays(30))
        {
            session.IsActive = false;
            session.LogoutAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return ApiResponse<AuthResponseDto>.FailureResult("Refresh token đã hết hạn. Vui lòng đăng nhập lại.");
        }

        // Revoke old session (Rotation)
        session.IsActive = false;
        session.LogoutAt = DateTime.UtcNow;

        // Generate new tokens
        var newAccessToken = _jwtTokenGenerator.GenerateAccessToken(user);
        var newRefreshToken = _jwtTokenGenerator.GenerateRefreshToken();

        var newSession = new UserSession
        {
            UserId = user.UserId,
            TokenHash = HashToken(newRefreshToken),
            IpAddress = ipAddress,
            UserAgent = userAgent,
            LoginAt = DateTime.UtcNow,
            IsActive = true
        };

        _context.UserSessions.Add(newSession);
        await _context.SaveChangesAsync();

        var response = new AuthResponseDto
        {
            AccessToken = newAccessToken,
            RefreshToken = newRefreshToken,
            TokenType = "Bearer",
            ExpiresIn = _jwtTokenGenerator.GetAccessTokenExpiryMinutes() * 60,
            User = MapToUserDto(user)
        };

        return ApiResponse<AuthResponseDto>.SuccessResult(response, "Cấp lại token thành công.");
    }

    public async Task<ApiResponse<bool>> RevokeTokenAsync(string refreshToken, string? ipAddress)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return ApiResponse<bool>.FailureResult("Refresh token không hợp lệ.");
        }

        var tokenHash = HashToken(refreshToken);
        var session = await _context.UserSessions
            .FirstOrDefaultAsync(s => s.TokenHash == tokenHash && s.IsActive);

        if (session != null)
        {
            session.IsActive = false;
            session.LogoutAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        return ApiResponse<bool>.SuccessResult(true, "Thu hồi token và đăng xuất thành công.");
    }

    public async Task<ApiResponse<UserDto>> GetCurrentUserAsync(int userId)
    {
        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.UserId == userId);

        if (user == null)
        {
            return ApiResponse<UserDto>.FailureResult("Không tìm thấy thông tin người dùng.");
        }

        return ApiResponse<UserDto>.SuccessResult(MapToUserDto(user));
    }

    private static UserDto MapToUserDto(User user)
    {
        var roleName = user.Role?.RoleName?.ToLowerInvariant() ?? GetRoleNameFromId(user.RoleId);

        return new UserDto
        {
            UserId = user.UserId,
            Email = user.Email,
            FullName = user.FullName,
            Role = roleName,
            RoleId = user.RoleId,
            AvatarUrl = user.AvatarUrl,
            Phone = user.Phone,
            Status = user.Status,
            ThemeMode = user.ThemeMode
        };
    }

    private static string GetRoleNameFromId(byte roleId)
    {
        return roleId switch
        {
            1 => "student",
            2 => "teacher",
            3 => "admin",
            4 => "parent",
            5 => "staff",
            6 => "academic_manager",
            _ => "student"
        };
    }

    private static string HashToken(string token)
    {
        using var sha256 = SHA256.Create();
        var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes);
    }
}

