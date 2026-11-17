using System.Security.Cryptography;
using System.Text;
using TekyLearningHub.Application.DTOs.Auth;
using TekyLearningHub.Application.DTOs.Common;
using TekyLearningHub.Application.Interfaces.Auth;

namespace TekyLearningHub.Application.Services.Auth;

public sealed class ShellTransferService(IShellSessionRepository sessions, ITransferTicketStore tickets, IAuthService auth, ShellOptions options) : IShellTransferService
{
    static string Encode(byte[] bytes) => Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    public async Task<BeginTransferResult> Begin(int userId, BeginTransferRequest request)
    {
        if (!new[] { options.PortalOrigin, options.BackofficeOrigin }.Contains(request.Destination) || request.Challenge?.Length != 43 || string.IsNullOrWhiteSpace(request.RefreshToken)) return new(null, 400);
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(request.RefreshToken)));
        if (!await sessions.ActiveSession(userId, hash, DateTime.UtcNow.AddDays(-30))) return new(null, 401);
        var code = Encode(RandomNumberGenerator.GetBytes(32)); var now = DateTime.UtcNow;
        return tickets.TryAdd(code, new(request.RefreshToken, request.Challenge, request.Destination, now.AddSeconds(30)), now, 1000) ? new(code, 200) : new(null, 429);
    }
    public async Task<ApiResponse<AuthResponseDto>?> Exchange(ExchangeTransferRequest request, string origin, string? ip, string? userAgent)
    {
        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Verifier) || request.Verifier.Length > 128 || !tickets.TryTake(request.Code, out var ticket)) return null;
        var challenge = Encode(SHA256.HashData(Encoding.ASCII.GetBytes(request.Verifier)));
        if (ticket is null || ticket.Expires < DateTime.UtcNow || ticket.Challenge != challenge || origin != ticket.Destination) return null;
        return await auth.RefreshTokenAsync(ticket.RefreshToken, ip, userAgent);
    }
}
