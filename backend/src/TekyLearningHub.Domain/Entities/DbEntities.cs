using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public class Role
{
    public byte RoleId { get; set; }
    public string RoleName { get; set; } = string.Empty;
}

public class User
{
    public int UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public byte RoleId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? AvatarUrl { get; set; }
    public string ThemeMode { get; set; } = "light";
    public string Status { get; set; } = "Active";
    public bool MustChangePwd { get; set; } = false;
    public int FailedLoginCount { get; set; } = 0;
    public DateTime? LastLoginAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public Role Role { get; set; } = null!;
    public TeacherProfile? TeacherProfile { get; set; }
    public StudentProfile? StudentProfile { get; set; }
    public ParentProfile? ParentProfile { get; set; }
}

public class TeacherProfile
{
    public int UserId { get; set; }
    public string TeacherCode { get; set; } = string.Empty;
    public string? Specialty { get; set; }
    public string? Bio { get; set; }
    public DateOnly? HireDate { get; set; }

    public User User { get; set; } = null!;
    public ICollection<Class> Classes { get; set; } = new List<Class>();
}

public class StudentProfile
{
    public int UserId { get; set; }
    public string StudentCode { get; set; } = string.Empty;
    public DateOnly? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? SchoolName { get; set; }
    public string? GradeLevel { get; set; }
    public int TotalXp { get; set; } = 0;
    public int StemPoints { get; set; } = 0;
    public string Status { get; set; } = "Active";

    public User User { get; set; } = null!;
    public ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();
    public ICollection<AttendanceRecord> AttendanceRecords { get; set; } = new List<AttendanceRecord>();
    public ICollection<Submission> Submissions { get; set; } = new List<Submission>();
    public ICollection<ParentStudentLink> ParentLinks { get; set; } = new List<ParentStudentLink>();
    public ICollection<PortfolioItem> PortfolioItems { get; set; } = new List<PortfolioItem>();
    public ICollection<AchievementCard> AchievementCards { get; set; } = new List<AchievementCard>();
}

public class ParentProfile
{
    public int UserId { get; set; }
    public string? Occupation { get; set; }

    public User User { get; set; } = null!;
    public ICollection<ParentStudentLink> StudentLinks { get; set; } = new List<ParentStudentLink>();
    public ICollection<CheerMessage> SentCheerMessages { get; set; } = new List<CheerMessage>();
}

public class ParentStudentLink
{
    public int LinkId { get; set; }
    public int ParentId { get; set; }
    public int StudentId { get; set; }
    public string? Relationship { get; set; }
    public string Status { get; set; } = "Active";
    public DateTime LinkedAt { get; set; } = DateTime.UtcNow;

    public ParentProfile Parent { get; set; } = null!;
    public StudentProfile Student { get; set; } = null!;
}

public class Room
{
    public int RoomId { get; set; }
    public string RoomName { get; set; } = string.Empty;
    public int Capacity { get; set; } = 15;
    public string Status { get; set; } = "Active";
}

public class Course
{
    public int CourseId { get; set; }
    public string CourseCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? LevelCode { get; set; }
    public string Status { get; set; } = "Active";
    public int? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Class> Classes { get; set; } = new List<Class>();
}

public class Class
{
    public int ClassId { get; set; }
    public string ClassCode { get; set; } = string.Empty;
    public int CourseId { get; set; }
    public int? TeacherId { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public int MaxStudents { get; set; } = 15;
    public string Status { get; set; } = "Active";

    public Course Course { get; set; } = null!;
    public TeacherProfile? Teacher { get; set; }
    public ICollection<ClassSession> Sessions { get; set; } = new List<ClassSession>();
    public ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();
    public ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();
}

public class ClassSession
{
    public int SessionId { get; set; }
    public int ClassId { get; set; }
    public int? LessonId { get; set; }
    public int? RoomId { get; set; }
    public DateOnly SessionDate { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public string Status { get; set; } = "Scheduled"; // Scheduled, InProgress, Completed, Cancelled

    public Class Class { get; set; } = null!;
    public Room? Room { get; set; }
    public ICollection<AttendanceRecord> AttendanceRecords { get; set; } = new List<AttendanceRecord>();
}

public class Enrollment
{
    public int EnrollmentId { get; set; }
    public int ClassId { get; set; }
    public int StudentId { get; set; }
    public string Status { get; set; } = "Enrolled";
    public decimal ProgressPercent { get; set; } = 0m;
    public int? TransferredFromId { get; set; }
    public DateTime EnrolledAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    public Class Class { get; set; } = null!;
    public StudentProfile Student { get; set; } = null!;
}

public class AttendanceRecord
{
    public long AttendanceId { get; set; }
    public int SessionId { get; set; }
    public int StudentId { get; set; }
    public string Status { get; set; } = "Absent"; // Present, Late, Absent, Excused
    public string? AbsenceReason { get; set; }
    public int MarkedBy { get; set; }
    public DateTime MarkedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public ClassSession Session { get; set; } = null!;
    public StudentProfile Student { get; set; } = null!;
}

public class MakeupRequest
{
    public int MakeupId { get; set; }
    public long AttendanceId { get; set; }
    public int RequestedBy { get; set; }
    public int? SuggestedLessonId { get; set; }
    public int? PreferredSessionId { get; set; }
    public string? Reason { get; set; }
    public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected
    public int? ProcessedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }

    public AttendanceRecord Attendance { get; set; } = null!;
    public ClassSession? PreferredSession { get; set; }
}

public class ChallengeMap
{
    public int MapId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Theme { get; set; }
    public string LayoutJson { get; set; } = "{}";
    public int StartX { get; set; } = 0;
    public int StartY { get; set; } = 0;
    public string Status { get; set; } = "Active";
    public int? CreatedBy { get; set; }

    public ICollection<MapCheckpoint> Checkpoints { get; set; } = new List<MapCheckpoint>();
}

public class MapCheckpoint
{
    public int CheckpointId { get; set; }
    public int MapId { get; set; }
    public int SeqNo { get; set; }
    public int X { get; set; }
    public int Y { get; set; }
    public string? UnlockMessage { get; set; }
    public bool IsFinish { get; set; } = false;

    public ChallengeMap Map { get; set; } = null!;
}

public class Assignment
{
    public int AssignmentId { get; set; }
    public int ClassId { get; set; }
    public int? LessonId { get; set; }
    public int? MapId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Instructions { get; set; }
    public DateTime? DueAt { get; set; }
    public string Status { get; set; } = "Published"; // Draft, Published, Closed (DB CHECK)
    public DateTime? ClosedAt { get; set; }
    public string? ClosedReason { get; set; }
    public string? MasterAstJson { get; set; }
    public bool MasterTested { get; set; } = false;
    public decimal AstWeight { get; set; } = 0.6m;       // 60% AST
    public decimal HardwareWeight { get; set; } = 0.4m;  // 40% Qualitative Rubric
    public decimal MaxScore { get; set; } = 10.0m;
    public int? MaxAttempts { get; set; } = 3;
    public int? ParTimeMs { get; set; }
    public int? ParBlockCount { get; set; }
    public int MaxXp { get; set; } = 100;
    public int CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Class Class { get; set; } = null!;
    public ChallengeMap? Map { get; set; }
    public ICollection<Submission> Submissions { get; set; } = new List<Submission>();
    public ICollection<HardwareRubricCriterion> RubricCriteria { get; set; } = new List<HardwareRubricCriterion>();
}

public class Submission
{
    public long SubmissionId { get; set; }
    public int AssignmentId { get; set; }
    public int StudentId { get; set; }
    public int AttemptNo { get; set; } = 1;
    public string BlocklyJson { get; set; } = "{}";
    public string? AstJson { get; set; }
    public string Status { get; set; } = "Pending"; // Pending, AutoGraded, Finalized (DB CHECK)
    public bool IsCurrent { get; set; } = true;
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

    public Assignment Assignment { get; set; } = null!;
    public StudentProfile Student { get; set; } = null!;
    public AstEvaluation? AstEvaluation { get; set; }
    public Grade? Grade { get; set; }
}

public class AstEvaluation
{
    public long EvaluationId { get; set; }
    public long SubmissionId { get; set; }
    public decimal AutoAstScore { get; set; }
    public decimal MatchPercent { get; set; }
    public string? EngineVersion { get; set; } = "v2.1-ZhangShasha";
    public DateTime EvaluatedAt { get; set; } = DateTime.UtcNow;

    public Submission Submission { get; set; } = null!;
}

public class HardwareRubricCriterion
{
    public int CriterionId { get; set; }
    public int AssignmentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal MaxPoints { get; set; } = 10.0m;
    public int SortOrder { get; set; } = 1;

    public Assignment Assignment { get; set; } = null!;
}

public class HardwareScore
{
    public long GradeId { get; set; }
    public int CriterionId { get; set; }
    public decimal Points { get; set; }
    public int ScoredBy { get; set; }
    public DateTime ScoredAt { get; set; } = DateTime.UtcNow;

    public Grade Grade { get; set; } = null!;
    public HardwareRubricCriterion Criterion { get; set; } = null!;
}

public class Grade
{
    public long GradeId { get; set; }
    public long SubmissionId { get; set; }
    public decimal? AutoAstScore { get; set; }
    public decimal? HardwareScore { get; set; }
    public decimal? FinalScore { get; set; }
    public string? RemarkText { get; set; }
    public string? RemarkSource { get; set; } // Typed, Voice (DB CHECK)
    public bool IsFinalized { get; set; } = false;
    public int? FinalizedBy { get; set; }
    public DateTime? FinalizedAt { get; set; }

    public Submission Submission { get; set; } = null!;
    public ICollection<HardwareScore> HardwareScores { get; set; } = new List<HardwareScore>();
}

public class CheerSticker
{
    public int StickerId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
}

public class CheerMessage
{
    public long CheerId { get; set; }
    public int ParentId { get; set; }
    public int StudentId { get; set; }
    public int? StickerId { get; set; }
    public string? Message { get; set; }
    public int? SessionId { get; set; }
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
    public DateTime? SeenAt { get; set; }

    public ParentProfile Parent { get; set; } = null!;
    public StudentProfile Student { get; set; } = null!;
    public CheerSticker? Sticker { get; set; }
    public ClassSession? Session { get; set; }
}

public class PortfolioItem
{
    public int ItemId { get; set; }
    public int StudentId { get; set; }
    public long SubmissionId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Summary { get; set; }
    public string? ThumbnailUrl { get; set; }
    public decimal? FinalScore { get; set; }
    public DateTime CompletedAt { get; set; } = DateTime.UtcNow;

    public StudentProfile Student { get; set; } = null!;
    public Submission Submission { get; set; } = null!;
    public ICollection<AchievementCard> Cards { get; set; } = new List<AchievementCard>();
}

public class AchievementCard
{
    public int CardId { get; set; }
    public int StudentId { get; set; }
    public int? ItemId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? CardImageUrl { get; set; }
    public Guid QrToken { get; set; } = Guid.NewGuid();
    public bool IsPublic { get; set; } = true;
    public int ExportedBy { get; set; }
    public int ViewCount { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public StudentProfile Student { get; set; } = null!;
    public PortfolioItem? Item { get; set; }
}

public class LeaderboardCycle
{
    public int CycleId { get; set; }
    public DateOnly WeekStart { get; set; }
    public DateOnly WeekEnd { get; set; }
    public string Status { get; set; } = "Active";

    public ICollection<LeaderboardEntry> Entries { get; set; } = new List<LeaderboardEntry>();
}

public class SimulationRun
{
    public long RunId { get; set; }
    public int AssignmentId { get; set; }
    public int StudentId { get; set; }
    public long? SubmissionId { get; set; }
    public int MapId { get; set; }
    public int ExecTimeMs { get; set; }
    public int BlockCount { get; set; }
    public int CheckpointsReached { get; set; } = 0;
    public bool ReachedFinish { get; set; } = false;
    public string? TrajectoryJson { get; set; }
    public DateTime RunAt { get; set; } = DateTime.UtcNow;
}

public class LeaderboardEntry
{
    public long EntryId { get; set; }
    public int CycleId { get; set; }
    public int MapId { get; set; }
    public int StudentId { get; set; }
    public long BestRunId { get; set; } = 0;
    public int BestTimeMs { get; set; } = 0;
    public int BestBlockCount { get; set; } = 0;
    public int XpEarned { get; set; } = 0;
    public int? RankNo { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public LeaderboardCycle Cycle { get; set; } = null!;
    public StudentProfile Student { get; set; } = null!;
}

public class Notification
{
    public long NotificationId { get; set; }
    public int RecipientId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Body { get; set; }
    public string? RefType { get; set; }
    public long? RefId { get; set; }
    public bool IsRead { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt { get; set; }
}

public class FocusModeSession
{
    public int FocusId { get; set; }
    public int SessionId { get; set; }
    public int TeacherId { get; set; }
    public string? Message { get; set; }
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? EndedAt { get; set; }
}

public class SpotlightBroadcast
{
    public int BroadcastId { get; set; }
    public int SessionId { get; set; }
    public long SubmissionId { get; set; }
    public int TeacherId { get; set; }
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? EndedAt { get; set; }
}
