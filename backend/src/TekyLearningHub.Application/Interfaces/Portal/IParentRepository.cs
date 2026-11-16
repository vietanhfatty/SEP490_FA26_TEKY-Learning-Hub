using TekyLearningHub.Application.DTOs;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.Interfaces.Portal;

/// <summary>
/// Cổng truy xuất dữ liệu cho use case phụ huynh. Trả về entity/DTO đã truy vấn xong;
/// Application không viết truy vấn EF và không thấy DbSet/IQueryable.
/// </summary>
public interface IParentRepository
{
    Task<User?> FindUser(int userId, CancellationToken ct);

    /// <summary>Các học sinh đang được liên kết với phụ huynh.</summary>
    Task<List<ParentStudentLink>> ActiveChildren(int parentId, CancellationToken ct);

    Task<AttendanceRecord?> AttendanceOn(int studentId, DateOnly date, CancellationToken ct);

    Task<bool> HasActiveLink(int parentId, int studentId, CancellationToken ct);

    Task<List<AttendanceRecord>> StudentAttendances(int studentId, CancellationToken ct);

    Task<List<Grade>> StudentGrades(int studentId, CancellationToken ct);

    void AddCheerMessage(CheerMessage message);

    Task<List<PortfolioItem>> StudentPortfolios(int studentId, CancellationToken ct);

    Task<AchievementCard?> PublicAchievementCard(Guid qrToken, CancellationToken ct);

    Task<List<CheerSticker>> CheerStickers(CancellationToken ct);

    Task<int?> ActiveClassId(int studentId, CancellationToken ct);

    Task<string?> StickerCode(int stickerId, CancellationToken ct);

    Task<Class?> FindClass(int classId, CancellationToken ct);

    Task<LeaderboardCycle?> LatestLeaderboardCycle(CancellationToken ct);

    Task<List<int>> ActiveClassStudentIds(int classId, CancellationToken ct);

    Task<List<LeaderboardEntry>> LeaderboardEntries(int cycleId, IReadOnlyCollection<int> studentIds, CancellationToken ct);

    /// <summary>Thông tin tóm tắt buổi học và điểm gần nhất để dựng bản tin âm thanh.</summary>
    Task<ParentDigestData?> DigestData(int sessionId, int studentId, CancellationToken ct);
}

/// <summary>Dữ liệu thô cho bản tin âm thanh tới phụ huynh.</summary>
public sealed class ParentDigestData
{
    public string StudentName { get; init; } = string.Empty;
    public string ClassName { get; init; } = string.Empty;
    public decimal? FinalScore { get; init; }
}
