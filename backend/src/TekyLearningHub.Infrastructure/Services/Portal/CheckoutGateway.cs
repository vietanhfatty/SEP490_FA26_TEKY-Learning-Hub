using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using TekyLearningHub.Application.Interfaces.Portal;

namespace TekyLearningHub.Infrastructure.Services.Portal;

public sealed class CheckoutGateway(HttpClient http, IConfiguration configuration, IHostEnvironment environment)
    : ICheckoutGateway
{
    private string? ClientId => configuration["PaymentGateway:ClientId"];
    private string? ApiKey => configuration["PaymentGateway:ApiKey"];
    private string? ChecksumKey => configuration["PaymentGateway:ChecksumKey"];
    private string? PortalOrigin => configuration["Shells:PortalOrigin"];
    private static readonly Uri PayOsBase = new("https://api-merchant.payos.vn/v2/payment-requests/");

    public string? Provider => configuration["PaymentGateway:Mode"] switch
    {
        "Demo" when environment.IsDevelopment() => "Demo",
        "PayOS" when !string.IsNullOrWhiteSpace(ClientId) && !string.IsNullOrWhiteSpace(ApiKey)
            && !string.IsNullOrWhiteSpace(ChecksumKey) && ValidPortalOrigin() => "PayOS",
        _ => null
    };

    public async Task<CheckoutLink> Create(ParentCheckout row, CancellationToken ct)
    {
        var returnUrl = FormattableString.Invariant(
            $"{PortalOrigin!.TrimEnd('/')}/parent?tab=payments&studentId={row.StudentId}&paymentId={row.PaymentId}");
        var cancelUrl = returnUrl;
        var description = "TEKY" + row.PaymentId.ToString(CultureInfo.InvariantCulture);
        if (description.Length > 9) description = description[^9..];
        var signed = FormattableString.Invariant($"amount={row.AmountVnd}&cancelUrl={cancelUrl}&description={description}&orderCode={row.OrderCode}&returnUrl={returnUrl}");
        try
        {
            var result = await Send(HttpMethod.Post, PayOsBase, new
            {
                amount = row.AmountVnd, row.OrderCode, description, cancelUrl, returnUrl,
                expiredAt = new DateTimeOffset(DateTime.SpecifyKind(row.ExpiresAt, DateTimeKind.Utc)).ToUnixTimeSeconds(),
                signature = Convert.ToHexStringLower(Sign(signed))
            }, ct);
            if (result is not { } data || data.GetProperty("orderCode").GetInt64() != row.OrderCode ||
                data.GetProperty("amount").GetInt32() != row.AmountVnd || data.GetProperty("currency").GetString() != "VND")
                throw Unavailable();
            var id = LinkId(data.GetProperty("paymentLinkId"));
            return new(id, HostedUrl(id), data.GetProperty("qrCode").GetString() is { Length: > 0 and <= 1024 } qr ? qr : null);
        }
        catch (CheckoutGatewayException)
        {
            // Recover when the provider created the order but the original response was lost.
            var existing = await Status(row.OrderCode, ct);
            if (existing is null || existing.OrderCode != row.OrderCode || existing.Amount != row.AmountVnd)
                throw;
            return new(existing.LinkId, HostedUrl(existing.LinkId), null);
        }
        catch (Exception error) when (InvalidPayload(error))
        {
            throw Unavailable(error);
        }
    }

    public async Task<CheckoutStatus?> Status(long orderCode, CancellationToken ct)
    {
        try
        {
            var result = await Send(HttpMethod.Get,
                new Uri(PayOsBase, orderCode.ToString(CultureInfo.InvariantCulture)), null, ct);
            if (result is not { } data) return null;
            return new(data.GetProperty("orderCode").GetInt64(), LinkId(data.GetProperty("id")),
                data.GetProperty("amount").GetInt32(), data.GetProperty("amountPaid").GetInt32(),
                data.GetProperty("amountRemaining").GetInt32(), data.GetProperty("status").GetString() ?? "");
        }
        catch (Exception error) when (InvalidPayload(error))
        {
            throw Unavailable(error);
        }
    }

    public long? VerifyWebhook(JsonElement payload)
    {
        try
        {
            var data = payload.GetProperty("data");
            var signature = payload.GetProperty("signature").GetString();
            if (signature is not { Length: 64 }) return null;
            var fields = data.EnumerateObject().OrderBy(field => field.Name, StringComparer.Ordinal)
                .Select(field => field.Name + "=" + FlatValue(field.Value));
            if (!CryptographicOperations.FixedTimeEquals(Convert.FromHexString(signature), Sign(string.Join("&", fields))))
                return null;
            return data.GetProperty("orderCode").GetInt64();
        }
        catch (Exception error) when (InvalidPayload(error))
        {
            return null;
        }
    }

    private async Task<JsonElement?> Send(HttpMethod method, Uri url, object? body, CancellationToken ct)
    {
        try
        {
            using var request = new HttpRequestMessage(method, url);
            request.Headers.Add("x-client-id", ClientId);
            request.Headers.Add("x-api-key", ApiKey);
            if (body is not null) request.Content = JsonContent.Create(body);
            using var response = await http.SendAsync(request, ct);
            if (method == HttpMethod.Get && response.StatusCode == HttpStatusCode.NotFound) return null;
            if (!response.IsSuccessStatusCode) throw Unavailable();
            using var json = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
            var root = json.RootElement;
            if (root.GetProperty("code").GetString() != "00")
                throw Unavailable();
            return root.GetProperty("data").Clone();
        }
        catch (Exception error) when (error is HttpRequestException or IOException || InvalidPayload(error) ||
            (error is OperationCanceledException && !ct.IsCancellationRequested))
        {
            throw Unavailable(error);
        }
    }

    private bool ValidPortalOrigin() => Uri.TryCreate(PortalOrigin, UriKind.Absolute, out var origin) &&
        (origin.Scheme == "https" || (environment.IsDevelopment() && origin.IsLoopback && origin.Scheme == "http")) &&
        origin.UserInfo.Length == 0 && origin.PathAndQuery == "/" && origin.Fragment.Length == 0;

    private byte[] Sign(string value) => HMACSHA256.HashData(Encoding.UTF8.GetBytes(ChecksumKey!), Encoding.UTF8.GetBytes(value));
    private static string HostedUrl(string id) => $"https://pay.payos.vn/web/{id}";
    private static string LinkId(JsonElement field) =>
        field.GetString() is { } value && Regex.IsMatch(value, "^[a-zA-Z0-9_-]{1,64}$") ? value : throw new FormatException();
    private static string FlatValue(JsonElement field) => field.ValueKind switch
    {
        JsonValueKind.String => field.GetString() is "null" or "undefined" ? "" : field.GetString()!,
        JsonValueKind.Null => "",
        JsonValueKind.Number or JsonValueKind.True or JsonValueKind.False => field.GetRawText(),
        _ => throw new FormatException()
    };
    private static bool InvalidPayload(Exception error) =>
        error is JsonException or KeyNotFoundException or FormatException or InvalidOperationException or OverflowException;
    private static CheckoutGatewayException Unavailable(Exception? error = null) =>
        new("Cổng thanh toán chưa phản hồi hợp lệ. Vui lòng thử lại.", error);
}
