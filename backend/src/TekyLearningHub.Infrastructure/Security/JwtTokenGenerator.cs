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

        var roleName = RoleNameNormalizer.Normalize(user.Role?.RoleName) ?? RoleNameNormalizer.FromRoleId(user.RoleId);

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
        // Mapping bám sát enum Domain UserRole (Student=1, Teacher=2, Admin=3, Parent=4, Staff=5, AcademicManager=6)
        return RoleNameNormalizer.FromRoleId(roleId);
    }
}

