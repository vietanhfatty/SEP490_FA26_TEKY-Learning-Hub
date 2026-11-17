using TekyLearningHub.Application.DTOs.Auth;

namespace TekyLearningHub.Application.Interfaces.Auth;

public interface IAccountAccessReader
{
    Task<AccountAccessDto> Read(int userId, CancellationToken ct = default, bool includeInactive = false);
}
