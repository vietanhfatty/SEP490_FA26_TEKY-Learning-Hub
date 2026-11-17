using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.Interfaces;

public interface IJwtTokenGenerator
{
    string GenerateAccessToken(User user);
    string GenerateRefreshToken();
    int GetAccessTokenExpiryMinutes();
}

