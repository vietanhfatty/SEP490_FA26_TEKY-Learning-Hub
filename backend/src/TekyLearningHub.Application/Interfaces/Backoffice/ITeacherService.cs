using TekyLearningHub.Application.DTOs;

namespace TekyLearningHub.Application.Interfaces.Backoffice;

/// <summary>Use case bàn làm việc, điểm danh, học bù, thiết kế sa bàn và chấm điểm cho giáo viên.</summary>
public interface ITeacherService
{
    // SCR-TEA-01: Bàn làm việc & Lớp phụ trách
    Task<TeacherWorkspaceDto> GetTeacherWorkspaceAsync(int teacherId, DateOnly? weekStart = null, CancellationToken ct = default);
    Task<List<TeacherClassSummaryDto>> GetTeacherClassesAsync(int teacherId, CancellationToken ct = default);

    // SCR-TEA-02: Điểm danh 1-Chạm, Đồng bộ Máy trạm & Xét duyệt Học bù
    Task<ClassAttendanceSessionDto> GetSessionAttendanceAsync(int sessionId, CancellationToken ct = default);
    Task<bool> UpdateSessionAttendanceAsync(UpdateClassAttendanceRequest request, int teacherId, CancellationToken ct = default);
    Task<bool> SyncWorkstationCheckInAsync(int sessionId, int studentId, string workstationIp, CancellationToken ct = default);
    Task<List<MakeupRequestItemDto>> GetMakeupRequestsAsync(int teacherId, CancellationToken ct = default);
    Task<bool> ReviewMakeupRequestAsync(ReviewMakeupRequestDto request, int teacherId, CancellationToken ct = default);

    // SCR-TEA-04: Thiết kế Sa bàn STEM 2D
    Task<int> CreateStemMapAsync(CreateStemMapRequest request, int teacherId, CancellationToken ct = default);

    // SCR-TEA-05: Chấm bài Hybrid 60/40
    Task<List<GradingQueueItemDto>> GetGradingQueueAsync(int teacherId, int? classId, CancellationToken ct = default);
    Task<SubmissionGradingResultDto> GradeSubmissionAsync(GradeSubmissionRequest request, int teacherId, CancellationToken ct = default);

    // SCR-TEA-06: Phân tích hiệu suất & phổ điểm lớp học
    Task<ClassPerformanceAnalyticsDto> GetClassPerformanceAnalyticsAsync(int classId, CancellationToken ct = default);
}
