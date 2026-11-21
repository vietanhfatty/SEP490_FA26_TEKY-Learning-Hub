using System.Globalization;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TekyLearningHub.Application.DTOs.Portal;
using TekyLearningHub.Application.Interfaces.Portal;

namespace TekyLearningHub.Api.Controllers.Portal;

[ApiController, Authorize(Roles = "parent"), Route("api/parent")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class ParentCheckoutController(IParentCheckoutService service) : ControllerBase
{
    private int? ParentId => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    [HttpPost("children/{studentId:int:min(1)}/checkouts")]
    public async Task<IActionResult> Buy(int studentId, ParentRegistration request, CancellationToken ct)
    {
        if (ParentId is not int id) return Unauthorized();
        if (request.ClassId < 1) return BadRequest();
        try
        {
            var checkout = await service.Buy(id, studentId, request.ClassId, ct);
            return checkout is null
                ? Problem(statusCode: 409, title: "Không thể tạo đơn. Kiểm tra hồ sơ, chỗ trống, ghi danh và các đơn đang mở.")
                : Ok(checkout);
        }
        catch (CheckoutConflictException error)
        {
            return Problem(statusCode: 409, title: error.Message);
        }
        catch (CheckoutGatewayException error)
        {
            return Problem(statusCode: 503, title: error.Message);
        }
    }

    [HttpGet("children/{studentId:int:min(1)}/checkouts")]
    public async Task<IActionResult> List(int studentId, CancellationToken ct) =>
        ParentId is not int id ? Unauthorized() :
        await service.List(id, studentId, ct) is { } rows ? Ok(rows) : NotFound();

    [AllowAnonymous, HttpPost("/api/payments/payos/webhook")]
    [RequestSizeLimit(16384)]
    public async Task<IActionResult> Webhook(JsonElement payload, CancellationToken ct)
    {
        try
        {
            return await service.Webhook(payload, ct) ? Ok() : BadRequest();
        }
        catch (CheckoutGatewayException)
        {
            return StatusCode(503);
        }
    }

    [AllowAnonymous, HttpGet("/api/payments/demo/{reference}")]
    [HttpPost("/api/payments/demo/{reference}")]
    public async Task<IActionResult> Demo(string reference, CancellationToken ct)
    {
        var checkout = await service.Demo(reference, HttpMethods.IsPost(Request.Method), ct);
        if (checkout is null) return NotFound();
        var status = checkout.Status switch
        {
            "Paid" => "<p>Thanh toán mô phỏng thành công. Hệ thống đã ghi danh học sinh.</p>",
            "Pending" => """<form method="post"><button type="submit">Xác nhận thanh toán mô phỏng</button></form>""",
            _ => "<p>Đơn mô phỏng đã hết hạn.</p>"
        };
        var course = HtmlEncoder.Default.Encode(checkout.CourseName);
        var amount = checkout.AmountVnd.ToString("N0", CultureInfo.GetCultureInfo("vi-VN"));
        Response.Headers["Referrer-Policy"] = "no-referrer";
        Response.Headers["Content-Security-Policy"] = "default-src 'none'; form-action 'self'; frame-ancestors 'none'";
        return Content($"""
            <!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
            <title>TEKY · Thanh toán mô phỏng</title></head><body><main>
            <h1>Thanh toán mô phỏng</h1><p>Không chuyển tiền thật.</p><h2>{course}</h2><p>{amount} VND</p>{status}
            </main></body></html>
            """, "text/html; charset=utf-8");
    }
}
