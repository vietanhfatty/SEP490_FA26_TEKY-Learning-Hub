using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Teacher> Teachers { get; }
    DbSet<Student> Students { get; }
    DbSet<Parent> Parents { get; }
    DbSet<ParentStudentRelation> ParentStudentRelations { get; }

    DbSet<Classroom> Classrooms { get; }
    DbSet<ClassStudent> ClassStudents { get; }
    DbSet<ClassSession> ClassSessions { get; }
    DbSet<Attendance> Attendances { get; }
    DbSet<MakeupRequest> MakeupRequests { get; }

    DbSet<StemMap> StemMaps { get; }
    DbSet<MapCheckpoint> MapCheckpoints { get; }
    DbSet<Assignment> Assignments { get; }
    DbSet<StudentSubmission> StudentSubmissions { get; }
    DbSet<SubmissionRubric> SubmissionRubrics { get; }

    DbSet<EContactBook> EContactBooks { get; }
    DbSet<CheerMessage> CheerMessages { get; }
    DbSet<StudentPortfolio> StudentPortfolios { get; }
    DbSet<WeeklyLeaderboard> WeeklyLeaderboards { get; }
    DbSet<NotificationLog> NotificationLogs { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
