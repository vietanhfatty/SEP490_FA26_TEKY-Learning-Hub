using System.Security.Cryptography;
using System.Text;
using TekyLearningHub.Application.DTOs.Auth;
using TekyLearningHub.Application.DTOs.Common;
using TekyLearningHub.Application.Interfaces.Auth;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Domain.Security;

namespace TekyLearningHub.Application.Services.Auth;

public class AuthService : IAuthService
{
    private readonly IAuthRepository _context;
    private readonly IUnitOfWork _unit;
    private readonly IAccountEmailOutbox _email;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;

    public AuthService(
        IAuthRepository context,
        IPasswordHasher passwordHasher,
        IJwtTokenGenerator jwtTokenGenerator, IUnitOfWork unit, IAccountEmailOutbox email)
    {
        _context = context;
        _unit = unit; _email = email;
        _passwordHasher = passwordHasher;
        _jwtTokenGenerator = jwtTokenGenerator;
    }

    public async Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginRequestDto request, string? ipAddress, string? userAgent)
    {
        for (var attempt = 0; ; attempt++)
        {
            try { return await LoginCoreAsync(request, ipAddress, userAgent); }
            catch (PersistenceConflictException e) when (!e.Duplicate && attempt < 7) { _unit.Reset(); }
        }
    }

    private async Task<ApiResponse<AuthResponseDto>> LoginCoreAsync(LoginRequestDto request, string? ipAddress, string? userAgent)
    {
        var identifier = request.EmailOrUsername.Trim();
        var isEmail = identifier.Contains('@');

        // Search user by email or by username prefix/phone
        var user = await _context.FindByIdentifier(identifier);

        if (user == null || !UserAuthorization.HasValidPrimaryRole(user))
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
        if (user.LockoutEndAt != null) { user.LockoutEndAt = null; user.FailedLoginCount = 0; }
        var isPasswordValid = _passwordHasher.VerifyPassword(request.Password, user.PasswordHash);
        if (!isPasswordValid)
        {
            user.FailedLoginCount++;
            if (user.FailedLoginCount > 5)
            {
                user.LockoutEndAt = DateTime.UtcNow.AddMinutes(15);
                _email.Enqueue(user.Email, "TEKY - Cảnh báo đăng nhập", "Tài khoản tạm khóa trong 15 phút do nhập sai mật khẩu quá 5 lần.");
            }
            await _unit.SaveChangesAsync();

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

        _context.AddSession(session);
        await _unit.SaveChangesAsync();

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
        var session = await _context.FindSession(tokenHash);

        if (session == null)
        {
            return ApiResponse<AuthResponseDto>.FailureResult("Refresh token không hợp lệ hoặc phiên đăng nhập đã kết thúc.");
        }

        var user = session.User;
        if (user == null || !UserAuthorization.HasValidPrimaryRole(user) || !user.Status.Equals("Active", StringComparison.OrdinalIgnoreCase))
        {
            return ApiResponse<AuthResponseDto>.FailureResult("Tài khoản không hoạt động hoặc không tồn tại.");
        }

        // Check token expiration (30 days)
        if (DateTime.UtcNow - session.LoginAt > TimeSpan.FromDays(30))
        {
            session.IsActive = false;
            session.LogoutAt = DateTime.UtcNow;
            await _unit.SaveChangesAsync();
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

        _context.AddSession(newSession);
        await _unit.SaveChangesAsync();

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
            var session = await _context.FindSession(tokenHash);

            if (session != null)
            {
                session.IsActive = false;
                session.LogoutAt = DateTime.UtcNow;
                effectiveUserId ??= session.UserId;
                roleName ??= session.User?.PrimaryRole?.RoleName;
            }
        }

        // 2. Thu hồi toàn bộ phiên hoạt động nếu allDevices == true
        if (allDevices && effectiveUserId.HasValue)
        {
            var activeSessions = await _context.ActiveSessions(effectiveUserId.Value);

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
                var user = await _context.FindUser(effectiveUserId.Value);
                roleName = user?.PrimaryRole?.RoleName;
            }

            var auditLog = new AuditLog
            {
                ActorUserId = effectiveUserId.Value,
                ActorType = TekyLearningHub.Domain.Constants.AuditActorTypes.User,
                Action = allDevices ? "USER_LOGOUT_ALL_DEVICES" : "USER_LOGOUT",
                EntityType = "UserSession",
                IpAddress = ipAddress,
                CreatedAt = DateTime.UtcNow
            };

            _context.AddAudit(auditLog);
        }

        await _unit.SaveChangesAsync();

        return ApiResponse<bool>.SuccessResult(true, "Thu hồi token và đăng xuất thành công.");
    }

    public async Task<ApiResponse<UserDto>> GetCurrentUserAsync(int userId)
    {
        var user = await _context.FindUser(userId);

        if (user == null || !UserAuthorization.HasValidPrimaryRole(user))
        {
            return ApiResponse<UserDto>.FailureResult("Không tìm thấy thông tin người dùng.");
        }

        return ApiResponse<UserDto>.SuccessResult(MapToUserDto(user));
    }

    private static UserDto MapToUserDto(User user)
    {
        var roleName = RoleNameNormalizer.Normalize(user.PrimaryRole?.RoleName) ?? RoleNameNormalizer.FromRoleId(user.PrimaryRoleId);

        return new UserDto
        {
            UserId = user.UserId,
            Email = user.Email,
            FullName = user.FullName,
            Role = roleName,
            RoleId = user.PrimaryRoleId,
            Roles = UserAuthorization.Roles(user),
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

