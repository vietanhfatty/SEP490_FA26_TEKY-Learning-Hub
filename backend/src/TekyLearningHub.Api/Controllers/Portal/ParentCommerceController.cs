using System.Globalization;
using System.Security.Claims;
using System.Text;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TekyLearningHub.Application.DTOs.Portal;
using TekyLearningHub.Application.Interfaces.Portal;

namespace TekyLearningHub.Api.Controllers.Portal;

[ApiController, Authorize(Roles = "parent"), Route("api/parent")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class ParentCommerceController(IParentCommerceService service) : ControllerBase
{
    private int? ParentId => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    [HttpGet("courses")]
    public async Task<IActionResult> Courses(CancellationToken ct) => Ok(await service.Catalogue(ct));

    [HttpGet("courses/{courseId:int:min(1)}")]
    public async Task<IActionResult> Course(int courseId, CancellationToken ct) =>
        await service.Course(courseId, ct) is { } course ? Ok(course) : NotFound();

    [HttpGet("children/{studentId:int:min(1)}/registrations")]
    public async Task<IActionResult> Requests(int studentId, CancellationToken ct)
    {
        if (ParentId is not int id) return Unauthorized();
        return await service.Requests(id, studentId, ct) is { } rows ? Ok(rows) : NotFound();
    }

    [HttpPost("children/{studentId:int:min(1)}/registrations")]
    public async Task<IActionResult> Register(int studentId, ParentRegistration request, CancellationToken ct) =>
        ParentId is int id ? Result(await service.Register(id, studentId, request.ClassId, ct),
            "Lớp đã có ghi danh hoặc yêu cầu đăng ký, hoặc hiện không nhận đăng ký.") : Unauthorized();

    [HttpGet("children/{studentId:int:min(1)}/payments")]
    public async Task<IActionResult> Payments(int studentId, CancellationToken ct)
    {
        if (ParentId is not int id) return Unauthorized();
        return await service.Payments(id, studentId, ct) is { } rows ? Ok(rows) : NotFound();
    }

    [HttpGet("children/{studentId:int:min(1)}/payments/{paymentId:int:min(1)}/invoice")]
    public async Task<IActionResult> Invoice(int studentId, int paymentId, CancellationToken ct)
    {
        if (ParentId is not int id) return Unauthorized();
        var payment = await service.Invoice(id, studentId, paymentId, ct);
        if (payment is null) return NotFound();
        var encode = HtmlEncoder.Default;
        var amount = payment.AmountVnd.ToString("N0", CultureInfo.GetCultureInfo("vi-VN"));
        var document = $"""
            <!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Chứng từ học phí</title></head><body>
            <h1>TEKY Learning Hub · Chứng từ học phí</h1>
            <p>Số chứng từ: {encode.Encode(payment.InvoiceNumber!)}</p>
            <p>Mã giao dịch: {encode.Encode(payment.Reference)}</p>
            <p>Khóa học: {encode.Encode(payment.CourseName)}</p>
            <p>Số tiền: {amount} VND</p>
            <p>Ngày thanh toán (UTC): {payment.PaidAt:yyyy-MM-dd}</p>
            <p>Trạng thái: {(payment.Status == "Refunded" ? "Đã hoàn tiền" : "Đã thanh toán")}</p>
            </body></html>
            """;
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        return File(Encoding.UTF8.GetBytes(document), "text/html; charset=utf-8", $"teky-hoc-phi-{paymentId}.html");
    }

    [HttpPost("children/{studentId:int:min(1)}/payments/{paymentId:int:min(1)}/refund")]
    public async Task<IActionResult> Refund(int studentId, int paymentId, ParentRefund request, CancellationToken ct) =>
        ParentId is int id ? Result(await service.Refund(id, studentId, paymentId, request.Reason, ct),
            "Giao dịch chưa đủ điều kiện hoặc đã có yêu cầu hoàn tiền.") : Unauthorized();

    private IActionResult Result(ParentChange result, string conflict) => result switch
    {
        ParentChange.Saved => NoContent(),
        ParentChange.NotFound => NotFound(),
        ParentChange.Invalid => Problem(statusCode: 400, title: "Kiểm tra lại thông tin. Lý do hoàn tiền cần từ 5 đến 500 ký tự."),
        _ => Problem(statusCode: 409, title: conflict)
    };
}
