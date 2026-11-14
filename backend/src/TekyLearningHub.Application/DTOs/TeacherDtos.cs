using System;
using System.Collections.Generic;

namespace TekyLearningHub.Application.DTOs;

// ==================== SCR-TEA-01: BÀN LÀM VIỆC & LỊCH DẠY TUẦN ====================

public class TeacherWorkspaceDto
{
    public int TeacherId { get; set; }
    public string TeacherName { get; set; } = string.Empty;
    public int PendingTaskCount { get; set; }
    public int ActiveClassesCount { get; set; }
    public List<TeacherScheduleSessionDto> WeeklySchedule { get; set; } = new();
    public List<AbsentAlertDto> RecentAbsentAlerts { get; set; } = new();
}

public class TeacherScheduleSessionDto
{
    public int SessionId { get; set; }
    public int ClassId { get; set; }
    public string ClassCode { get; set; } = string.Empty;
    public string ClassName { get; set; } = string.Empty;
    public int SessionNumber { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateOnly SessionDate { get; set; }
    public string StartTime { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
    public string RoomName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int EnrolledStudentsCount { get; set; }
    public int PresentCount { get; set; }
}

public class AbsentAlertDto
{
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string ClassCode { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public string Reason { get; set; } = "Chưa có mặt";
}

/// <summary>Danh sách lớp giáo viên đang phụ trách (bộ lọc cho Analytics / Focus Mode)</summary>
public class TeacherClassSummaryDto
{
    public int ClassId { get; set; }
    public string ClassCode { get; set; } = string.Empty;
    public string ClassName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int StudentCount { get; set; }
}

// ==================== SCR-TEA-02: ĐIỂM DANH 1-CHẠM & ĐƠN HỌC BÙ ====================

public class ClassAttendanceSessionDto
{
    public int SessionId { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public List<StudentAttendanceItemDto> Students { get; set; } = new();
}

public class StudentAttendanceItemDto
{
    public long AttendanceId { get; set; }
    public int StudentId { get; set; }
    public string StudentCode { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string Status { get; set; } = "Absent"; // Present, Late, Absent, Excused
    public string? AbsenceReason { get; set; }
    public DateTime? MarkedAt { get; set; }
}

public class UpdateAttendanceItemRequest
{
    public int StudentId { get; set; }
    public string Status { get; set; } = "Present";
    public string? Reason { get; set; }
}

public class UpdateClassAttendanceRequest
{
    public int SessionId { get; set; }
    public List<UpdateAttendanceItemRequest> AttendanceList { get; set; } = new();
}

/// <summary>SCR-TEA-02: Đơn xin học bù chờ giáo viên duyệt</summary>
public class MakeupRequestItemDto
{
    public int MakeupId { get; set; }
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string ClassCode { get; set; } = string.Empty;
    public DateOnly MissedDate { get; set; }
    public int? PreferredSessionId { get; set; }
    public DateOnly? PreferredDate { get; set; }
    public string? Reason { get; set; }
    public string Status { get; set; } = "Pending";
    public DateTime CreatedAt { get; set; }
}

public class ReviewMakeupRequestDto
{
    public int MakeupId { get; set; }
    public bool IsApproved { get; set; }
    public string? TeacherNote { get; set; }
}

// ==================== SCR-TEA-04: THIẾT KẾ SA BÀN 2D & TRẠM KIỂM SOÁT ====================

public class CreateStemMapRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Theme { get; set; }
    public string LayoutJson { get; set; } = "{}";
    public int StartX { get; set; } = 0;
    public int StartY { get; set; } = 0;
    public List<CreateMapCheckpointDto> Checkpoints { get; set; } = new();
}

public class CreateMapCheckpointDto
{
    public int SeqNo { get; set; }
    public int X { get; set; }
    public int Y { get; set; }
    public string? UnlockMessage { get; set; }
    public bool IsFinish { get; set; } = false;
}

// ==================== SCR-TEA-05: CHẤM ĐIỂM KẾT HỢP 60/40 & GHI ÂM NHẬN XÉT ====================

/// <summary>SCR-TEA-05: Hàng chờ chấm bài Hybrid (bài nộp của học sinh trong các lớp giáo viên phụ trách)</summary>
public class GradingQueueItemDto
{
    public long SubmissionId { get; set; }
    public int AssignmentId { get; set; }
    public string AssignmentTitle { get; set; } = string.Empty;
    public int ClassId { get; set; }
    public string ClassCode { get; set; } = string.Empty;
    public int StudentId { get; set; }
    public string StudentCode { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public int AttemptNo { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
    public string BlocklyJson { get; set; } = "{}";
    public decimal? AutoAstScore { get; set; }
    public decimal? MatchPercent { get; set; }
    public decimal? HardwareScore { get; set; }
    public decimal? FinalScore { get; set; }
    public string? RemarkText { get; set; }
    public string? RemarkSource { get; set; }
}

public class GradeSubmissionRequest
{
    public long SubmissionId { get; set; }
    public decimal AssemblyScore { get; set; }         // 0 - 10
    public decimal AlgorithmExplainScore { get; set; } // 0 - 10
    public decimal TeamworkScore { get; set; }         // 0 - 10
    public string? RemarkText { get; set; }
    public string? RemarkSource { get; set; }          // "Typed", "Voice"
}

public class SubmissionGradingResultDto
{
    public long SubmissionId { get; set; }
    public decimal AutoAstScore { get; set; }
    public decimal HardwareScore { get; set; }
    public decimal FinalScore { get; set; }
    public string Status { get; set; } = string.Empty;
}

// ==================== SCR-TEA-06: PHÂN TÍCH PHỔ ĐIỂM LỚP HỌC ====================

public class ClassPerformanceAnalyticsDto
{
    public int ClassId { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public int TotalStudents { get; set; }
    public decimal AverageScore { get; set; }
    public decimal MinScore { get; set; }
    public decimal MaxScore { get; set; }
    public decimal HardwareAverage { get; set; }
    public decimal AstAverage { get; set; }
    public List<ScoreDistributionBucketDto> ScoreBuckets { get; set; } = new();
}

public class ScoreDistributionBucketDto
{
    public string Range { get; set; } = string.Empty;
    public int Count { get; set; }
}
