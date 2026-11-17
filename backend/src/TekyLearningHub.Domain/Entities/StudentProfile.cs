using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class StudentProfile
{
    public int UserId { get; set; }

    public string StudentCode { get; set; } = null!;

    public DateOnly? DateOfBirth { get; set; }

    public string? Gender { get; set; }

    public string? SchoolName { get; set; }

    public string? GradeLevel { get; set; }

    public int TotalXp { get; set; }

    public int StemPoints { get; set; }

    public string Status { get; set; } = null!;

    public virtual ICollection<AchievementCard> AchievementCards { get; set; } = new List<AchievementCard>();

    public virtual ICollection<AttendanceRecord> AttendanceRecords { get; set; } = new List<AttendanceRecord>();

    public virtual ICollection<CheerMessage> CheerMessages { get; set; } = new List<CheerMessage>();

    public virtual ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();

    public virtual ICollection<LeaderboardEntry> LeaderboardEntries { get; set; } = new List<LeaderboardEntry>();

    public virtual ICollection<LessonProgress> LessonProgresses { get; set; } = new List<LessonProgress>();

    public virtual ICollection<ParentStudentLink> ParentStudentLinks { get; set; } = new List<ParentStudentLink>();

    public virtual ICollection<PortfolioItem> PortfolioItems { get; set; } = new List<PortfolioItem>();

    public virtual ICollection<SimulationRun> SimulationRuns { get; set; } = new List<SimulationRun>();

    public virtual ICollection<StudentBadge> StudentBadges { get; set; } = new List<StudentBadge>();

    public virtual ICollection<Submission> Submissions { get; set; } = new List<Submission>();

    public virtual User User { get; set; } = null!;

    public virtual ICollection<WorkspaceDraft> WorkspaceDrafts { get; set; } = new List<WorkspaceDraft>();

    public virtual ICollection<XpTransaction> XpTransactions { get; set; } = new List<XpTransaction>();
}
