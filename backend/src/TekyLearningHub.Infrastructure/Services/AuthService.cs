using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.DTOs.Auth;
using TekyLearningHub.Application.DTOs.Common;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Infrastructure.Security;

namespace TekyLearningHub.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly IApplicationDbContext _context;
    private readonly Microsoft.AspNetCore.DataProtection.IDataProtectionProvider? _protection;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;

    public AuthService(
        IApplicationDbContext context,
        IPasswordHasher passwordHasher,
        IJwtTokenGenerator jwtTokenGenerator, Microsoft.AspNetCore.DataProtection.IDataProtectionProvider? protection = null)
    {
        _context = context;
        _protection = protection;
        _passwordHasher = passwordHasher;
        _jwtTokenGenerator = jwtTokenGenerator;
    }

    public async Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginRequestDto request, string? ipAddress, string? userAgent)
    {
        for (var attempt=0; ; attempt++) {
            try { return await LoginCoreAsync(request,ipAddress,userAgent); }
            catch (DbUpdateConcurrencyException) when (attempt<7 && _context is TekyLearningHub.Infrastructure.Data.ApplicationDbContext db) { db.ChangeTracker.Clear(); }
        }
    }

    private async Task<ApiResponse<AuthResponseDto>> LoginCoreAsync(LoginRequestDto request, string? ipAddress, string? userAgent)
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

        if (user.LockoutEndAt > DateTime.UtcNow)
            return ApiResponse<AuthResponseDto>.FailureResult("Tài khoản hoặc mật khẩu không chính xác, hoặc tài khoản đang tạm khóa.");
        if (user.LockoutEndAt != null) {user.LockoutEndAt=null;user.FailedLoginCount=0;}
        var isPasswordValid = _passwordHasher.VerifyPassword(request.Password, user.PasswordHash);
        if (!isPasswordValid)
        {
            user.FailedLoginCount++;
            if (user.FailedLoginCount > 5)
            {
                user.LockoutEndAt = DateTime.UtcNow.AddMinutes(15);
                if (_context is TekyLearningHub.Infrastructure.Data.ApplicationDbContext db) {
                    // Queue delivery independently of SMTP availability.
                    var provider = _protection ?? throw new InvalidOperationException("Data protection is required for email.");
                    AccountEmailWorker.Enqueue(db, provider, user.Email, "TEKY - Cảnh báo đăng nhập", "Tài khoản tạm khóa trong 15 phút do nhập sai mật khẩu quá 5 lần.");
                }
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

        return await LogoutAsync(refreshToken, null, ipAddress, false);
    }

    public async Task<ApiResponse<bool>> LogoutAsync(string? refreshToken, int? userId, string? ipAddress, bool allDevices = false)
    {
        int? effectiveUserId = userId;
        string? roleName = null;

        // 1. Thu hồi phiên đăng nhập tương ứng với Refresh Token (nếu có)
        if (!string.IsNullOrWhiteSpace(refreshToken))
        {
            var tokenHash = HashToken(refreshToken);
            var session = await _context.UserSessions
                .Include(s => s.User)
                .ThenInclude(u => u.Role)
                .FirstOrDefaultAsync(s => s.TokenHash == tokenHash && s.IsActive);

            if (session != null)
            {
                session.IsActive = false;
                session.LogoutAt = DateTime.UtcNow;
                effectiveUserId ??= session.UserId;
                roleName ??= session.User?.Role?.RoleName;
            }
        }

        // 2. Thu hồi toàn bộ phiên hoạt động nếu allDevices == true
        if (allDevices && effectiveUserId.HasValue)
        {
            var activeSessions = await _context.UserSessions
                .Where(s => s.UserId == effectiveUserId.Value && s.IsActive)
                .ToListAsync();

            foreach (var s in activeSessions)
            {
                s.IsActive = false;
                s.LogoutAt = DateTime.UtcNow;
            }
        }

        // 3. Ghi nhận nhật ký bảo mật AuditLog nếu xác định được người dùng
        if (effectiveUserId.HasValue)
        {
            if (string.IsNullOrEmpty(roleName))
            {
                var user = await _context.Users
                    .Include(u => u.Role)
                    .FirstOrDefaultAsync(u => u.UserId == effectiveUserId.Value);
                roleName = user?.Role?.RoleName;
            }

            var auditLog = new AuditLog
            {
                ActorUserId = effectiveUserId.Value,
                ActorType = roleName ?? "User",
                Action = allDevices ? "USER_LOGOUT_ALL_DEVICES" : "USER_LOGOUT",
                EntityType = "UserSession",
                IpAddress = ipAddress,
                CreatedAt = DateTime.UtcNow
            };

            _context.AuditLogs.Add(auditLog);
        }

        await _context.SaveChangesAsync();

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
        var roleName = RoleNameNormalizer.Normalize(user.Role?.RoleName) ?? RoleNameNormalizer.FromRoleId(user.RoleId);

        return new UserDto
        {
            UserId = user.UserId,
            Email = user.Email,
            FullName = user.FullName,
            Role = roleName,
            RoleId = user.RoleId,
            AvatarUrl = user.AvatarUrl,
            Phone = user.Phone,
            Bio = user.Bio,
            Status = user.Status,
            ThemeMode = user.ThemeMode
        };
    }

    private static string GetRoleNameFromId(byte roleId)
    {
        return RoleNameNormalizer.FromRoleId(roleId);
    }

    private static string HashToken(string token)
    {
        using var sha256 = SHA256.Create();
        var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes);
    }
}

