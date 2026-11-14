using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace TekyLearningHub.Domain.Entities;

public partial class TekyLearningHubContext : DbContext
{
    public TekyLearningHubContext()
    {
    }

    public TekyLearningHubContext(DbContextOptions options)
        : base(options)
    {
    }

    public virtual DbSet<AchievementCard> AchievementCards { get; set; }

    public virtual DbSet<AdminProfile> AdminProfiles { get; set; }

    public virtual DbSet<Assignment> Assignments { get; set; }

    public virtual DbSet<AstDeviation> AstDeviations { get; set; }

    public virtual DbSet<AstEvaluation> AstEvaluations { get; set; }

    public virtual DbSet<AttendanceRecord> AttendanceRecords { get; set; }

    public virtual DbSet<AuditLog> AuditLogs { get; set; }

    public virtual DbSet<Badge> Badges { get; set; }

    public virtual DbSet<ChallengeMap> ChallengeMaps { get; set; }

    public virtual DbSet<CheerMessage> CheerMessages { get; set; }

    public virtual DbSet<CheerSticker> CheerStickers { get; set; }

    public virtual DbSet<Class> Classes { get; set; }

    public virtual DbSet<ClassSession> ClassSessions { get; set; }

    public virtual DbSet<Course> Courses { get; set; }

    public virtual DbSet<Enrollment> Enrollments { get; set; }

    public virtual DbSet<FocusModeSession> FocusModeSessions { get; set; }

    public virtual DbSet<Grade> Grades { get; set; }

    public virtual DbSet<GradeHistory> GradeHistories { get; set; }

    public virtual DbSet<HardwareRubricCriterion> HardwareRubricCriteria { get; set; }

    public virtual DbSet<HardwareScore> HardwareScores { get; set; }

    public virtual DbSet<LeaderboardCycle> LeaderboardCycles { get; set; }

    public virtual DbSet<LeaderboardEntry> LeaderboardEntries { get; set; }

    public virtual DbSet<Lesson> Lessons { get; set; }

    public virtual DbSet<LessonMaterial> LessonMaterials { get; set; }

    public virtual DbSet<LessonProgress> LessonProgresses { get; set; }

    public virtual DbSet<MakeupRequest> MakeupRequests { get; set; }

    public virtual DbSet<MapCheckpoint> MapCheckpoints { get; set; }

    public virtual DbSet<Notification> Notifications { get; set; }

    public virtual DbSet<ParentProfile> ParentProfiles { get; set; }

    public virtual DbSet<ParentStudentLink> ParentStudentLinks { get; set; }

    public virtual DbSet<PasswordResetOtp> PasswordResetOtps { get; set; }

    public virtual DbSet<PortfolioItem> PortfolioItems { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<Room> Rooms { get; set; }

    public virtual DbSet<SimulationRun> SimulationRuns { get; set; }

    public virtual DbSet<SpotlightBroadcast> SpotlightBroadcasts { get; set; }

    public virtual DbSet<StudentBadge> StudentBadges { get; set; }

    public virtual DbSet<StudentProfile> StudentProfiles { get; set; }

    public virtual DbSet<Submission> Submissions { get; set; }

    public virtual DbSet<TeacherProfile> TeacherProfiles { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<UserSession> UserSessions { get; set; }

    public virtual DbSet<VwClassGradebook> VwClassGradebooks { get; set; }

    public virtual DbSet<VwStudentsNeedSupport> VwStudentsNeedSupports { get; set; }

    public virtual DbSet<WorkspaceDraft> WorkspaceDrafts { get; set; }

    public virtual DbSet<XpTransaction> XpTransactions { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured)
        {
            optionsBuilder.UseSqlServer("Server=VIETANHFATTY\\SQLEXPRESS;uid=sa;password=123456;database=Teky_Learning_Hub;Encrypt=True;TrustServerCertificate=True;");
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AchievementCard>(entity =>
        {
            entity.HasKey(e => e.CardId).HasName("PK__Achievem__55FECDAEAF1C0B55");

            entity.HasIndex(e => e.QrToken, "UQ__Achievem__517D24C5817FA76B").IsUnique();

            entity.Property(e => e.CardImageUrl).HasMaxLength(500);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.IsPublic).HasDefaultValue(true);
            entity.Property(e => e.QrToken).HasDefaultValueSql("(newid())");
            entity.Property(e => e.Title).HasMaxLength(200);

            entity.HasOne(d => d.ExportedByNavigation).WithMany(p => p.AchievementCards)
                .HasForeignKey(d => d.ExportedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Achieveme__Expor__251C81ED");

            entity.HasOne(d => d.Item).WithMany(p => p.AchievementCards)
                .HasForeignKey(d => d.ItemId)
                .HasConstraintName("FK__Achieveme__ItemI__22401542");

            entity.HasOne(d => d.Student).WithMany(p => p.AchievementCards)
                .HasForeignKey(d => d.StudentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Achieveme__Stude__214BF109");
        });

        modelBuilder.Entity<AdminProfile>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("PK__AdminPro__1788CC4C0B3B58EC");

            entity.HasIndex(e => e.StaffCode, "UQ__AdminPro__D83AD812285ED6B6").IsUnique();

            entity.Property(e => e.UserId).ValueGeneratedNever();
            entity.Property(e => e.PermissionLevel).HasDefaultValue((byte)1);
            entity.Property(e => e.Position).HasMaxLength(100);
            entity.Property(e => e.StaffCode).HasMaxLength(20);

            entity.HasOne(d => d.User).WithOne(p => p.AdminProfile)
                .HasForeignKey<AdminProfile>(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__AdminProf__UserI__59FA5E80");
        });

        modelBuilder.Entity<Assignment>(entity =>
        {
            entity.HasKey(e => e.AssignmentId).HasName("PK__Assignme__32499E77F696D49D");

            entity.HasIndex(e => new { e.Status, e.DueAt }, "IX_Assign_Due");

            entity.Property(e => e.AstWeight)
                .HasDefaultValue(70m)
                .HasColumnType("decimal(5, 2)");
            entity.Property(e => e.ClosedReason).HasMaxLength(15);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.HardwareWeight)
                .HasDefaultValue(30m)
                .HasColumnType("decimal(5, 2)");
            entity.Property(e => e.MaxScore)
                .HasDefaultValue(10m)
                .HasColumnType("decimal(5, 2)");
            entity.Property(e => e.MaxXp).HasDefaultValue(100);
            entity.Property(e => e.Status)
                .HasMaxLength(10)
                .HasDefaultValue("Draft");
            entity.Property(e => e.Title).HasMaxLength(200);

            entity.HasOne(d => d.Class).WithMany(p => p.Assignments)
                .HasForeignKey(d => d.ClassId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Assignmen__Class__3B40CD36");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.Assignments)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Assignmen__Creat__46B27FE2");

            entity.HasOne(d => d.Lesson).WithMany(p => p.Assignments)
                .HasForeignKey(d => d.LessonId)
                .HasConstraintName("FK__Assignmen__Lesso__3C34F16F");

            entity.HasOne(d => d.Map).WithMany(p => p.Assignments)
                .HasForeignKey(d => d.MapId)
                .HasConstraintName("FK__Assignmen__MapId__3D2915A8");
        });

        modelBuilder.Entity<AstDeviation>(entity =>
        {
            entity.HasKey(e => e.DeviationId).HasName("PK__AstDevia__757877A03C1119D9");

            entity.Property(e => e.ActualBlock).HasMaxLength(100);
            entity.Property(e => e.DeviationType).HasMaxLength(15);
            entity.Property(e => e.ExpectedBlock).HasMaxLength(100);
            entity.Property(e => e.HintText).HasMaxLength(500);
            entity.Property(e => e.NodePath).HasMaxLength(300);

            entity.HasOne(d => d.Evaluation).WithMany(p => p.AstDeviations)
                .HasForeignKey(d => d.EvaluationId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__AstDeviat__Evalu__625A9A57");
        });

        modelBuilder.Entity<AstEvaluation>(entity =>
        {
            entity.HasKey(e => e.EvaluationId).HasName("PK__AstEvalu__36AE68F316BFAA5A");

            entity.HasIndex(e => e.SubmissionId, "UQ__AstEvalu__449EE12476364707").IsUnique();

            entity.Property(e => e.AutoAstScore).HasColumnType("decimal(5, 2)");
            entity.Property(e => e.EngineVersion).HasMaxLength(20);
            entity.Property(e => e.EvaluatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.MatchPercent).HasColumnType("decimal(5, 2)");

            entity.HasOne(d => d.Submission).WithOne(p => p.AstEvaluation)
                .HasForeignKey<AstEvaluation>(d => d.SubmissionId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__AstEvalua__Submi__5E8A0973");
        });

        modelBuilder.Entity<AttendanceRecord>(entity =>
        {
            entity.HasKey(e => e.AttendanceId).HasName("PK__Attendan__8B69261C55F4FDE1");

            entity.HasIndex(e => new { e.SessionId, e.StudentId }, "UQ_Attendance").IsUnique();

            entity.Property(e => e.AbsenceReason).HasMaxLength(500);
            entity.Property(e => e.MarkedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Status)
                .HasMaxLength(10)
                .HasDefaultValue("Present");

            entity.HasOne(d => d.MarkedByNavigation).WithMany(p => p.AttendanceRecords)
                .HasForeignKey(d => d.MarkedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Attendanc__Marke__22751F6C");

            entity.HasOne(d => d.Session).WithMany(p => p.AttendanceRecords)
                .HasForeignKey(d => d.SessionId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Attendanc__Sessi__1EA48E88");

            entity.HasOne(d => d.Student).WithMany(p => p.AttendanceRecords)
                .HasForeignKey(d => d.StudentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Attendanc__Stude__1F98B2C1");
        });

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(e => e.AuditId).HasName("PK__AuditLog__A17F239825AA5C6D");

            entity.ToTable(tb => tb.HasTrigger("trg_AuditLogs_NoChange"));

            entity.HasIndex(e => new { e.EntityType, e.EntityId, e.CreatedAt }, "IX_Audit_Entity").IsDescending(false, false, true);

            entity.Property(e => e.Action).HasMaxLength(60);
            entity.Property(e => e.ActorType)
                .HasMaxLength(6)
                .HasDefaultValue("User");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.EntityId).HasMaxLength(40);
            entity.Property(e => e.EntityType).HasMaxLength(40);
            entity.Property(e => e.IpAddress).HasMaxLength(45);

            entity.HasOne(d => d.ActorUser).WithMany(p => p.AuditLogs)
                .HasForeignKey(d => d.ActorUserId)
                .HasConstraintName("FK__AuditLogs__Actor__3DE82FB7");
        });

        modelBuilder.Entity<Badge>(entity =>
        {
            entity.HasKey(e => e.BadgeId).HasName("PK__Badges__1918235C0046735F");

            entity.HasIndex(e => e.Code, "UQ__Badges__A25C5AA7730AFC55").IsUnique();

            entity.Property(e => e.Code).HasMaxLength(30);
            entity.Property(e => e.Description).HasMaxLength(300);
            entity.Property(e => e.IconUrl).HasMaxLength(500);
            entity.Property(e => e.Name).HasMaxLength(100);
        });

        modelBuilder.Entity<ChallengeMap>(entity =>
        {
            entity.HasKey(e => e.MapId).HasName("PK__Challeng__3265E21B36EC1C2E");

            entity.Property(e => e.Name).HasMaxLength(150);
            entity.Property(e => e.Status)
                .HasMaxLength(10)
                .HasDefaultValue("Active");
            entity.Property(e => e.Theme).HasMaxLength(50);

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.ChallengeMaps)
                .HasForeignKey(d => d.CreatedBy)
                .HasConstraintName("FK__Challenge__Creat__339FAB6E");
        });

        modelBuilder.Entity<CheerMessage>(entity =>
        {
            entity.HasKey(e => e.CheerId).HasName("PK__CheerMes__A6D30B8B036335C8");

            entity.Property(e => e.Message).HasMaxLength(500);
            entity.Property(e => e.SentAt).HasDefaultValueSql("(sysutcdatetime())");

            entity.HasOne(d => d.Parent).WithMany(p => p.CheerMessages)
                .HasForeignKey(d => d.ParentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__CheerMess__Paren__2CBDA3B5");

            entity.HasOne(d => d.Session).WithMany(p => p.CheerMessages)
                .HasForeignKey(d => d.SessionId)
                .HasConstraintName("FK__CheerMess__Sessi__2F9A1060");

            entity.HasOne(d => d.Sticker).WithMany(p => p.CheerMessages)
                .HasForeignKey(d => d.StickerId)
                .HasConstraintName("FK__CheerMess__Stick__2EA5EC27");

            entity.HasOne(d => d.Student).WithMany(p => p.CheerMessages)
                .HasForeignKey(d => d.StudentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__CheerMess__Stude__2DB1C7EE");
        });

        modelBuilder.Entity<CheerSticker>(entity =>
        {
            entity.HasKey(e => e.StickerId).HasName("PK__CheerSti__49D934899AC28D07");

            entity.HasIndex(e => e.Code, "UQ__CheerSti__A25C5AA759BF5714").IsUnique();

            entity.Property(e => e.Code).HasMaxLength(30);
            entity.Property(e => e.ImageUrl).HasMaxLength(500);
            entity.Property(e => e.Name).HasMaxLength(80);
        });

        modelBuilder.Entity<Class>(entity =>
        {
            entity.HasKey(e => e.ClassId).HasName("PK__Classes__CB1927C0A0F945A9");

            entity.HasIndex(e => e.ClassCode, "UQ__Classes__2ECD4A555A6DC1CC").IsUnique();

            entity.Property(e => e.ClassCode).HasMaxLength(30);
            entity.Property(e => e.MaxStudents).HasDefaultValue(20);
            entity.Property(e => e.Name).HasMaxLength(150);
            entity.Property(e => e.Status)
                .HasMaxLength(12)
                .HasDefaultValue("Planned");

            entity.HasOne(d => d.Course).WithMany(p => p.Classes)
                .HasForeignKey(d => d.CourseId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Classes__CourseI__7D439ABD");

            entity.HasOne(d => d.Teacher).WithMany(p => p.Classes)
                .HasForeignKey(d => d.TeacherId)
                .HasConstraintName("FK__Classes__Teacher__7E37BEF6");
        });

        modelBuilder.Entity<ClassSession>(entity =>
        {
            entity.HasKey(e => e.SessionId).HasName("PK__ClassSes__C9F4929026788E25");

            entity.HasIndex(e => new { e.SessionDate, e.ClassId }, "IX_Sessions_Date");

            entity.HasIndex(e => new { e.RoomId, e.SessionDate, e.StartTime }, "UX_Sessions_Room")
                .IsUnique()
                .HasFilter("([RoomId] IS NOT NULL AND [Status]<>N'Cancelled')");

            entity.Property(e => e.Status)
                .HasMaxLength(12)
                .HasDefaultValue("Scheduled");

            entity.HasOne(d => d.Class).WithMany(p => p.ClassSessions)
                .HasForeignKey(d => d.ClassId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__ClassSess__Class__03F0984C");

            entity.HasOne(d => d.Lesson).WithMany(p => p.ClassSessions)
                .HasForeignKey(d => d.LessonId)
                .HasConstraintName("FK__ClassSess__Lesso__04E4BC85");

            entity.HasOne(d => d.Room).WithMany(p => p.ClassSessions)
                .HasForeignKey(d => d.RoomId)
                .HasConstraintName("FK__ClassSess__RoomI__05D8E0BE");
        });

        modelBuilder.Entity<Course>(entity =>
        {
            entity.HasKey(e => e.CourseId).HasName("PK__Courses__C92D71A7DAE7634E");

            entity.HasIndex(e => e.CourseCode, "UQ__Courses__FC00E00074CC014F").IsUnique();

            entity.Property(e => e.CourseCode).HasMaxLength(20);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.LevelCode).HasMaxLength(30);
            entity.Property(e => e.Name).HasMaxLength(200);
            entity.Property(e => e.Status)
                .HasMaxLength(10)
                .HasDefaultValue("Active");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.Courses)
                .HasForeignKey(d => d.CreatedBy)
                .HasConstraintName("FK__Courses__Created__6B24EA82");
        });

        modelBuilder.Entity<Enrollment>(entity =>
        {
            entity.HasKey(e => e.EnrollmentId).HasName("PK__Enrollme__7F68771B3E648867");

            entity.HasIndex(e => new { e.ClassId, e.StudentId }, "UQ_Enroll").IsUnique();

            entity.Property(e => e.EnrolledAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.ProgressPercent).HasColumnType("decimal(5, 2)");
            entity.Property(e => e.Status)
                .HasMaxLength(12)
                .HasDefaultValue("Active");

            entity.HasOne(d => d.Class).WithMany(p => p.Enrollments)
                .HasForeignKey(d => d.ClassId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Enrollmen__Class__0B91BA14");

            entity.HasOne(d => d.Student).WithMany(p => p.Enrollments)
                .HasForeignKey(d => d.StudentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Enrollmen__Stude__0C85DE4D");

            entity.HasOne(d => d.TransferredFrom).WithMany(p => p.InverseTransferredFrom)
                .HasForeignKey(d => d.TransferredFromId)
                .HasConstraintName("FK__Enrollmen__Trans__10566F31");
        });

        modelBuilder.Entity<FocusModeSession>(entity =>
        {
            entity.HasKey(e => e.FocusId).HasName("PK__FocusMod__89132D3B974EAA8D");

            entity.Property(e => e.Message).HasMaxLength(300);
            entity.Property(e => e.StartedAt).HasDefaultValueSql("(sysutcdatetime())");

            entity.HasOne(d => d.Session).WithMany(p => p.FocusModeSessions)
                .HasForeignKey(d => d.SessionId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__FocusMode__Sessi__336AA144");

            entity.HasOne(d => d.Teacher).WithMany(p => p.FocusModeSessions)
                .HasForeignKey(d => d.TeacherId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__FocusMode__Teach__345EC57D");
        });

        modelBuilder.Entity<Grade>(entity =>
        {
            entity.HasKey(e => e.GradeId).HasName("PK__Grades__54F87A57CFEB6DB4");

            entity.HasIndex(e => e.SubmissionId, "UQ__Grades__449EE124AF25D9C6").IsUnique();

            entity.Property(e => e.AutoAstScore).HasColumnType("decimal(5, 2)");
            entity.Property(e => e.FinalScore).HasColumnType("decimal(5, 2)");
            entity.Property(e => e.HardwareScore).HasColumnType("decimal(5, 2)");
            entity.Property(e => e.RemarkSource).HasMaxLength(10);
            entity.Property(e => e.RemarkText).HasMaxLength(2000);

            entity.HasOne(d => d.FinalizedByNavigation).WithMany(p => p.Grades)
                .HasForeignKey(d => d.FinalizedBy)
                .HasConstraintName("FK__Grades__Finalize__72910220");

            entity.HasOne(d => d.Submission).WithOne(p => p.Grade)
                .HasForeignKey<Grade>(d => d.SubmissionId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Grades__Submissi__6FB49575");
        });

        modelBuilder.Entity<GradeHistory>(entity =>
        {
            entity.HasKey(e => e.HistoryId).HasName("PK__GradeHis__4D7B4ABDAFF0CFF0");

            entity.ToTable("GradeHistory");

            entity.Property(e => e.ChangedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.NewFinal).HasColumnType("decimal(5, 2)");
            entity.Property(e => e.OldFinal).HasColumnType("decimal(5, 2)");
            entity.Property(e => e.Reason).HasMaxLength(500);

            entity.HasOne(d => d.ChangedByNavigation).WithMany(p => p.GradeHistories)
                .HasForeignKey(d => d.ChangedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__GradeHist__Chang__7C1A6C5A");

            entity.HasOne(d => d.Grade).WithMany(p => p.GradeHistories)
                .HasForeignKey(d => d.GradeId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__GradeHist__Grade__7B264821");
        });

        modelBuilder.Entity<HardwareRubricCriterion>(entity =>
        {
            entity.HasKey(e => e.CriterionId).HasName("PK__Hardware__647C3BB1A300BDFC");

            entity.Property(e => e.MaxPoints).HasColumnType("decimal(5, 2)");
            entity.Property(e => e.Name).HasMaxLength(150);

            entity.HasOne(d => d.Assignment).WithMany(p => p.HardwareRubricCriteria)
                .HasForeignKey(d => d.AssignmentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__HardwareR__Assig__4B7734FF");
        });

        modelBuilder.Entity<HardwareScore>(entity =>
        {
            entity.HasKey(e => new { e.GradeId, e.CriterionId }).HasName("PK__Hardware__52BFB9EC92EA30B3");

            entity.Property(e => e.Points).HasColumnType("decimal(5, 2)");
            entity.Property(e => e.ScoredAt).HasDefaultValueSql("(sysutcdatetime())");

            entity.HasOne(d => d.Criterion).WithMany(p => p.HardwareScores)
                .HasForeignKey(d => d.CriterionId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__HardwareS__Crite__76619304");

            entity.HasOne(d => d.Grade).WithMany(p => p.HardwareScores)
                .HasForeignKey(d => d.GradeId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__HardwareS__Grade__756D6ECB");

            entity.HasOne(d => d.ScoredByNavigation).WithMany(p => p.HardwareScores)
                .HasForeignKey(d => d.ScoredBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__HardwareS__Score__7755B73D");
        });

        modelBuilder.Entity<LeaderboardCycle>(entity =>
        {
            entity.HasKey(e => e.CycleId).HasName("PK__Leaderbo__077B24F9DAC36D94");

            entity.Property(e => e.Status)
                .HasMaxLength(8)
                .HasDefaultValue("Active");
        });

        modelBuilder.Entity<LeaderboardEntry>(entity =>
        {
            entity.HasKey(e => e.EntryId).HasName("PK__Leaderbo__F57BD2F7E4427A44");

            entity.HasIndex(e => new { e.CycleId, e.MapId, e.StudentId }, "UQ_LB").IsUnique();

            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("(sysutcdatetime())");

            entity.HasOne(d => d.BestRun).WithMany(p => p.LeaderboardEntries)
                .HasForeignKey(d => d.BestRunId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Leaderboa__BestR__15DA3E5D");

            entity.HasOne(d => d.Cycle).WithMany(p => p.LeaderboardEntries)
                .HasForeignKey(d => d.CycleId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Leaderboa__Cycle__12FDD1B2");

            entity.HasOne(d => d.Map).WithMany(p => p.LeaderboardEntries)
                .HasForeignKey(d => d.MapId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Leaderboa__MapId__13F1F5EB");

            entity.HasOne(d => d.Student).WithMany(p => p.LeaderboardEntries)
                .HasForeignKey(d => d.StudentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Leaderboa__Stude__14E61A24");
        });

        modelBuilder.Entity<Lesson>(entity =>
        {
            entity.HasKey(e => e.LessonId).HasName("PK__Lessons__B084ACD0A8316914");

            entity.HasIndex(e => new { e.CourseId, e.OrderNo }, "IX_Lessons_Course");

            entity.Property(e => e.Title).HasMaxLength(200);

            entity.HasOne(d => d.Course).WithMany(p => p.Lessons)
                .HasForeignKey(d => d.CourseId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Lessons__CourseI__6EF57B66");
        });

        modelBuilder.Entity<LessonMaterial>(entity =>
        {
            entity.HasKey(e => e.MaterialId).HasName("PK__LessonMa__C50610F7E1616EE3");

            entity.Property(e => e.FileUrl).HasMaxLength(500);
            entity.Property(e => e.IsDownloadable).HasDefaultValue(true);
            entity.Property(e => e.MaterialType).HasMaxLength(15);
            entity.Property(e => e.Title).HasMaxLength(200);

            entity.HasOne(d => d.Lesson).WithMany(p => p.LessonMaterials)
                .HasForeignKey(d => d.LessonId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__LessonMat__Lesso__72C60C4A");
        });

        modelBuilder.Entity<LessonProgress>(entity =>
        {
            entity.HasKey(e => new { e.StudentId, e.LessonId }).HasName("PK__LessonPr__29CD615449B9BAC3");

            entity.ToTable("LessonProgress");

            entity.Property(e => e.ViewedAt).HasDefaultValueSql("(sysutcdatetime())");

            entity.HasOne(d => d.Lesson).WithMany(p => p.LessonProgresses)
                .HasForeignKey(d => d.LessonId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__LessonPro__Lesso__151B244E");

            entity.HasOne(d => d.Student).WithMany(p => p.LessonProgresses)
                .HasForeignKey(d => d.StudentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__LessonPro__Stude__14270015");
        });

        modelBuilder.Entity<MakeupRequest>(entity =>
        {
            entity.HasKey(e => e.MakeupId).HasName("PK__MakeupRe__B031B24A92C3A247");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Reason).HasMaxLength(500);
            entity.Property(e => e.Status)
                .HasMaxLength(10)
                .HasDefaultValue("Pending");

            entity.HasOne(d => d.Attendance).WithMany(p => p.MakeupRequests)
                .HasForeignKey(d => d.AttendanceId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__MakeupReq__Atten__2645B050");

            entity.HasOne(d => d.PreferredSession).WithMany(p => p.MakeupRequests)
                .HasForeignKey(d => d.PreferredSessionId)
                .HasConstraintName("FK__MakeupReq__Prefe__29221CFB");

            entity.HasOne(d => d.ProcessedByNavigation).WithMany(p => p.MakeupRequestProcessedByNavigations)
                .HasForeignKey(d => d.ProcessedBy)
                .HasConstraintName("FK__MakeupReq__Proce__2BFE89A6");

            entity.HasOne(d => d.RequestedByNavigation).WithMany(p => p.MakeupRequestRequestedByNavigations)
                .HasForeignKey(d => d.RequestedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__MakeupReq__Reque__2739D489");

            entity.HasOne(d => d.SuggestedLesson).WithMany(p => p.MakeupRequests)
                .HasForeignKey(d => d.SuggestedLessonId)
                .HasConstraintName("FK__MakeupReq__Sugge__282DF8C2");
        });

        modelBuilder.Entity<MapCheckpoint>(entity =>
        {
            entity.HasKey(e => e.CheckpointId).HasName("PK__MapCheck__6C00DFE218FF95A8");

            entity.HasIndex(e => new { e.MapId, e.SeqNo }, "UQ_Checkpoint").IsUnique();

            entity.Property(e => e.UnlockMessage).HasMaxLength(500);

            entity.HasOne(d => d.Map).WithMany(p => p.MapCheckpoints)
                .HasForeignKey(d => d.MapId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__MapCheckp__MapId__37703C52");
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.NotificationId).HasName("PK__Notifica__20CF2E125F2D036B");

            entity.HasIndex(e => new { e.RecipientId, e.IsRead, e.CreatedAt }, "IX_Notif_User").IsDescending(false, false, true);

            entity.Property(e => e.Body).HasMaxLength(1000);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.RefType).HasMaxLength(30);
            entity.Property(e => e.Title).HasMaxLength(200);
            entity.Property(e => e.Type).HasMaxLength(30);

            entity.HasOne(d => d.Recipient).WithMany(p => p.Notifications)
                .HasForeignKey(d => d.RecipientId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Notificat__Recip__18EBB532");
        });

        modelBuilder.Entity<ParentProfile>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("PK__ParentPr__1788CC4C62FA658A");

            entity.Property(e => e.UserId).ValueGeneratedNever();
            entity.Property(e => e.Occupation).HasMaxLength(100);

            entity.HasOne(d => d.User).WithOne(p => p.ParentProfile)
                .HasForeignKey<ParentProfile>(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__ParentPro__UserI__5DCAEF64");
        });

        modelBuilder.Entity<ParentStudentLink>(entity =>
        {
            entity.HasKey(e => e.LinkId).HasName("PK__ParentSt__2D1221352342C693");

            entity.HasIndex(e => new { e.ParentId, e.StudentId }, "UQ_ParentStudent").IsUnique();

            entity.Property(e => e.LinkedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Relationship).HasMaxLength(30);
            entity.Property(e => e.Status)
                .HasMaxLength(10)
                .HasDefaultValue("Active");

            entity.HasOne(d => d.Parent).WithMany(p => p.ParentStudentLinks)
                .HasForeignKey(d => d.ParentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__ParentStu__Paren__619B8048");

            entity.HasOne(d => d.Student).WithMany(p => p.ParentStudentLinks)
                .HasForeignKey(d => d.StudentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__ParentStu__Stude__628FA481");
        });

        modelBuilder.Entity<PasswordResetOtp>(entity =>
        {
            entity.HasKey(e => e.OtpId).HasName("PK__Password__3143C4A37C64B786");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.OtpHash).HasMaxLength(255);

            entity.HasOne(d => d.User).WithMany(p => p.PasswordResetOtps)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__PasswordR__UserI__49C3F6B7");
        });

        modelBuilder.Entity<PortfolioItem>(entity =>
        {
            entity.HasKey(e => e.ItemId).HasName("PK__Portfoli__727E838B24381FBA");

            entity.HasIndex(e => e.SubmissionId, "UQ__Portfoli__449EE12473E92A88").IsUnique();

            entity.Property(e => e.CompletedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.FinalScore).HasColumnType("decimal(5, 2)");
            entity.Property(e => e.Summary).HasMaxLength(1000);
            entity.Property(e => e.ThumbnailUrl).HasMaxLength(500);
            entity.Property(e => e.Title).HasMaxLength(200);

            entity.HasOne(d => d.Student).WithMany(p => p.PortfolioItems)
                .HasForeignKey(d => d.StudentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Portfolio__Stude__1B9317B3");

            entity.HasOne(d => d.Submission).WithOne(p => p.PortfolioItem)
                .HasForeignKey<PortfolioItem>(d => d.SubmissionId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Portfolio__Submi__1C873BEC");
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(e => e.RoleId).HasName("PK__Roles__8AFACE1A73835405");

            entity.HasIndex(e => e.RoleName, "UQ__Roles__8A2B6160F797A0A3").IsUnique();

            entity.Property(e => e.RoleName).HasMaxLength(20);
        });

        modelBuilder.Entity<Room>(entity =>
        {
            entity.HasKey(e => e.RoomId).HasName("PK__Rooms__32863939D02596E7");

            entity.HasIndex(e => e.RoomName, "UQ__Rooms__6B500B556BF3D21D").IsUnique();

            entity.Property(e => e.RoomName).HasMaxLength(50);
            entity.Property(e => e.Status)
                .HasMaxLength(10)
                .HasDefaultValue("Active");
        });

        modelBuilder.Entity<SimulationRun>(entity =>
        {
            entity.HasKey(e => e.RunId).HasName("PK__Simulati__A259D4DD5A4F020C");

            entity.HasIndex(e => new { e.MapId, e.ReachedFinish, e.ExecTimeMs, e.BlockCount }, "IX_Run_Best");

            entity.Property(e => e.RunAt).HasDefaultValueSql("(sysutcdatetime())");

            entity.HasOne(d => d.Assignment).WithMany(p => p.SimulationRuns)
                .HasForeignKey(d => d.AssignmentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Simulatio__Assig__662B2B3B");

            entity.HasOne(d => d.Map).WithMany(p => p.SimulationRuns)
                .HasForeignKey(d => d.MapId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Simulatio__MapId__690797E6");

            entity.HasOne(d => d.Student).WithMany(p => p.SimulationRuns)
                .HasForeignKey(d => d.StudentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Simulatio__Stude__671F4F74");

            entity.HasOne(d => d.Submission).WithMany(p => p.SimulationRuns)
                .HasForeignKey(d => d.SubmissionId)
                .HasConstraintName("FK__Simulatio__Submi__681373AD");
        });

        modelBuilder.Entity<SpotlightBroadcast>(entity =>
        {
            entity.HasKey(e => e.BroadcastId).HasName("PK__Spotligh__94A16DC076F0D1F2");

            entity.Property(e => e.StartedAt).HasDefaultValueSql("(sysutcdatetime())");

            entity.HasOne(d => d.Session).WithMany(p => p.SpotlightBroadcasts)
                .HasForeignKey(d => d.SessionId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Spotlight__Sessi__382F5661");

            entity.HasOne(d => d.Submission).WithMany(p => p.SpotlightBroadcasts)
                .HasForeignKey(d => d.SubmissionId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Spotlight__Submi__39237A9A");

            entity.HasOne(d => d.Teacher).WithMany(p => p.SpotlightBroadcasts)
                .HasForeignKey(d => d.TeacherId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Spotlight__Teach__3A179ED3");
        });

        modelBuilder.Entity<StudentBadge>(entity =>
        {
            entity.HasKey(e => new { e.StudentId, e.BadgeId }).HasName("PK__StudentB__E354A9AC52832F65");

            entity.Property(e => e.AwardedAt).HasDefaultValueSql("(sysutcdatetime())");

            entity.HasOne(d => d.Badge).WithMany(p => p.StudentBadges)
                .HasForeignKey(d => d.BadgeId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__StudentBa__Badge__0A688BB1");

            entity.HasOne(d => d.Student).WithMany(p => p.StudentBadges)
                .HasForeignKey(d => d.StudentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__StudentBa__Stude__09746778");
        });

        modelBuilder.Entity<StudentProfile>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("PK__StudentP__1788CC4C2362F6A1");

            entity.HasIndex(e => e.StudentCode, "UQ__StudentP__1FC8860461031148").IsUnique();

            entity.Property(e => e.UserId).ValueGeneratedNever();
            entity.Property(e => e.Gender).HasMaxLength(10);
            entity.Property(e => e.GradeLevel).HasMaxLength(20);
            entity.Property(e => e.SchoolName).HasMaxLength(150);
            entity.Property(e => e.Status)
                .HasMaxLength(15)
                .HasDefaultValue("Active");
            entity.Property(e => e.StudentCode).HasMaxLength(20);

            entity.HasOne(d => d.User).WithOne(p => p.StudentProfile)
                .HasForeignKey<StudentProfile>(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__StudentPr__UserI__4F7CD00D");
        });

        modelBuilder.Entity<Submission>(entity =>
        {
            entity.HasKey(e => e.SubmissionId).HasName("PK__Submissi__449EE125566CD3EB");

            entity.HasIndex(e => new { e.StudentId, e.AssignmentId, e.IsCurrent }, "IX_Sub_Student");

            entity.HasIndex(e => new { e.AssignmentId, e.StudentId, e.AttemptNo }, "UQ_Attempt").IsUnique();

            entity.HasIndex(e => new { e.AssignmentId, e.StudentId }, "UX_Sub_Current")
                .IsUnique()
                .HasFilter("([IsCurrent]=(1))");

            entity.Property(e => e.IsCurrent).HasDefaultValue(true);
            entity.Property(e => e.Status)
                .HasMaxLength(10)
                .HasDefaultValue("Pending");
            entity.Property(e => e.SubmittedAt).HasDefaultValueSql("(sysutcdatetime())");

            entity.HasOne(d => d.Assignment).WithMany(p => p.Submissions)
                .HasForeignKey(d => d.AssignmentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Submissio__Assig__55F4C372");

            entity.HasOne(d => d.Student).WithMany(p => p.Submissions)
                .HasForeignKey(d => d.StudentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Submissio__Stude__56E8E7AB");
        });

        modelBuilder.Entity<TeacherProfile>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("PK__TeacherP__1788CC4CD30EFCD7");

            entity.HasIndex(e => e.TeacherCode, "UQ__TeacherP__9B8A194EEF3C2351").IsUnique();

            entity.Property(e => e.UserId).ValueGeneratedNever();
            entity.Property(e => e.Bio).HasMaxLength(1000);
            entity.Property(e => e.Specialty).HasMaxLength(150);
            entity.Property(e => e.TeacherCode).HasMaxLength(20);

            entity.HasOne(d => d.User).WithOne(p => p.TeacherProfile)
                .HasForeignKey<TeacherProfile>(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__TeacherPr__UserI__5629CD9C");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("PK__Users__1788CC4CDE8C7348");

            entity.HasIndex(e => e.Email, "UQ__Users__A9D10534F8728F3A").IsUnique();

            entity.Property(e => e.Address).HasMaxLength(255);
            entity.Property(e => e.AvatarUrl).HasMaxLength(500);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Email).HasMaxLength(150);
            entity.Property(e => e.FullName).HasMaxLength(120);
            entity.Property(e => e.PasswordHash).HasMaxLength(255);
            entity.Property(e => e.Phone).HasMaxLength(20);
            entity.Property(e => e.Status)
                .HasMaxLength(10)
                .HasDefaultValue("Active");
            entity.Property(e => e.ThemeMode)
                .HasMaxLength(5)
                .HasDefaultValue("Light");

            entity.HasOne(d => d.Role).WithMany(p => p.Users)
                .HasForeignKey(d => d.RoleId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Users__RoleId__3B75D760");
        });

        modelBuilder.Entity<UserSession>(entity =>
        {
            entity.HasKey(e => e.SessionId).HasName("PK__UserSess__C9F49290BD778D59");

            entity.HasIndex(e => new { e.UserId, e.LoginAt }, "IX_UserSessions_User").IsDescending(false, true);

            entity.Property(e => e.IpAddress).HasMaxLength(45);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.LoginAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.TokenHash).HasMaxLength(255);
            entity.Property(e => e.UserAgent).HasMaxLength(300);

            entity.HasOne(d => d.User).WithMany(p => p.UserSessions)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__UserSessi__UserI__44FF419A");
        });

        modelBuilder.Entity<VwClassGradebook>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("vw_ClassGradebook");

            entity.Property(e => e.AutoAstScore).HasColumnType("decimal(5, 2)");
            entity.Property(e => e.FinalScore).HasColumnType("decimal(5, 2)");
            entity.Property(e => e.FullName).HasMaxLength(120);
            entity.Property(e => e.HardwareScore).HasColumnType("decimal(5, 2)");
            entity.Property(e => e.RemarkText).HasMaxLength(2000);
            entity.Property(e => e.Title).HasMaxLength(200);
        });

        modelBuilder.Entity<VwStudentsNeedSupport>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("vw_StudentsNeedSupport");

            entity.Property(e => e.AttendanceRate).HasColumnType("decimal(20, 13)");
            entity.Property(e => e.AvgScore).HasColumnType("decimal(38, 6)");
            entity.Property(e => e.FullName).HasMaxLength(120);
        });

        modelBuilder.Entity<WorkspaceDraft>(entity =>
        {
            entity.HasKey(e => e.DraftId).HasName("PK__Workspac__3E93D65BA4B40CF8");

            entity.HasIndex(e => new { e.AssignmentId, e.StudentId }, "UQ_Draft").IsUnique();

            entity.Property(e => e.SavedAt).HasDefaultValueSql("(sysutcdatetime())");

            entity.HasOne(d => d.Assignment).WithMany(p => p.WorkspaceDrafts)
                .HasForeignKey(d => d.AssignmentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Workspace__Assig__503BEA1C");

            entity.HasOne(d => d.Student).WithMany(p => p.WorkspaceDrafts)
                .HasForeignKey(d => d.StudentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Workspace__Stude__51300E55");
        });

        modelBuilder.Entity<XpTransaction>(entity =>
        {
            entity.HasKey(e => e.XpId).HasName("PK__XpTransa__8D14FF9C008FA805");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Description).HasMaxLength(300);
            entity.Property(e => e.PointType).HasMaxLength(5);
            entity.Property(e => e.Source).HasMaxLength(30);

            entity.HasOne(d => d.Run).WithMany(p => p.XpTransactions)
                .HasForeignKey(d => d.RunId)
                .HasConstraintName("FK__XpTransac__RunId__02C769E9");

            entity.HasOne(d => d.Student).WithMany(p => p.XpTransactions)
                .HasForeignKey(d => d.StudentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__XpTransac__Stude__7FEAFD3E");

            entity.HasOne(d => d.Submission).WithMany(p => p.XpTransactions)
                .HasForeignKey(d => d.SubmissionId)
                .HasConstraintName("FK__XpTransac__Submi__01D345B0");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
