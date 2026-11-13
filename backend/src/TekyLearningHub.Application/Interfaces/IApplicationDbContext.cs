using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.Interfaces;

public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<Role> Roles { get; }
    DbSet<TeacherProfile> TeacherProfiles { get; }
    DbSet<StudentProfile> StudentProfiles { get; }
    DbSet<ParentProfile> ParentProfiles { get; }
    DbSet<ParentStudentLink> ParentStudentLinks { get; }

    DbSet<Course> Courses { get; }
    DbSet<Class> Classes { get; }
    DbSet<ClassSession> ClassSessions { get; }
    DbSet<Room> Rooms { get; }
    DbSet<Enrollment> Enrollments { get; }
    DbSet<AttendanceRecord> AttendanceRecords { get; }
    DbSet<MakeupRequest> MakeupRequests { get; }

    DbSet<ChallengeMap> ChallengeMaps { get; }
    DbSet<MapCheckpoint> MapCheckpoints { get; }
    DbSet<Assignment> Assignments { get; }
    DbSet<Submission> Submissions { get; }
    DbSet<AstEvaluation> AstEvaluations { get; }
    DbSet<HardwareRubricCriterion> HardwareRubricCriteria { get; }
    DbSet<HardwareScore> HardwareScores { get; }
    DbSet<Grade> Grades { get; }

    DbSet<CheerSticker> CheerStickers { get; }
    DbSet<CheerMessage> CheerMessages { get; }
    DbSet<PortfolioItem> PortfolioItems { get; }
    DbSet<AchievementCard> AchievementCards { get; }
    DbSet<SimulationRun> SimulationRuns { get; }
    DbSet<LeaderboardCycle> LeaderboardCycles { get; }
    DbSet<LeaderboardEntry> LeaderboardEntries { get; }
    DbSet<Notification> Notifications { get; }
    DbSet<FocusModeSession> FocusModeSessions { get; }
    DbSet<SpotlightBroadcast> SpotlightBroadcasts { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
