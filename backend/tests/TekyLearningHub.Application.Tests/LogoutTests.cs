using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Infrastructure.Data;
using TekyLearningHub.Infrastructure.Security;
using TekyLearningHub.Infrastructure.Services;
using Xunit;

namespace TekyLearningHub.Application.Tests;

public class LogoutTests
{
    private ApplicationDbContext CreateInMemoryDbContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;

        return new ApplicationDbContext(options);
    }

    private static string HashToken(string token)
    {
        using var sha256 = SHA256.Create();
        var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes);
    }

    private AuthService CreateAuthService(ApplicationDbContext context)
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            { "Jwt:Secret", "TekyLearningHubSuperSecretKeyForDevelopment2026!MustBe32BytesOrLonger" },
            { "Jwt:Issuer", "TekyLearningHub" },
            { "Jwt:Audience", "TekyLearningHubUsers" },
            { "Jwt:ExpiryMinutes", "60" }
        };
        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var jwtGenerator = new JwtTokenGenerator(configuration);
        var passwordHasher = new PasswordHasher();

        return new AuthService(context, passwordHasher, jwtGenerator);
    }

    [Fact]
    public async Task LogoutAsync_WithValidRefreshToken_RevokesSessionAndCreatesAuditLog()
    {
        // Arrange
        using var context = CreateInMemoryDbContext(Guid.NewGuid().ToString());
        var authService = CreateAuthService(context);

        var role = new Role { RoleId = 1, RoleName = "student" };
        var user = new User
        {
            UserId = 10,
            Email = "student10@teky.edu.vn",
            FullName = "Nguyễn Văn Test",
            PasswordHash = "hash",
            RoleId = 1,
            Role = role,
            Status = "Active",
            ThemeMode = "light"
        };
        context.Roles.Add(role);
        context.Users.Add(user);

        var rawRefreshToken = "test-refresh-token-12345";
        var session = new UserSession
        {
            SessionId = 101,
            UserId = user.UserId,
            User = user,
            TokenHash = HashToken(rawRefreshToken),
            LoginAt = DateTime.UtcNow.AddHours(-1),
            IsActive = true,
            IpAddress = "127.0.0.1"
        };
        context.UserSessions.Add(session);
        await context.SaveChangesAsync();

        // Act
        var result = await authService.LogoutAsync(rawRefreshToken, user.UserId, "192.168.1.1", allDevices: false);

        // Assert
        Assert.True(result.Success);

        var updatedSession = await context.UserSessions.FirstAsync(s => s.SessionId == 101);
        Assert.False(updatedSession.IsActive);
        Assert.NotNull(updatedSession.LogoutAt);

        var auditLog = await context.AuditLogs.FirstOrDefaultAsync(a => a.ActorUserId == user.UserId);
        Assert.NotNull(auditLog);
        Assert.Equal("USER_LOGOUT", auditLog.Action);
        Assert.Equal("192.168.1.1", auditLog.IpAddress);
    }

    [Fact]
    public async Task LogoutAsync_WithAllDevices_RevokesAllActiveSessionsForUser()
    {
        // Arrange
        using var context = CreateInMemoryDbContext(Guid.NewGuid().ToString());
        var authService = CreateAuthService(context);

        var role = new Role { RoleId = 3, RoleName = "teacher" };
        var user = new User
        {
            UserId = 20,
            Email = "teacher20@teky.edu.vn",
            FullName = "Thầy Giáo Test",
            PasswordHash = "hash",
            RoleId = 3,
            Role = role,
            Status = "Active",
            ThemeMode = "dark"
        };
        context.Roles.Add(role);
        context.Users.Add(user);

        var session1 = new UserSession
        {
            SessionId = 201,
            UserId = user.UserId,
            User = user,
            TokenHash = HashToken("token-device-1"),
            LoginAt = DateTime.UtcNow.AddDays(-2),
            IsActive = true
        };
        var session2 = new UserSession
        {
            SessionId = 202,
            UserId = user.UserId,
            User = user,
            TokenHash = HashToken("token-device-2"),
            LoginAt = DateTime.UtcNow.AddHours(-3),
            IsActive = true
        };
        context.UserSessions.AddRange(session1, session2);
        await context.SaveChangesAsync();

        // Act
        var result = await authService.LogoutAsync("token-device-1", user.UserId, "10.0.0.1", allDevices: true);

        // Assert
        Assert.True(result.Success);

        var activeSessions = await context.UserSessions.Where(s => s.UserId == user.UserId && s.IsActive).ToListAsync();
        Assert.Empty(activeSessions);

        var auditLog = await context.AuditLogs.FirstOrDefaultAsync(a => a.ActorUserId == user.UserId);
        Assert.NotNull(auditLog);
        Assert.Equal("USER_LOGOUT_ALL_DEVICES", auditLog.Action);
    }

    [Fact]
    public async Task LogoutAsync_WithNonExistentToken_ReturnsSuccessIdempotent()
    {
        // Arrange
        using var context = CreateInMemoryDbContext(Guid.NewGuid().ToString());
        var authService = CreateAuthService(context);

        // Act
        var result = await authService.LogoutAsync("non-existent-token", null, "127.0.0.1", allDevices: false);

        // Assert
        Assert.True(result.Success);
    }
}
