using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Infrastructure.Data;

public class ApplicationDbContext : TekyLearningHubContext, IApplicationDbContext
{
    public DbSet<StudentProjectSubmission> StudentProjectSubmissions => Set<StudentProjectSubmission>();
    public DbSet<AccountEmail> AccountEmails => Set<AccountEmail>();
    private void ValidateAuditActors()
    {
        foreach (var entry in ChangeTracker.Entries<AuditLog>()
            .Where(entry => entry.State is EntityState.Added or EntityState.Modified))
            entry.Entity.ActorType = entry.Entity.ActorType;
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        ValidateAuditActors();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        ValidateAuditActors();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }
    protected override void OnModelCreating(ModelBuilder modelBuilder) {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<StudentProjectSubmission>(entity =>
        {
            entity.ToTable("StudentProjectSubmissions");
            entity.HasKey(submission => new { submission.AssignmentId, submission.StudentId });
            entity.Property(submission => submission.FileName).HasMaxLength(180);
        });
        modelBuilder.Entity<User>().Property(x => x.Bio).HasMaxLength(1000);
        modelBuilder.Entity<User>().Property(x => x.SecurityVersion).IsConcurrencyToken();
        modelBuilder.Entity<User>().Property(x => x.PasswordHash).IsConcurrencyToken();
        modelBuilder.Entity<User>().Property(x => x.Phone).IsConcurrencyToken();
        modelBuilder.Entity<User>().Property(x => x.FailedLoginCount).IsConcurrencyToken();
        modelBuilder.Entity<PasswordResetOtp>().Property(x => x.UsedAt).IsConcurrencyToken();
        modelBuilder.Entity<PasswordResetOtp>().Property(x => x.Attempts).IsConcurrencyToken();
        modelBuilder.Entity<AccountEmail>().HasKey(x => x.Id);
    }
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }
}
