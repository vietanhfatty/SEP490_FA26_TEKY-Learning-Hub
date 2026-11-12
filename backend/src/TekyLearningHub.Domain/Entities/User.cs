using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class User
{
    public int UserId { get; set; }

    public string Email { get; set; } = null!;

    public string PasswordHash { get; set; } = null!;

    public byte RoleId { get; set; }

    public string FullName { get; set; } = null!;

    public string? Phone { get; set; }

    public string? Address { get; set; }

    public string? AvatarUrl { get; set; }

    public string ThemeMode { get; set; } = null!;

    public string Status { get; set; } = null!;

    public bool MustChangePwd { get; set; }

    public int FailedLoginCount { get; set; }

    public DateTime? LastLoginAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<AchievementCard> AchievementCards { get; set; } = new List<AchievementCard>();

    public virtual AdminProfile? AdminProfile { get; set; }

    public virtual ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();

    public virtual ICollection<AttendanceRecord> AttendanceRecords { get; set; } = new List<AttendanceRecord>();

    public virtual ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();

    public virtual ICollection<ChallengeMap> ChallengeMaps { get; set; } = new List<ChallengeMap>();

    public virtual ICollection<Course> Courses { get; set; } = new List<Course>();

    public virtual ICollection<GradeHistory> GradeHistories { get; set; } = new List<GradeHistory>();

    public virtual ICollection<Grade> Grades { get; set; } = new List<Grade>();

    public virtual ICollection<HardwareScore> HardwareScores { get; set; } = new List<HardwareScore>();

    public virtual ICollection<MakeupRequest> MakeupRequestProcessedByNavigations { get; set; } = new List<MakeupRequest>();

    public virtual ICollection<MakeupRequest> MakeupRequestRequestedByNavigations { get; set; } = new List<MakeupRequest>();

    public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();

    public virtual ParentProfile? ParentProfile { get; set; }

    public virtual ICollection<PasswordResetOtp> PasswordResetOtps { get; set; } = new List<PasswordResetOtp>();

    public virtual Role Role { get; set; } = null!;

    public virtual StudentProfile? StudentProfile { get; set; }

    public virtual TeacherProfile? TeacherProfile { get; set; }

    public virtual ICollection<UserSession> UserSessions { get; set; } = new List<UserSession>();
}
