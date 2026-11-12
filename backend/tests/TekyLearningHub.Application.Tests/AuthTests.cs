using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.Extensions.Configuration;
using TekyLearningHub.Application.DTOs.Auth;
using TekyLearningHub.Application.Validators;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Infrastructure.Security;
using Xunit;

namespace TekyLearningHub.Application.Tests;

public class AuthTests
{
    [Fact]
    public void PasswordHasher_ShouldHashAndVerifyPasswordCorrectly()
    {
        // Arrange
        var hasher = new PasswordHasher();
        var rawPassword = "Teky@2026!";

        // Act
        var hash = hasher.HashPassword(rawPassword);
        var isValid = hasher.VerifyPassword(rawPassword, hash);
        var isInvalid = hasher.VerifyPassword("WrongPassword123!", hash);

        // Assert
        Assert.NotNull(hash);
        Assert.StartsWith("$2", hash); // BCrypt signature
        Assert.True(isValid);
        Assert.False(isInvalid);
    }

    [Theory]
    [InlineData(1, "student")]
    [InlineData(2, "parent")]
    [InlineData(3, "teacher")]
    [InlineData(4, "academic_manager")]
    [InlineData(5, "admin")]
    public void JwtTokenGenerator_ShouldGenerateValidTokenWithCorrectRole(byte roleId, string expectedRole)
    {
        // Arrange
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

        var generator = new JwtTokenGenerator(configuration);
        var user = new User
        {
            UserId = 100 + roleId,
            Email = $"{expectedRole}@teky.edu.vn",
            FullName = $"Test {expectedRole}",
            RoleId = roleId,
            Role = new Role { RoleId = roleId, RoleName = expectedRole }
        };

        // Act
        var token = generator.GenerateAccessToken(user);
        var refreshToken = generator.GenerateRefreshToken();

        // Assert
        Assert.NotNull(token);
        Assert.NotEmpty(token);
        Assert.NotNull(refreshToken);
        Assert.NotEmpty(refreshToken);

        // Validate token claims
        var handler = new JwtSecurityTokenHandler();
        var jwtToken = handler.ReadJwtToken(token);

        Assert.Equal("TekyLearningHub", jwtToken.Issuer);
        var roleClaim = jwtToken.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role || c.Type == "role");
        Assert.NotNull(roleClaim);
        Assert.Equal(expectedRole, roleClaim.Value);

        var emailClaim = jwtToken.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email || c.Type == "email");
        Assert.NotNull(emailClaim);
        Assert.Equal(user.Email, emailClaim.Value);
    }

    [Fact]
    public void LoginRequestValidator_ShouldFailWhenFieldsAreEmpty()
    {
        // Arrange
        var validator = new LoginRequestValidator();
        var request = new LoginRequestDto
        {
            EmailOrUsername = "",
            Password = ""
        };

        // Act
        var result = validator.Validate(request);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(LoginRequestDto.EmailOrUsername));
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(LoginRequestDto.Password));
    }
}

