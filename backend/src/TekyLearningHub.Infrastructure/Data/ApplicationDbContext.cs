using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Infrastructure.Data;

public class ApplicationDbContext : TekyLearningHubContext, IApplicationDbContext
{
    public DbSet<AccountEmail> AccountEmails => Set<AccountEmail>();
    protected override void OnModelCreating(ModelBuilder modelBuilder) {
        base.OnModelCreating(modelBuilder);
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
