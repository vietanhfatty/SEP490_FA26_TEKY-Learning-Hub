using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using TekyLearningHub.Application.DTOs;
using TekyLearningHub.Application.Interfaces.Backoffice;
using TekyLearningHub.Application.Interfaces.Portal;

namespace TekyLearningHub.Api.Controllers.Portal;

[ApiController]
[Authorize(Roles = "teacher")]
[Route("api/[controller]")]
public class TeacherController : ControllerBase
{
    private int Actor => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private readonly ITeacherAccessReader _access;
    private readonly ITeacherService _teacherService;
    private readonly IClassroomRealtimeService _realtimeService;
    private readonly IExcelExportService _excelExportService;
    private readonly IAiAssistantService _aiAssistantService;

    public TeacherController(
        ITeacherService teacherService,
        IClassroomRealtimeService realtimeService,
        IExcelExportService excelExportService,
        IAiAssistantService aiAssistantService, ITeacherAccessReader access)
    {
        _access = access;
        _teacherService = teacherService;
        _realtimeService = realtimeService;
        _excelExportService = excelExportService;
        _aiAssistantService = aiAssistantService;
    }

    // ==================== SCR-TEA-01: BÀN LÀM VIỆC & LỊCH DẠY TUẦN ====================

    /// <summary>
    /// SCR-TEA-01: Lấy thông tin Bàn làm việc giáo viên, thời khóa biểu tuần & cảnh báo vắng mặt
    /// </summary>
    [HttpGet("workspace")]
    public async Task<ActionResult<TeacherWorkspaceDto>> GetWorkspace([FromQuery] int teacherId, [FromQuery] DateOnly? weekStart, CancellationToken ct)
    {
        var result = await _teacherService.GetTeacherWorkspaceAsync(Actor, weekStart, ct);
        return Ok(result);
    }

    /// <summary>
    /// SCR-TEA-01: Danh sách lớp giáo viên đang phụ trách
    /// </summary>
    [HttpGet("classes")]
    public async Task<ActionResult<List<TeacherClassSummaryDto>>> GetClasses([FromQuery] int teacherId, CancellationToken ct)
    {
        var result = await _teacherService.GetTeacherClassesAsync(Actor, ct);
        return Ok(result);
    }

    // ==================== SCR-TEA-02: ĐIỂM DANH 1-CHẠM, ĐỒNG BỘ MÁY TRẠM & HỌC BÙ ====================

    /// <summary>
    /// SCR-TEA-02: Lấy danh sách điểm danh 1-chạm của buổi học
    /// </summary>
    [HttpGet("attendance/{sessionId:int}")]
    public async Task<ActionResult<ClassAttendanceSessionDto>> GetSessionAttendance([FromRoute] int sessionId, CancellationToken ct)
    {
        if (!await _access.CanAccess(Actor, "session", sessionId, ct)) return Forbid();
        var result = await _teacherService.GetSessionAttendanceAsync(sessionId, ct);
        return Ok(result);
    }

    /// <summary>
    /// SCR-TEA-02: Cập nhật điểm danh 1-chạm (Có mặt / Muộn / Vắng)
    /// </summary>
    [HttpPost("attendance/update")]
    public async Task<ActionResult> UpdateAttendance([FromBody] UpdateClassAttendanceRequest request, [FromQuery] int teacherId, CancellationToken ct)
    {
        if (!await _access.CanAccess(Actor, "session", request.SessionId, ct)) return Forbid();
        foreach (var item in request.AttendanceList) if (!await _access.Enrolled(request.SessionId, item.StudentId, ct)) return Forbid();
        var success = await _teacherService.UpdateSessionAttendanceAsync(request, Actor, ct);
        return Ok(new { success, message = "Cập nhật điểm danh thành công." });
    }

    /// <summary>
    /// SCR-TEA-02: Đồng bộ check-in tự động khi học sinh đăng nhập vào máy trạm phòng Lab
    /// </summary>
    [HttpPost("attendance/sync-workstation")]
    public async Task<ActionResult> SyncWorkstationCheckIn([FromQuery] int sessionId, [FromQuery] int studentId, [FromQuery] string workstationIp, CancellationToken ct)
    {
        if (!await _access.CanAccess(Actor, "session", sessionId, ct) || !await _access.Enrolled(sessionId, studentId, ct)) return Forbid();
        var success = await _teacherService.SyncWorkstationCheckInAsync(sessionId, studentId, workstationIp, ct);
        return Ok(new { success, message = "Đã đồng bộ máy trạm thành công." });
    }

    /// <summary>
    /// SCR-TEA-02: Danh sách đơn xin học bù của các lớp giáo viên phụ trách
    /// </summary>
    [HttpGet("makeup")]
    public async Task<ActionResult<List<MakeupRequestItemDto>>> GetMakeupRequests([FromQuery] int teacherId, CancellationToken ct)
    {
        var result = await _teacherService.GetMakeupRequestsAsync(Actor, ct);
        return Ok(result);
    }

    /// <summary>
    /// SCR-TEA-02: Duyệt đơn xin học bù của học sinh
    /// </summary>
    [HttpPost("makeup/review")]
    public async Task<ActionResult> ReviewMakeupRequest([FromBody] ReviewMakeupRequestDto request, [FromQuery] int teacherId, CancellationToken ct)
    {
        if (!await _access.CanAccess(Actor, "makeup", request.MakeupId, ct)) return Forbid();
        var success = await _teacherService.ReviewMakeupRequestAsync(request, Actor, ct);
        return Ok(new { success, message = "Đã xử lý đơn học bù thành công." });
    }

    // ==================== SCR-TEA-03: ĐIỀU KHIỂN PHÒNG LAB (FOCUS MODE & SPOTLIGHT) ====================

    /// <summary>
    /// SCR-TEA-03: Kích hoạt Chế độ tập trung phòng Lab (Khóa / Mở màn hình học sinh qua SignalR)
    /// </summary>
    [HttpPost("classroom/{classId:int}/focus-mode")]
    public async Task<ActionResult> ToggleFocusMode([FromRoute] int classId, [FromQuery] bool isLocked, [FromQuery] string? message, CancellationToken ct)
    {
        if (!await _access.CanAccess(Actor, "class", classId, ct)) return Forbid();
        await _realtimeService.BroadcastFocusModeLockAsync(classId, isLocked, message, ct);
        return Ok(new { success = true, isLocked, message = isLocked ? "Đã khóa màn hình phòng Lab." : "Đã mở khóa màn hình phòng Lab." });
    }

    /// <summary>
    /// SCR-TEA-03: Chiếu sáng / Spotlight bài làm xuất sắc của học sinh lên toàn bộ phòng Lab
    /// </summary>
    [HttpPost("classroom/{classId:int}/spotlight")]
    public async Task<ActionResult> BroadcastSpotlight([FromRoute] int classId, [FromQuery] int studentId, [FromQuery] string studentName, [FromBody] string screenPayload, CancellationToken ct)
    {
        if (!await _access.CanAccess(Actor, "class", classId, ct)) return Forbid();
        await _realtimeService.BroadcastSpotlightAsync(classId, studentId, studentName, screenPayload, ct);
        return Ok(new { success = true, message = $"Đã phát sóng bài làm của {studentName} lên máy chiếu và máy trạm phòng Lab." });
    }

    // ==================== SCR-TEA-04: THIẾT KẾ SA BÀN 2D & KHỞI TẠO ĐỀ BÀI AI ====================

    /// <summary>
    /// SCR-TEA-04: Tạo sa bàn bản đồ thử thách STEM mới
    /// </summary>
    [HttpPost("maps")]
    public async Task<ActionResult<int>> CreateStemMap([FromBody] CreateStemMapRequest request, [FromQuery] int teacherId, CancellationToken ct)
    {
        var mapId = await _teacherService.CreateStemMapAsync(request, Actor, ct);
        return Ok(new { mapId, message = "Tạo bản đồ sa bàn thành công." });
    }

    /// <summary>
    /// SCR-TEA-04: Sinh sa bàn và thử thách tự động bằng AI (Generative AI Map & Quest)
    /// </summary>
    [HttpPost("maps/generate-ai")]
    public async Task<ActionResult<GeneratedMapResultDto>> GenerateAiMap([FromQuery] string prompt, CancellationToken ct)
    {
        var result = await _aiAssistantService.GenerateStemMapAndQuestAsync(prompt, ct);
        return Ok(result);
    }

    // ==================== SCR-TEA-05: CHẤM ĐIỂM KẾT HỢP 60/40 & GHI ÂM NHẬN XÉT ====================

    /// <summary>
    /// SCR-TEA-05: Hàng chờ chấm bài Hybrid 60/40
    /// </summary>
    [HttpGet("submissions")]
    public async Task<ActionResult<List<GradingQueueItemDto>>> GetGradingQueue([FromQuery] int teacherId, [FromQuery] int? classId, CancellationToken ct)
    {
        var result = await _teacherService.GetGradingQueueAsync(Actor, classId, ct);
        return Ok(result);
    }

    /// <summary>
    /// SCR-TEA-05: Chấm điểm Hybrid 60/40 (AST 60% + Rubric Quick-Pills 40% + Voice memo nhận xét)
    /// </summary>
    [HttpPost("grade")]
    public async Task<ActionResult<SubmissionGradingResultDto>> GradeSubmission([FromBody] GradeSubmissionRequest request, [FromQuery] int teacherId, CancellationToken ct)
    {
        if (!await _access.CanAccess(Actor, "submission", request.SubmissionId, ct)) return Forbid();
        var result = await _teacherService.GradeSubmissionAsync(request, Actor, ct);
        return Ok(result);
    }

    // ==================== SCR-TEA-06: PHÂN TÍCH PHỔ ĐIỂM & XUẤT BÁO CÁO EXCEL ====================

    /// <summary>
    /// SCR-TEA-06: Phân tích hiệu suất lớp học & biểu đồ phân phối điểm số
    /// </summary>
    [HttpGet("analytics/{classId:int}")]
    public async Task<ActionResult<ClassPerformanceAnalyticsDto>> GetClassAnalytics([FromRoute] int classId, CancellationToken ct)
    {
        if (!await _access.CanAccess(Actor, "class", classId, ct)) return Forbid();
        var result = await _teacherService.GetClassPerformanceAnalyticsAsync(classId, ct);
        return Ok(result);
    }

    /// <summary>
    /// SCR-TEA-06: Xuất toàn bộ sổ điểm ra file Excel ClosedXML chuẩn TEKY
    /// </summary>
    [HttpGet("export-excel/{classId:int}")]
    public async Task<IActionResult> ExportGradebookExcel([FromRoute] int classId, CancellationToken ct)
    {
        if (!await _access.CanAccess(Actor, "class", classId, ct)) return Forbid();
        var fileBytes = await _excelExportService.ExportClassGradebookAsync(classId, ct);
        var fileName = $"Bang_Diem_TEKY_{DateTime.Now:yyyyMMdd_HHmm}.xlsx";
        return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }
}
