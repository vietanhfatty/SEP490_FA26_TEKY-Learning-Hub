using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Infrastructure.Data;

public class ApplicationDbContext : TekyLearningHubContext
{
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<Position> Positions => Set<Position>();
    public DbSet<PositionAccessPolicy> PositionAccessPolicies => Set<PositionAccessPolicy>();
    public DbSet<PositionPolicyRole> PositionPolicyRoles => Set<PositionPolicyRole>();
    public DbSet<PositionPolicyPermission> PositionPolicyPermissions => Set<PositionPolicyPermission>();
    public DbSet<StaffAppointment> StaffAppointments => Set<StaffAppointment>();
    public DbSet<UserRoleGrantSource> UserRoleGrantSources => Set<UserRoleGrantSource>();
    public DbSet<UserRoleAssignment> UserRoles => Set<UserRoleAssignment>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<StudentProjectVersion> StudentProjectVersions => Set<StudentProjectVersion>();
    public DbSet<StudentProjectSubmission> StudentProjectSubmissions => Set<StudentProjectSubmission>();
    public DbSet<AccountEmail> AccountEmails => Set<AccountEmail>();
    public DbSet<AccountInvitation> AccountInvitations => Set<AccountInvitation>();
    public DbSet<Assessment> Assessments => Set<Assessment>();
    public DbSet<AssessmentAttempt> AssessmentAttempts => Set<AssessmentAttempt>();

    public DbSet<ParentCourseRequest> ParentCourseRequests => Set<ParentCourseRequest>();
    public DbSet<ParentPayment> ParentPayments => Set<ParentPayment>();

    public DbSet<ParentTeacherMessage> ParentTeacherMessages => Set<ParentTeacherMessage>();

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
        modelBuilder.Entity<Position>(entity =>
        {
            entity.ToTable("Positions").HasKey(x => x.PositionId);
            entity.HasOne(x => x.Department).WithMany().HasForeignKey(x => x.DepartmentId).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<PositionAccessPolicy>(entity =>
        {
            entity.ToTable("PositionAccessPolicies").HasKey(x => x.PolicyId);
            entity.HasOne(x => x.Position).WithMany(x => x.Policies).HasForeignKey(x => x.PositionId).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<PositionPolicyRole>(entity =>
        {
            entity.ToTable("PositionPolicyRoles").HasKey(x => new { x.PolicyId, x.RoleId });
            entity.HasOne(x => x.Policy).WithMany(x => x.Roles).HasForeignKey(x => x.PolicyId).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<PositionPolicyPermission>(entity =>
        {
            entity.ToTable("PositionPolicyPermissions").HasKey(x => new { x.PolicyId, x.PermissionId });
            entity.HasOne(x => x.Policy).WithMany(x => x.Permissions).HasForeignKey(x => x.PolicyId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Permission).WithMany().HasForeignKey(x => x.PermissionId).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<StaffAppointment>(entity =>
        {
            entity.ToTable("StaffAppointments").HasKey(x => x.AppointmentId);
            entity.HasOne(x => x.Position).WithMany().HasForeignKey(x => x.PositionId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Policy).WithMany().HasForeignKey(x => x.PolicyId).OnDelete(DeleteBehavior.Restrict);
            entity.Property(x => x.Version).IsConcurrencyToken();
        });
        modelBuilder.Entity<UserRoleGrantSource>(entity =>
        {
            entity.ToTable("UserRoleGrantSources", table => table.HasTrigger("trg_GrantSources_Validate")).HasKey(x => x.SourceId);
            entity.HasOne(x => x.Grant).WithMany(x => x.Sources).HasForeignKey(x => x.UserRoleId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Appointment).WithMany().HasForeignKey(x => x.AppointmentId).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<Department>(entity =>
        {
            entity.ToTable("Departments").HasKey(department => department.DepartmentId);
            entity.Property(department => department.Code).HasMaxLength(40).IsUnicode(false);
            entity.Property(department => department.Name).HasMaxLength(160);
            entity.Property(department => department.FunctionCode).HasMaxLength(20).IsUnicode(false);
        });
        modelBuilder.Entity<ParentTeacherMessage>().HasKey(m => m.MessageId);
        modelBuilder.Entity<ParentCourseRequest>().HasKey(x => x.RequestId);
        modelBuilder.Entity<ParentPayment>().HasKey(x => x.PaymentId);
        modelBuilder.Entity<ParentRefundRequest>().ToTable("ParentRefundRequests").HasKey(x => x.PaymentId);
        modelBuilder.Entity<ParentPayment>().HasOne(x => x.Refund).WithOne().HasForeignKey<ParentRefundRequest>(x => x.PaymentId);
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
        modelBuilder.Entity<Course>().ToTable(table => table.UseSqlOutputClause(false));
        modelBuilder.Entity<Lesson>().ToTable(table => table.UseSqlOutputClause(false));
        modelBuilder.Entity<LessonMaterial>().ToTable(table => table.UseSqlOutputClause(false));
        modelBuilder.Entity<ParentCourseRequest>().Property(x => x.ManagerNote).HasMaxLength(2000);
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
