using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using TekyLearningHub.Application.DTOs;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Application.Services;

namespace TekyLearningHub.Api.Controllers.Portal;

[ApiController]
[Route("api/[controller]")]
public class ParentController : ControllerBase
{
    private readonly IParentService _parentService;
    private readonly IAiAssistantService _aiAssistantService;

    public ParentController(
        IParentService parentService,
        IAiAssistantService aiAssistantService)
    {
        _parentService = parentService;
        _aiAssistantService = aiAssistantService;
    }

    /// <summary>
    /// SCR-PAR-01: Bảng điều khiển phụ huynh & Chuyển đổi nhanh giữa các con (Multi-Child Switcher)
    /// </summary>
    [HttpGet("dashboard")]
    public async Task<ActionResult<ParentDashboardDto>> GetDashboard([FromQuery] int parentId, CancellationToken ct)
    {
        var result = await _parentService.GetParentDashboardAsync(parentId, ct);
        return Ok(result);
    }

    /// <summary>
    /// SCR-PAR-02: Xem sổ liên lạc điện tử & tiến độ học tập (Hybrid Progress 60/40)
    /// </summary>
    [HttpGet("contact-book")]
    public async Task<ActionResult<List<EContactBookItemDto>>> GetContactBook(
        [FromQuery] int studentId,
        [FromQuery] int parentId,
        CancellationToken ct)
    {
        var result = await _parentService.GetChildContactBookHistoryAsync(studentId, parentId, ct);
        return Ok(result);
    }

    /// <summary>
    /// SCR-PAR-02: Phụ huynh đánh giá 5 sao & gửi phản hồi về buổi học
    /// </summary>
    [HttpPost("feedback")]
    public async Task<ActionResult> SubmitFeedback(
        [FromBody] SubmitParentFeedbackRequest request,
        [FromQuery] int parentId,
        CancellationToken ct)
    {
        var success = await _parentService.SubmitParentFeedbackAsync(request, parentId, ct);
        return Ok(new { success, message = "Cảm ơn phụ huynh đã gửi đánh giá buổi học." });
    }

    /// <summary>
    /// SCR-PAR-02: Bản tin âm thanh AI 60 giây tóm tắt kết quả buổi học của con
    /// </summary>
    [HttpGet("audio-digest")]
    public async Task<ActionResult> GetAudioDigestText(
        [FromQuery] int sessionId,
        [FromQuery] int studentId,
        CancellationToken ct)
    {
        var summaryText = await _aiAssistantService.GenerateParentAudioDigestTextAsync(sessionId, studentId, ct);
        return Ok(new { summaryText });
    }

    /// <summary>
    /// SCR-PAR-04: Gửi Cheer Box & kích hoạt pháo hoa Confetti tức thời trên màn hình máy trạm của con qua SignalR
    /// </summary>
    [HttpPost("cheer")]
    public async Task<ActionResult> SendCheer(
        [FromBody] SendCheerMessageRequest request,
        CancellationToken ct)
    {
        var success = await _parentService.SendCheerMessageAsync(request, ct);
        return Ok(new { success, message = "Lời động viên và pháo hoa đã được gửi tới bàn học của con!" });
    }

    /// <summary>
    /// SCR-PAR-03: Xem danh sách sản phẩm STEM số hóa của con
    /// </summary>
    [HttpGet("portfolios/{studentId:int}")]
    public async Task<ActionResult<List<StudentPortfolioDetailDto>>> GetPortfolios(
        [FromRoute] int studentId,
        CancellationToken ct)
    {
        var result = await _parentService.GetStudentPortfoliosAsync(studentId, ct);
        return Ok(result);
    }

    /// <summary>
    /// CRON-03: Xem Bảng xếp hạng Top 10 của lớp tuần này
    /// </summary>
    [HttpGet("leaderboard/{classId:int}")]
    public async Task<ActionResult<ClassLeaderboardDto>> GetLeaderboard(
        [FromRoute] int classId,
        CancellationToken ct)
    {
        var result = await _parentService.GetClassLeaderboardAsync(classId, ct);
        return Ok(result);
    }

    /// <summary>
    /// SCR-PAR-04: Danh mục nhãn dán cổ vũ (Cheer Stickers)
    /// </summary>
    [HttpGet("stickers")]
    public async Task<ActionResult<List<CheerStickerDto>>> GetStickers(CancellationToken ct)
    {
        var result = await _parentService.GetCheerStickersAsync(ct);
        return Ok(result);
    }
}