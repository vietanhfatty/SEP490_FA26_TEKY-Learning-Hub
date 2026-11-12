using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.Interfaces;

public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<Role> Roles { get; }
    DbSet<UserSession> UserSessions { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

