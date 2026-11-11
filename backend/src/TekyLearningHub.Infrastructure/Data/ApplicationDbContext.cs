using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Infrastructure.Data;

public class ApplicationDbContext : DbContext, IApplicationDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<Teacher> Teachers => Set<Teacher>();
    public DbSet<Student> Students => Set<Student>();
    public DbSet<Parent> Parents => Set<Parent>();
    public DbSet<ParentStudentRelation> ParentStudentRelations => Set<ParentStudentRelation>();

    public DbSet<Classroom> Classrooms => Set<Classroom>();
    public DbSet<ClassStudent> ClassStudents => Set<ClassStudent>();
    public DbSet<ClassSession> ClassSessions => Set<ClassSession>();
    public DbSet<Attendance> Attendances => Set<Attendance>();
    public DbSet<MakeupRequest> MakeupRequests => Set<MakeupRequest>();

    public DbSet<StemMap> StemMaps => Set<StemMap>();
    public DbSet<MapCheckpoint> MapCheckpoints => Set<MapCheckpoint>();
    public DbSet<Assignment> Assignments => Set<Assignment>();
    public DbSet<StudentSubmission> StudentSubmissions => Set<StudentSubmission>();
    public DbSet<SubmissionRubric> SubmissionRubrics => Set<SubmissionRubric>();

    public DbSet<EContactBook> EContactBooks => Set<EContactBook>();
    public DbSet<CheerMessage> CheerMessages => Set<CheerMessage>();
    public DbSet<StudentPortfolio> StudentPortfolios => Set<StudentPortfolio>();
    public DbSet<WeeklyLeaderboard> WeeklyLeaderboards => Set<WeeklyLeaderboard>();
    public DbSet<NotificationLog> NotificationLogs => Set<NotificationLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Teacher
        modelBuilder.Entity<Teacher>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FullName).IsRequired().HasMaxLength(150);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(150);
            entity.HasIndex(e => e.UserId).IsUnique();
        });

        // Student
        modelBuilder.Entity<Student>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.StudentCode).IsRequired().HasMaxLength(50);
            entity.Property(e => e.FullName).IsRequired().HasMaxLength(150);
            entity.HasIndex(e => e.StudentCode).IsUnique();
            entity.HasIndex(e => e.UserId).IsUnique();
        });

        // Parent
        modelBuilder.Entity<Parent>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FullName).IsRequired().HasMaxLength(150);
            entity.Property(e => e.PhoneNumber).IsRequired().HasMaxLength(20);
            entity.HasIndex(e => e.UserId).IsUnique();
        });

        // ParentStudentRelation
        modelBuilder.Entity<ParentStudentRelation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Parent)
                .WithMany(p => p.StudentRelations)
                .HasForeignKey(e => e.ParentId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Student)
                .WithMany(s => s.ParentRelations)
                .HasForeignKey(e => e.StudentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Classroom
        modelBuilder.Entity<Classroom>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ClassCode).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(150);
            entity.HasOne(e => e.Teacher)
                .WithMany(t => t.Classrooms)
                .HasForeignKey(e => e.TeacherId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ClassStudent
        modelBuilder.Entity<ClassStudent>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Classroom)
                .WithMany(c => c.Students)
                .HasForeignKey(e => e.ClassroomId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Student)
                .WithMany(s => s.ClassEnrollments)
                .HasForeignKey(e => e.StudentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ClassSession
        modelBuilder.Entity<ClassSession>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.HasOne(e => e.Classroom)
                .WithMany(c => c.Sessions)
                .HasForeignKey(e => e.ClassroomId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Attendance
        modelBuilder.Entity<Attendance>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.ClassSession)
                .WithMany(s => s.Attendances)
                .HasForeignKey(e => e.ClassSessionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Student)
                .WithMany(s => s.Attendances)
                .HasForeignKey(e => e.StudentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // MakeupRequest
        modelBuilder.Entity<MakeupRequest>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Student)
                .WithMany()
                .HasForeignKey(e => e.StudentId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.OriginalSession)
                .WithMany()
                .HasForeignKey(e => e.OriginalSessionId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.TargetSession)
                .WithMany()
                .HasForeignKey(e => e.TargetSessionId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // StemMap & Checkpoints
        modelBuilder.Entity<StemMap>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(150);
            entity.HasOne(e => e.Teacher)
                .WithMany(t => t.CreatedMaps)
                .HasForeignKey(e => e.TeacherId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<MapCheckpoint>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.StemMap)
                .WithMany(m => m.Checkpoints)
                .HasForeignKey(e => e.StemMapId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Assignment & Submissions
        modelBuilder.Entity<Assignment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.HasOne(e => e.Classroom)
                .WithMany(c => c.Assignments)
                .HasForeignKey(e => e.ClassroomId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.StemMap)
                .WithMany(m => m.Assignments)
                .HasForeignKey(e => e.StemMapId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<StudentSubmission>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Assignment)
                .WithMany(a => a.Submissions)
                .HasForeignKey(e => e.AssignmentId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Student)
                .WithMany(s => s.Submissions)
                .HasForeignKey(e => e.StudentId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.ClassSession)
                .WithMany()
                .HasForeignKey(e => e.ClassSessionId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<SubmissionRubric>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.StudentSubmission)
                .WithOne(s => s.RubricDetail)
                .HasForeignKey<SubmissionRubric>(e => e.StudentSubmissionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // EContactBook
        modelBuilder.Entity<EContactBook>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.ClassSession)
                .WithMany(s => s.ContactBooks)
                .HasForeignKey(e => e.ClassSessionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Student)
                .WithMany()
                .HasForeignKey(e => e.StudentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // CheerMessage
        modelBuilder.Entity<CheerMessage>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Parent)
                .WithMany(p => p.SentCheerMessages)
                .HasForeignKey(e => e.ParentId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Student)
                .WithMany()
                .HasForeignKey(e => e.StudentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // StudentPortfolio
        modelBuilder.Entity<StudentPortfolio>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.QrCodeKey).IsUnique();
            entity.HasOne(e => e.Student)
                .WithMany(s => s.Portfolios)
                .HasForeignKey(e => e.StudentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // WeeklyLeaderboard
        modelBuilder.Entity<WeeklyLeaderboard>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Classroom)
                .WithMany()
                .HasForeignKey(e => e.ClassroomId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Student)
                .WithMany()
                .HasForeignKey(e => e.StudentId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
