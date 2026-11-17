using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using TekyLearningHub.Application.Interfaces.Portal;

namespace TekyLearningHub.Application.Services.Portal;

public sealed class ParentCheckoutService(
    IParentCheckoutRepository repository, IParentLearningService learning, ICheckoutGateway gateway,
    ILogger<ParentCheckoutService> logger) : IParentCheckoutService
{
    public async Task<ParentCheckoutDto?> Buy(int parentId, int studentId, int classId, CancellationToken ct)
    {
        var provider = gateway.Provider ?? throw new CheckoutGatewayException("Cổng thanh toán chưa được cấu hình.");
        var random = RandomNumberGenerator.GetBytes(sizeof(long));
        var orderCode = (BitConverter.ToInt64(random) & ((1L << 52) - 1)) + 1;
        var expiresAt = DateTime.UtcNow.AddMinutes(30);
        var row = await repository.Reserve(parentId, studentId, classId, provider, orderCode, expiresAt, ct);
        if (row is null) return null;
        if (row.Provider != provider)
            throw new CheckoutGatewayException("Đơn cũ đang sử dụng cổng thanh toán khác.");
        if (row.Provider == "PayOS" && row.ProviderLinkId is null && row.ExpiresAt > DateTime.UtcNow)
        {
            var link = await gateway.Create(row, ct);
            await repository.SaveLink(row.PaymentId, link, ct);
            row = (await repository.ByOrder(row.OrderCode, ct))!;
        }
        return ParentCheckoutDto.From(row);
    }

    public async Task<IReadOnlyList<ParentCheckoutDto>?> List(int parentId, int studentId, CancellationToken ct)
    {
        if (!(await learning.Children(parentId, ct)).Any(row => row.StudentId == studentId)) return null;
        return (await repository.ForParent(parentId, studentId, ct)).Select(ParentCheckoutDto.From).ToArray();
    }

    public async Task<bool> Webhook(JsonElement payload, CancellationToken ct)
    {
        if (gateway.Provider != "PayOS" || gateway.VerifyWebhook(payload) is not long orderCode) return false;
        var row = await repository.ByOrder(orderCode, ct);
        if (row is { Provider: "PayOS", IsOpen: true })
            await Refresh(row, ct);
        return true;
    }

    public async Task<ParentCheckoutDto?> Demo(string reference, bool confirm, CancellationToken ct)
    {
        if (gateway.Provider != "Demo" || !Guid.TryParseExact(reference, "N", out _)) return null;
        var row = await repository.DemoByReference(reference, ct);
        if (row is not { Provider: "Demo" }) return null;
        if (row.IsOpen && (confirm || row.ExpiresAt <= DateTime.UtcNow))
        {
            await repository.Resolve(row.PaymentId, row.Provider, confirm && row.ExpiresAt > DateTime.UtcNow, null, ct);
            row = (await repository.ByOrder(row.OrderCode, ct))!;
        }
        return ParentCheckoutDto.From(row);
    }

    public async Task Reconcile(CancellationToken ct)
    {
        if (gateway.Provider is not string provider) return;
        foreach (var row in await repository.Due(provider, ct))
        {
            await repository.MarkChecked(row.PaymentId, ct);
            try
            {
                if (provider == "Demo")
                    await repository.Resolve(row.PaymentId, provider, false, null, ct);
                else
                    await Refresh(row, ct);
            }
            catch (CheckoutGatewayException failure)
            {
                logger.LogWarning(failure, "Could not verify checkout {PaymentId} with payOS.", row.PaymentId);
            }
        }
    }

    private async Task Refresh(ParentCheckout row, CancellationToken ct)
    {
        var status = await gateway.Status(row.OrderCode, ct);
        if (status is null)
        {
            if (row.ProviderLinkId is null && row.ExpiresAt.AddMinutes(5) < DateTime.UtcNow)
                await repository.Resolve(row.PaymentId, row.Provider, false, null, ct);
            return;
        }
        if (status.OrderCode != row.OrderCode || status.Amount != row.AmountVnd ||
            (row.ProviderLinkId is not null && row.ProviderLinkId != status.LinkId))
            throw new CheckoutGatewayException("Dữ liệu đối soát không khớp với đơn.");
        if (status is { Status: "PAID", AmountRemaining: 0 } && status.AmountPaid >= row.AmountVnd)
            await repository.Resolve(row.PaymentId, row.Provider, true, status.LinkId, ct);
        else if (status.Status is "CANCELLED" or "EXPIRED" && status.AmountPaid == 0)
            await repository.Resolve(row.PaymentId, row.Provider, false, status.LinkId, ct);
    }
}
