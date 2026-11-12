using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Infrastructure.Security;

public class JwtTokenGenerator : IJwtTokenGenerator
{
    private readonly IConfiguration _configuration;

    public JwtTokenGenerator(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateAccessToken(User user)
    {
        var secret = _configuration["Jwt:Secret"] ?? "TekyLearningHubSuperSecretKeyForDevelopment2026!MustBe32BytesOrLonger";
        var issuer = _configuration["Jwt:Issuer"] ?? "TekyLearningHub";
        var audience = _configuration["Jwt:Audience"] ?? "TekyLearningHubUsers";
        var expiryMinutes = GetAccessTokenExpiryMinutes();

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var roleName = user.Role?.RoleName?.ToLowerInvariant() ?? GetRoleNameFromId(user.RoleId);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.UserId.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, user.FullName),
            new(ClaimTypes.Role, roleName),
            new("role_id", user.RoleId.ToString()),
            new("role_name", roleName),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(expiryMinutes),
            Issuer = issuer,
            Audience = audience,
            SigningCredentials = credentials
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes)
            .Replace("+", "-")
            .Replace("/", "_")
            .Replace("=", "");
    }

    public int GetAccessTokenExpiryMinutes()
    {
        if (int.TryParse(_configuration["Jwt:ExpiryMinutes"], out var minutes))
        {
            return minutes;
        }
        return 1440; // Default 24 hours
    }

    private static string GetRoleNameFromId(byte roleId)
    {
        return roleId switch
        {
            1 => "student",
            2 => "parent",
            3 => "teacher",
            4 => "academic_manager",
            5 => "admin",
            _ => "student"
        };
    }
}

