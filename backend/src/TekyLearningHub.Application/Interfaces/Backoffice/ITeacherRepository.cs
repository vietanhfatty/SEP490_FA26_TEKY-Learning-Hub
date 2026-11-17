using TekyLearningHub.Application.DTOs;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.Interfaces.Backoffice;

/// <summary>
/// Cổng truy xuất dữ liệu cho use case giáo viên. Trả về entity/DTO đã truy vấn xong;
/// Application không viết truy vấn EF và không thấy DbSet/IQueryable.
/// </summary>
public interface ITeacherRepository
{
    Task<User?> FindUser(int userId, CancellationToken ct);

    /// <summary>Lớp đang mở của giáo viên kèm lịch học và danh sách ghi danh.</summary>
    Task<List<Class>> TeacherClasses(int teacherId, CancellationToken ct);

    /// <summary>Toàn bộ lớp giáo viên phụ trách (mở hoặc đã lên kế hoạch).</summary>
    Task<List<Class>> TeacherClassesIncludingPlanned(int teacherId, CancellationToken ct);

    /// <summary>Số bài nộp chưa chốt điểm thuộc các lớp đang mở.</summary>
    Task<int> PendingSubmissionCount(IReadOnlyCollection<int> classIds, CancellationToken ct);

    /// <summary>Lịch học trong tuần của các lớp đang mở.</summary>
    Task<List<ClassSession>> WeekSessions(IReadOnlyCollection<int> classIds, DateOnly startOfWeek, DateOnly endOfWeek, CancellationToken ct);

    /// <summary>Cảnh báo vắng mặt gần nhất của các lớp đang mở.</summary>
    Task<List<AttendanceRecord>> RecentAbsences(IReadOnlyCollection<int> classIds, int take, CancellationToken ct);

    /// <summary>Buổi học kèm danh sách ghi danh và điểm danh đã có.</summary>
    Task<ClassSession?> SessionWithAttendance(int sessionId, CancellationToken ct);

    Task<ClassSession?> SessionForUpdate(int sessionId, CancellationToken ct);

    Task<AttendanceRecord?> FindAttendance(int sessionId, int studentId, CancellationToken ct);

    void AddAttendance(AttendanceRecord attendance);

    Task<User?> FindUserForUpdate(int userId, CancellationToken ct);

    Task<List<MakeupRequest>> TeacherMakeupRequests(int teacherId, CancellationToken ct);

    Task<MakeupRequest?> FindMakeupRequest(int makeupId, CancellationToken ct);

    void AddChallengeMap(ChallengeMap map);

    Task<List<Submission>> GradingQueue(int teacherId, int? classId, CancellationToken ct);

    Task<Submission?> SubmissionForGrading(long submissionId, CancellationToken ct);

    Task<Grade?> FindGrade(long submissionId, CancellationToken ct);

    void AddGrade(Grade grade);

    void AddAstEvaluation(AstEvaluation evaluation);

    Task<PortfolioItem?> FindPortfolioBySubmission(long submissionId, CancellationToken ct);

    void AddPortfolio(PortfolioItem portfolio);

    Task<Class?> FindClass(int classId, CancellationToken ct);

    Task<List<Grade>> ClassGrades(int classId, CancellationToken ct);

    Task<StudentProfile?> FindStudentProfile(int studentId, CancellationToken ct);

    /// <summary>Bảng điểm lớp đã vật chất hoá để xuất Excel.</summary>
    Task<ClassGradebookRow?> GradebookRow(int classId, CancellationToken ct);
}

/// <summary>Dữ liệu bảng điểm của một lớp, đã truy vấn xong để adapter xuất file.</summary>
public sealed class ClassGradebookRow
{
    public string ClassCode { get; init; } = string.Empty;
    public string ClassName { get; init; } = string.Empty;
    public string TeacherName { get; init; } = string.Empty;
    public List<ClassGradebookStudentRow> Students { get; init; } = new();
}

/// <summary>Một học sinh trong bảng điểm cùng bài nộp đã được chấm gần nhất.</summary>
public sealed class ClassGradebookStudentRow
{
    public string StudentCode { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public decimal? AutoAstScore { get; init; }
    public decimal? HardwareScore { get; init; }
    public decimal? FinalScore { get; init; }
}
