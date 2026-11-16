using TekyLearningHub.Application.DTOs;

namespace TekyLearningHub.Application.Interfaces.Portal;

/// <summary>Use case hồ sơ con, sổ liên lạc, portfolio và tuyên dương cho phụ huynh.</summary>
public interface IParentService
{
    // SCR-PAR-01: Tổng quan hồ sơ con & Điểm danh thời gian thực
    Task<ParentDashboardDto> GetParentDashboardAsync(int parentId, CancellationToken ct = default);

    // SCR-PAR-02: Sổ liên lạc điện tử 60/40 & Đánh giá 5 sao
    Task<List<EContactBookItemDto>> GetChildContactBookHistoryAsync(int studentId, int parentId, CancellationToken ct = default);
    Task<bool> SubmitParentFeedbackAsync(SubmitParentFeedbackRequest request, int parentId, CancellationToken ct = default);

    // SCR-PAR-03: Hồ sơ năng lực số STEM & Xác thực chứng nhận QR
    Task<List<StudentPortfolioDetailDto>> GetStudentPortfoliosAsync(int studentId, CancellationToken ct = default);
    Task<StudentPortfolioDetailDto> GetPublicPortfolioByQrTokenAsync(Guid qrToken, CancellationToken ct = default);

    // SCR-PAR-04 & CRON-03: Tuyên dương trực tuyến (Cheer Box) & Bảng xếp hạng tuần
    Task<List<CheerStickerDto>> GetCheerStickersAsync(CancellationToken ct = default);
    Task<bool> SendCheerMessageAsync(SendCheerMessageRequest request, CancellationToken ct = default);
    Task<ClassLeaderboardDto> GetClassLeaderboardAsync(int classId, CancellationToken ct = default);
}
