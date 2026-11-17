using System.Text.Json;

namespace TekyLearningHub.Application.Interfaces.Portal;

public record ParentCheckout(
    int PaymentId, int ParentId, int StudentId, int CourseId, string Reference, int AmountVnd, string Status,
    string CourseName, string ClassCode, long OrderCode, string Provider, DateTime ExpiresAt,
    string? ProviderLinkId, string? CheckoutUrl, string? QrCode, bool IsOpen, DateTime? LastCheckedAt);

public record ParentCheckoutDto(
    int PaymentId, string CourseName, string ClassCode, int AmountVnd, string Status, string Provider,
    DateTime ExpiresAt, string? CheckoutUrl, string? QrCode, string? DemoReference)
{
    public static ParentCheckoutDto From(ParentCheckout row) => new(
        row.PaymentId, row.CourseName, row.ClassCode, row.AmountVnd, row.Status, row.Provider,
        DateTime.SpecifyKind(row.ExpiresAt, DateTimeKind.Utc), row.IsOpen ? row.CheckoutUrl : null,
        row.IsOpen ? row.QrCode : null, row.IsOpen && row.Provider == "Demo" ? row.Reference : null);
}

public record CheckoutLink(string Id, string Url, string? QrCode);
public record CheckoutStatus(long OrderCode, string LinkId, int Amount, int AmountPaid, int AmountRemaining, string Status);

public sealed class CheckoutGatewayException(string message, Exception? inner = null) : Exception(message, inner);

public interface ICheckoutGateway
{
    string? Provider { get; }
    Task<CheckoutLink> Create(ParentCheckout row, CancellationToken ct);
    Task<CheckoutStatus?> Status(long orderCode, CancellationToken ct);
    long? VerifyWebhook(JsonElement payload);
}

public interface IParentCheckoutRepository
{
    Task<ParentCheckout?> Reserve(int parentId, int studentId, int classId, string provider, long orderCode,
        DateTime expiresAt, CancellationToken ct);
    Task<IReadOnlyList<ParentCheckout>> ForParent(int parentId, int studentId, CancellationToken ct);
    Task<ParentCheckout?> ByOrder(long orderCode, CancellationToken ct);
    Task<ParentCheckout?> DemoByReference(string reference, CancellationToken ct);
    Task SaveLink(int paymentId, CheckoutLink link, CancellationToken ct);
    Task Resolve(int paymentId, string provider, bool paid, string? linkId, CancellationToken ct);
    Task<IReadOnlyList<ParentCheckout>> Due(string provider, CancellationToken ct);
    Task MarkChecked(int paymentId, CancellationToken ct);
}

public interface IParentCheckoutService
{
    Task<ParentCheckoutDto?> Buy(int parentId, int studentId, int classId, CancellationToken ct);
    Task<IReadOnlyList<ParentCheckoutDto>?> List(int parentId, int studentId, CancellationToken ct);
    Task<bool> Webhook(JsonElement payload, CancellationToken ct);
    Task<ParentCheckoutDto?> Demo(string reference, bool confirm, CancellationToken ct);
    Task Reconcile(CancellationToken ct);
}
