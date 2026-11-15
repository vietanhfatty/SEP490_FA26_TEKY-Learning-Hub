using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.Interfaces;

public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<AccountEmail> AccountEmails => throw new NotSupportedException();
    DbSet<Role> Roles { get; }
    DbSet<UserSession> UserSessions { get; }
    DbSet<AuditLog> AuditLogs { get; }
    DbSet<Course> Courses { get; }
    DbSet<Lesson> Lessons { get; }
    DbSet<LessonMaterial> LessonMaterials { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

