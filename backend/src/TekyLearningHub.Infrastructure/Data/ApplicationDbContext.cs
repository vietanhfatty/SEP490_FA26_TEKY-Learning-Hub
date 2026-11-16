using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Infrastructure.Data;

public class ApplicationDbContext : TekyLearningHubContext
{
    public DbSet<UserRoleAssignment> UserRoles => Set<UserRoleAssignment>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<StudentProjectVersion> StudentProjectVersions => Set<StudentProjectVersion>();
    public DbSet<StudentProjectSubmission> StudentProjectSubmissions => Set<StudentProjectSubmission>();
    public DbSet<AccountEmail> AccountEmails => Set<AccountEmail>();
    public DbSet<AccountInvitation> AccountInvitations => Set<AccountInvitation>();
    public DbSet<Assessment> Assessments => Set<Assessment>();
    public DbSet<AssessmentAttempt> AssessmentAttempts => Set<AssessmentAttempt>();

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
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<AssessmentAttempt>(entity =>
        {
            entity.HasKey(a => a.AttemptId);
            entity.Property(a => a.AttemptId).ValueGeneratedNever();
        });
        modelBuilder.Entity<UserRoleAssignment>(entity =>
        {
            entity.ToTable("UserRoles");
            entity.HasKey(x => x.UserRoleId);
            entity.Property(x => x.ScopeType).HasMaxLength(20).IsUnicode(false);
            entity.HasOne(x => x.User).WithMany(x => x.RoleAssignments).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Role).WithMany().HasForeignKey(x => x.RoleId).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<Permission>(entity =>
        {
            entity.HasKey(x => x.PermissionId);
            entity.Property(x => x.Code).HasMaxLength(80).IsUnicode(false);
            entity.Property(x => x.Description).HasMaxLength(250);
        });
        modelBuilder.Entity<RolePermission>(entity =>
        {
            entity.HasKey(x => new { x.RoleId, x.PermissionId });
            entity.HasOne(x => x.Role).WithMany().HasForeignKey(x => x.RoleId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Permission).WithMany().HasForeignKey(x => x.PermissionId).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<StudentProjectVersion>(entity =>
        {
            entity.ToTable("StudentProjectVersions");
            entity.HasKey(x => new { x.AssignmentId, x.StudentId, x.AttemptNo });
            entity.Property(x => x.FileName).HasMaxLength(180);
            entity.Property(x => x.ReviewStatus).HasMaxLength(20).IsUnicode(false);
            entity.Property(x => x.Feedback).HasMaxLength(2000);
        });
        modelBuilder.Entity<StudentProjectSubmission>(entity =>
        {
            entity.ToTable("StudentProjectSubmissions");
            entity.Property(x => x.ReviewStatus).HasMaxLength(20).IsUnicode(false);
            entity.Property(x => x.Feedback).HasMaxLength(2000);
            entity.HasKey(submission => new { submission.AssignmentId, submission.StudentId });
            entity.Property(submission => submission.FileName).HasMaxLength(180);
        });
        modelBuilder.Entity<User>().Property(x => x.Bio).HasMaxLength(1000);
        modelBuilder.Entity<User>().Property(x => x.SecurityVersion).IsConcurrencyToken();
        modelBuilder.Entity<User>().Property(x => x.AdministrationVersion).IsConcurrencyToken();
        modelBuilder.Entity<User>().Property(x => x.PasswordHash).IsConcurrencyToken();
        modelBuilder.Entity<User>().Property(x => x.Phone).IsConcurrencyToken();
        modelBuilder.Entity<User>().Property(x => x.FailedLoginCount).IsConcurrencyToken();
        modelBuilder.Entity<PasswordResetOtp>().Property(x => x.UsedAt).IsConcurrencyToken();
        modelBuilder.Entity<PasswordResetOtp>().Property(x => x.Attempts).IsConcurrencyToken();
        modelBuilder.Entity<AccountEmail>().HasKey(x => x.Id);
        modelBuilder.Entity<AccountInvitation>(entity =>
        {
            entity.ToTable("AccountInvitations"); entity.HasKey(x => x.Id);
            entity.Property(x => x.TokenHash).HasMaxLength(255).IsRequired();
            entity.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        });
    }
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }
}
