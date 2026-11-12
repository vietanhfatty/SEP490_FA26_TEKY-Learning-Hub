using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Infrastructure.Data;

public class ApplicationDbContext : DbContext, IApplicationDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<TeacherProfile> TeacherProfiles => Set<TeacherProfile>();
    public DbSet<StudentProfile> StudentProfiles => Set<StudentProfile>();
    public DbSet<ParentProfile> ParentProfiles => Set<ParentProfile>();
    public DbSet<ParentStudentLink> ParentStudentLinks => Set<ParentStudentLink>();

    public DbSet<Course> Courses => Set<Course>();
    public DbSet<Class> Classes => Set<Class>();
    public DbSet<ClassSession> ClassSessions => Set<ClassSession>();
    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<Enrollment> Enrollments => Set<Enrollment>();
    public DbSet<AttendanceRecord> AttendanceRecords => Set<AttendanceRecord>();
    public DbSet<MakeupRequest> MakeupRequests => Set<MakeupRequest>();

    public DbSet<ChallengeMap> ChallengeMaps => Set<ChallengeMap>();
    public DbSet<MapCheckpoint> MapCheckpoints => Set<MapCheckpoint>();
    public DbSet<Assignment> Assignments => Set<Assignment>();
    public DbSet<Submission> Submissions => Set<Submission>();
    public DbSet<AstEvaluation> AstEvaluations => Set<AstEvaluation>();
    public DbSet<HardwareRubricCriterion> HardwareRubricCriteria => Set<HardwareRubricCriterion>();
    public DbSet<HardwareScore> HardwareScores => Set<HardwareScore>();
    public DbSet<Grade> Grades => Set<Grade>();

    public DbSet<CheerSticker> CheerStickers => Set<CheerSticker>();
    public DbSet<CheerMessage> CheerMessages => Set<CheerMessage>();
    public DbSet<PortfolioItem> PortfolioItems => Set<PortfolioItem>();
    public DbSet<AchievementCard> AchievementCards => Set<AchievementCard>();
    public DbSet<LeaderboardCycle> LeaderboardCycles => Set<LeaderboardCycle>();
    public DbSet<LeaderboardEntry> LeaderboardEntries => Set<LeaderboardEntry>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<FocusModeSession> FocusModeSessions => Set<FocusModeSession>();
    public DbSet<SpotlightBroadcast> SpotlightBroadcasts => Set<SpotlightBroadcast>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User & Profiles
        modelBuilder.Entity<Role>(e =>
        {
            e.ToTable("Roles");
            e.HasKey(r => r.RoleId);
        });

        modelBuilder.Entity<User>(e =>
        {
            e.ToTable("Users");
            e.HasKey(u => u.UserId);
            e.HasOne(u => u.Role).WithMany().HasForeignKey(u => u.RoleId);
        });

        modelBuilder.Entity<TeacherProfile>(e =>
        {
            e.ToTable("TeacherProfiles");
            e.HasKey(t => t.UserId);
            e.HasOne(t => t.User).WithOne(u => u.TeacherProfile).HasForeignKey<TeacherProfile>(t => t.UserId);
        });

        modelBuilder.Entity<StudentProfile>(e =>
        {
            e.ToTable("StudentProfiles");
            e.HasKey(s => s.UserId);
            e.HasOne(s => s.User).WithOne(u => u.StudentProfile).HasForeignKey<StudentProfile>(s => s.UserId);
        });

        modelBuilder.Entity<ParentProfile>(e =>
        {
            e.ToTable("ParentProfiles");
            e.HasKey(p => p.UserId);
            e.HasOne(p => p.User).WithOne(u => u.ParentProfile).HasForeignKey<ParentProfile>(p => p.UserId);
        });

        modelBuilder.Entity<ParentStudentLink>(e =>
        {
            e.ToTable("ParentStudentLinks");
            e.HasKey(l => l.LinkId);
            e.HasOne(l => l.Parent).WithMany(p => p.StudentLinks).HasForeignKey(l => l.ParentId);
            e.HasOne(l => l.Student).WithMany(s => s.ParentLinks).HasForeignKey(l => l.StudentId);
        });

        modelBuilder.Entity<Room>(e =>
        {
            e.ToTable("Rooms");
            e.HasKey(r => r.RoomId);
        });

        modelBuilder.Entity<Course>(e =>
        {
            e.ToTable("Courses");
            e.HasKey(c => c.CourseId);
        });

        modelBuilder.Entity<Class>(e =>
        {
            e.ToTable("Classes");
            e.HasKey(c => c.ClassId);
            e.HasOne(c => c.Course).WithMany(co => co.Classes).HasForeignKey(c => c.CourseId);
            e.HasOne(c => c.Teacher).WithMany(t => t.Classes).HasForeignKey(c => c.TeacherId);
        });

        modelBuilder.Entity<ClassSession>(e =>
        {
            e.ToTable("ClassSessions");
            e.HasKey(s => s.SessionId);
            e.HasOne(s => s.Class).WithMany(c => c.Sessions).HasForeignKey(s => s.ClassId);
            e.HasOne(s => s.Room).WithMany().HasForeignKey(s => s.RoomId);
        });

        modelBuilder.Entity<Enrollment>(e =>
        {
            e.ToTable("Enrollments");
            e.HasKey(en => en.EnrollmentId);
            e.HasOne(en => en.Class).WithMany(c => c.Enrollments).HasForeignKey(en => en.ClassId);
            e.HasOne(en => en.Student).WithMany(s => s.Enrollments).HasForeignKey(en => en.StudentId);
        });

        modelBuilder.Entity<AttendanceRecord>(e =>
        {
            e.ToTable("AttendanceRecords");
            e.HasKey(a => a.AttendanceId);
            e.HasOne(a => a.Session).WithMany(s => s.AttendanceRecords).HasForeignKey(a => a.SessionId);
            e.HasOne(a => a.Student).WithMany(s => s.AttendanceRecords).HasForeignKey(a => a.StudentId);
        });

        modelBuilder.Entity<MakeupRequest>(e =>
        {
            e.ToTable("MakeupRequests");
            e.HasKey(m => m.MakeupId);
            e.HasOne(m => m.Attendance).WithMany().HasForeignKey(m => m.AttendanceId);
            e.HasOne(m => m.PreferredSession).WithMany().HasForeignKey(m => m.PreferredSessionId);
        });

        modelBuilder.Entity<ChallengeMap>(e =>
        {
            e.ToTable("ChallengeMaps");
            e.HasKey(m => m.MapId);
        });

        modelBuilder.Entity<MapCheckpoint>(e =>
        {
            e.ToTable("MapCheckpoints");
            e.HasKey(cp => cp.CheckpointId);
            e.HasOne(cp => cp.Map).WithMany(m => m.Checkpoints).HasForeignKey(cp => cp.MapId);
        });

        modelBuilder.Entity<Assignment>(e =>
        {
            e.ToTable("Assignments");
            e.HasKey(a => a.AssignmentId);
            e.HasOne(a => a.Class).WithMany(c => c.Assignments).HasForeignKey(a => a.ClassId);
            e.HasOne(a => a.Map).WithMany().HasForeignKey(a => a.MapId);
        });

        modelBuilder.Entity<Submission>(e =>
        {
            e.ToTable("Submissions");
            e.HasKey(s => s.SubmissionId);
            e.HasOne(s => s.Assignment).WithMany(a => a.Submissions).HasForeignKey(s => s.AssignmentId);
            e.HasOne(s => s.Student).WithMany(st => st.Submissions).HasForeignKey(s => s.StudentId);
        });

        modelBuilder.Entity<AstEvaluation>(e =>
        {
            e.ToTable("AstEvaluations");
            e.HasKey(ev => ev.EvaluationId);
            e.HasOne(ev => ev.Submission).WithOne(s => s.AstEvaluation).HasForeignKey<AstEvaluation>(ev => ev.SubmissionId);
        });

        modelBuilder.Entity<HardwareRubricCriterion>(e =>
        {
            e.ToTable("HardwareRubricCriteria");
            e.HasKey(rc => rc.CriterionId);
            e.HasOne(rc => rc.Assignment).WithMany(a => a.RubricCriteria).HasForeignKey(rc => rc.AssignmentId);
        });

        modelBuilder.Entity<HardwareScore>(e =>
        {
            e.ToTable("HardwareScores");
            e.HasKey(hs => new { hs.GradeId, hs.CriterionId });
            e.HasOne(hs => hs.Grade).WithMany(g => g.HardwareScores).HasForeignKey(hs => hs.GradeId);
            e.HasOne(hs => hs.Criterion).WithMany().HasForeignKey(hs => hs.CriterionId);
        });

        modelBuilder.Entity<Grade>(e =>
        {
            e.ToTable("Grades");
            e.HasKey(g => g.GradeId);
            e.HasOne(g => g.Submission).WithOne(s => s.Grade).HasForeignKey<Grade>(g => g.SubmissionId);
        });

        modelBuilder.Entity<CheerSticker>(e =>
        {
            e.ToTable("CheerStickers");
            e.HasKey(cs => cs.StickerId);
        });

        modelBuilder.Entity<CheerMessage>(e =>
        {
            e.ToTable("CheerMessages");
            e.HasKey(cm => cm.CheerId);
            e.HasOne(cm => cm.Parent).WithMany(p => p.SentCheerMessages).HasForeignKey(cm => cm.ParentId);
            e.HasOne(cm => cm.Student).WithMany().HasForeignKey(cm => cm.StudentId);
            e.HasOne(cm => cm.Sticker).WithMany().HasForeignKey(cm => cm.StickerId);
            e.HasOne(cm => cm.Session).WithMany().HasForeignKey(cm => cm.SessionId);
        });

        modelBuilder.Entity<PortfolioItem>(e =>
        {
            e.ToTable("PortfolioItems");
            e.HasKey(pi => pi.ItemId);
            e.HasOne(pi => pi.Student).WithMany(s => s.PortfolioItems).HasForeignKey(pi => pi.StudentId);
            e.HasOne(pi => pi.Submission).WithMany().HasForeignKey(pi => pi.SubmissionId);
        });

        modelBuilder.Entity<AchievementCard>(e =>
        {
            e.ToTable("AchievementCards");
            e.HasKey(ac => ac.CardId);
            e.HasOne(ac => ac.Student).WithMany(s => s.AchievementCards).HasForeignKey(ac => ac.StudentId);
            e.HasOne(ac => ac.Item).WithMany(i => i.Cards).HasForeignKey(ac => ac.ItemId);
        });

        modelBuilder.Entity<LeaderboardCycle>(e =>
        {
            e.ToTable("LeaderboardCycles");
            e.HasKey(lc => lc.CycleId);
        });

        modelBuilder.Entity<LeaderboardEntry>(e =>
        {
            e.ToTable("LeaderboardEntries");
            e.HasKey(le => le.EntryId);
            e.HasOne(le => le.Cycle).WithMany(c => c.Entries).HasForeignKey(le => le.CycleId);
            e.HasOne(le => le.Student).WithMany().HasForeignKey(le => le.StudentId);
        });

        modelBuilder.Entity<Notification>(e =>
        {
            e.ToTable("Notifications");
            e.HasKey(n => n.NotificationId);
        });

        modelBuilder.Entity<FocusModeSession>(e =>
        {
            e.ToTable("FocusModeSessions");
            e.HasKey(f => f.FocusId);
        });

        modelBuilder.Entity<SpotlightBroadcast>(e =>
        {
            e.ToTable("SpotlightBroadcasts");
            e.HasKey(sb => sb.BroadcastId);
        });
    }
}
