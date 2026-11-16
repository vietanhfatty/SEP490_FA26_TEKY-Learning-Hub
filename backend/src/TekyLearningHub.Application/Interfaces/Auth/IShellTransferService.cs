using TekyLearningHub.Application.DTOs.Auth;
using TekyLearningHub.Application.DTOs.Common;

namespace TekyLearningHub.Application.Interfaces.Auth;

public record BeginTransferRequest(string RefreshToken, string Challenge, string Destination);
public record ExchangeTransferRequest(string Code, string Verifier);
public record TransferTicket(string RefreshToken, string Challenge, string Destination, DateTime Expires);
public record BeginTransferResult(string? Code, int Status);
public sealed class ShellOptions { public string PortalOrigin { get; set; } = "http://localhost:3000"; public string BackofficeOrigin { get; set; } = "http://localhost:3001"; }
public interface IShellTransferService
{
    Task<BeginTransferResult> Begin(int userId, BeginTransferRequest request);
    Task<ApiResponse<AuthResponseDto>?> Exchange(ExchangeTransferRequest request, string origin, string? ip, string? userAgent);
}
public interface ITransferTicketStore
{
    bool TryAdd(string code, TransferTicket ticket, DateTime now, int limit);
    bool TryTake(string code, out TransferTicket? ticket);
}
public interface IShellSessionRepository { Task<bool> ActiveSession(int id, string hash, DateTime since); }
