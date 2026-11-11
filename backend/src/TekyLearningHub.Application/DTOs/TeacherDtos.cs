using TekyLearningHub.Domain.Enums;

namespace TekyLearningHub.Application.DTOs;

public class TeacherWorkspaceDto
{
    public Guid TeacherId { get; set; }
    public string TeacherName { get; set; } = string.Empty;
    public int PendingTaskCount { get; set; }
    public int ActiveClassesCount { get; set; }
    public List<TeacherScheduleSessionDto> WeeklySchedule { get; set; } = new();
    public List<AbsentAlertDto> RecentAbsentAlerts { get; set; } = new();
}

public class TeacherScheduleSessionDto
{
    public Guid SessionId { get; set; }
    public Guid ClassroomId { get; set; }
    public string ClassCode { get; set; } = string.Empty;
    public string ClassName { get; set; } = string.Empty;
    public int SessionNumber { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime ScheduledDate { get; set; }
    public string StartTime { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
    public string RoomName { get; set; } = string.Empty;
    public ClassSessionStatus Status { get; set; }
    public int EnrolledStudentsCount { get; set; }
    public int PresentCount { get; set; }
}

public class AbsentAlertDto
{
    public Guid StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string ClassCode { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public string Reason { get; set; } = "Chưa có mặt";
}

public class ClassAttendanceSessionDto
{
    public Guid SessionId { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public List<StudentAttendanceItemDto> Students { get; set; } = new();
}

public class StudentAttendanceItemDto
{
    public Guid AttendanceId { get; set; }
    public Guid StudentId { get; set; }
    public string StudentCode { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public AttendanceStatus Status { get; set; }
    public AttendanceSource Source { get; set; }
    public DateTime? CheckInTime { get; set; }
    public string? WorkstationIp { get; set; }
    public string? Notes { get; set; }
}

public class UpdateAttendanceItemRequest
{
    public Guid StudentId { get; set; }
    public AttendanceStatus Status { get; set; }
    public string? Notes { get; set; }
}

public class UpdateClassAttendanceRequest
{
    public Guid SessionId { get; set; }
    public List<UpdateAttendanceItemRequest> AttendanceList { get; set; } = new();
}

public class ReviewMakeupRequestDto
{
    public Guid RequestId { get; set; }
    public bool IsApproved { get; set; }
    public string? TeacherNote { get; set; }
}

public class CreateStemMapRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public int GridWidth { get; set; } = 10;
    public int GridHeight { get; set; } = 10;
    public int ParTimeSeconds { get; set; } = 60;
    public List<CreateMapCheckpointDto> Checkpoints { get; set; } = new();
}

public class CreateMapCheckpointDto
{
    public int OrderIndex { get; set; }
    public double CoordinateX { get; set; }
    public double CoordinateY { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? QuestionPrompt { get; set; }
}

public class GradeSubmissionRequest
{
    public Guid SubmissionId { get; set; }
    public double AssemblyScore { get; set; }         // 0 - 10
    public double AlgorithmExplainScore { get; set; } // 0 - 10
    public double TeamworkScore { get; set; }         // 0 - 10
    public string? TeacherNote { get; set; }
    public string? VoiceMemoUrl { get; set; }
    public string? VoiceMemoTranscript { get; set; }
}

public class SubmissionGradingResultDto
{
    public Guid SubmissionId { get; set; }
    public double AstAutoScore { get; set; }
    public double RubricScore { get; set; }
    public double TotalScore { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class ClassPerformanceAnalyticsDto
{
    public Guid ClassroomId { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public int TotalStudents { get; set; }
    public double AverageScore { get; set; }
    public double MinScore { get; set; }
    public double MaxScore { get; set; }
    public double AssemblyAverage { get; set; }
    public double AlgorithmAverage { get; set; }
    public double TeamworkAverage { get; set; }
    public List<ScoreDistributionBucketDto> ScoreBuckets { get; set; } = new();
}

public class ScoreDistributionBucketDto
{
    public string Range { get; set; } = string.Empty; // "0-5", "5-7", "7-8.5", "8.5-10"
    public int Count { get; set; }
}
