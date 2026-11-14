using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.DTOs;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Application.Services;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Infrastructure.Data;
using Xunit;

namespace TekyLearningHub.Application.Tests;

public class TeacherAndParentServiceTests
{
    private sealed class FakeRealtimeService : IClassroomRealtimeService
    {
        public int FocusCallCount { get; private set; }
        public int SpotlightCallCount { get; private set; }
        public int CheckInCallCount { get; private set; }
        public int CheerCallCount { get; private set; }
        public string? LastStickerCode { get; private set; }

        public Task BroadcastFocusModeLockAsync(int classId, bool isLocked, string? message, CancellationToken cancellationToken = default)
        {
            FocusCallCount++;
            return Task.CompletedTask;
        }

        public Task BroadcastSpotlightAsync(int classId, int studentId, string studentName, string screenPayload, CancellationToken cancellationToken = default)
        {
            SpotlightCallCount++;
            return Task.CompletedTask;
        }

        public Task NotifyWorkstationCheckInAsync(int classId, int studentId, string studentName, string workstationIp, CancellationToken cancellationToken = default)
        {
            CheckInCallCount++;
            return Task.CompletedTask;
        }

        public Task SendCheerConfettiAsync(int classId, int studentId, string stickerCode, string message, CancellationToken cancellationToken = default)
        {
            CheerCallCount++;
            LastStickerCode = stickerCode;
            return Task.CompletedTask;
        }
    }

    private sealed class FakeNotificationService : INotificationService
    {
        public List<(int RecipientId, string Type, string Title)> Sent { get; } = new();

        public Task SendNotificationAsync(int recipientUserId, string type, string title, string body, string? refType = null, long? refId = null, CancellationToken cancellationToken = default)
        {
            Sent.Add((recipientUserId, type, title));
            return Task.CompletedTask;
        }
    }

    private static ApplicationDbContext CreateSeededContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"TekyTestDb_{Guid.NewGuid():N}")
            .Options;

        var ctx = new ApplicationDbContext(options);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var teacherUser = new User { UserId = 1, Email = "gv@teky.edu.vn", PasswordHash = "hash", FullName = "Thầy Nguyễn Văn Nam", Status = "Active", ThemeMode = "Light", RoleId = 2 };
        var studentUser = new User { UserId = 2, Email = "hs@teky.edu.vn", PasswordHash = "hash", FullName = "Lê Bảo An", Status = "Active", ThemeMode = "Light", RoleId = 3 };
        var parentUser = new User { UserId = 5, Email = "ph@teky.edu.vn", PasswordHash = "hash", FullName = "Chị Nguyễn Thị Lan", Status = "Active", ThemeMode = "Light", RoleId = 4 };

        var teacher = new TeacherProfile { UserId = 1, User = teacherUser, TeacherCode = "TEKY-TEA-001", Bio = "Master Robotics" };
        var student = new StudentProfile { UserId = 2, User = studentUser, StudentCode = "TEKY-STU-001", TotalXp = 100, StemPoints = 50, Status = "Active" };
        var parent = new ParentProfile { UserId = 5, User = parentUser, Occupation = "Kỹ sư" };

        var room = new Room { RoomId = 1, RoomName = "Lab Robotics 202", Capacity = 16, Status = "Active" };
        var course = new Course { CourseId = 1, CourseCode = "ROBO-K10", Name = "STEM Robot Sáng Tạo", LevelCode = "L1", Status = "Active" };
        var cls = new Class { ClassId = 3, CourseId = 1, Course = course, ClassCode = "ROBOT-K10-A", Name = "Lớp STEM Robot K10-A", TeacherId = 1, Teacher = teacher, Status = "Open" };
        var session = new ClassSession { SessionId = 6, ClassId = 3, Class = cls, RoomId = 1, Room = room, SessionDate = today, StartTime = new TimeOnly(8, 0), EndTime = new TimeOnly(10, 0), Status = "Scheduled" };
        var enrollment = new Enrollment { EnrollmentId = 1, ClassId = 3, Class = cls, StudentId = 2, Student = student, Status = "Active", ProgressPercent = 50m };
        var link = new ParentStudentLink { LinkId = 1, ParentId = 5, Parent = parent, StudentId = 2, Student = student, Relationship = "Mẹ", Status = "Active" };

        var map = new ChallengeMap { MapId = 3, Name = "Mê cung Rừng Nhiệt Đới", Theme = "Jungle", LayoutJson = "{}", Status = "Active", CreatedBy = 1 };
        var ast = new AstAnalysisService();
        var masterXml = @"<xml><block type=""robot_start""><next><block type=""robot_move""><field name=""STEPS"">3</field></block></next></block></xml>";
        var masterAstJson = ast.SerializeAstToJson(ast.ParseBlocklyXmlToAst(masterXml));

        var assignment = new Assignment
        {
            AssignmentId = 3,
            ClassId = 3,
            Class = cls,
            MapId = 3,
            Map = map,
            Title = "Thử thách vượt mê cung",
            Status = "Published",
            MasterAstJson = masterAstJson
        };

        var submission = new Submission
        {
            SubmissionId = 10,
            AssignmentId = 3,
            Assignment = assignment,
            StudentId = 2,
            Student = student,
            AttemptNo = 1,
            BlocklyJson = "{\"blocks\":[{\"type\":\"robot_start\"},{\"type\":\"robot_move\",\"steps\":3}]}",
            AstJson = masterAstJson,
            Status = "Pending",
            IsCurrent = true,
            SubmittedAt = DateTime.UtcNow
        };

        var sticker = new CheerSticker { StickerId = 2, Code = "SUPER_CODER", Name = "Siêu lập trình viên", ImageUrl = "/stickers/super.svg" };

        ctx.Users.AddRange(teacherUser, studentUser, parentUser);
        ctx.TeacherProfiles.Add(teacher);
        ctx.StudentProfiles.Add(student);
        ctx.ParentProfiles.Add(parent);
        ctx.Rooms.Add(room);
        ctx.Courses.Add(course);
        ctx.Classes.Add(cls);
        ctx.ClassSessions.Add(session);
        ctx.Enrollments.Add(enrollment);
        ctx.ParentStudentLinks.Add(link);
        ctx.ChallengeMaps.Add(map);
        ctx.Assignments.Add(assignment);
        ctx.Submissions.Add(submission);
        ctx.CheerStickers.Add(sticker);
        ctx.SaveChanges();

        return ctx;
    }

    [Fact]
    public async Task GradeSubmissionAsync_ComputesHybridScore_NormalizesRemarkSource_AndCreatesQrPortfolio()
    {
        using var ctx = CreateSeededContext();
        var realtime = new FakeRealtimeService();
        var notify = new FakeNotificationService();
        var service = new TeacherService(ctx, new AstAnalysisService(), realtime, notify);

        var result = await service.GradeSubmissionAsync(new GradeSubmissionRequest
        {
            SubmissionId = 10,
            AssemblyScore = 9.0m,
            AlgorithmExplainScore = 9.0m,
            TeamworkScore = 9.0m,
            RemarkText = "Con lắp ráp rất chắc chắn và giải thích lưu đồ rõ ràng.",
            RemarkSource = "Voice"
        }, teacherId: 1);

        // AST = 10.0 (khớp 100%), Hardware = 9.0 => Final = 10*0.6 + 9*0.4 = 9.6
        Assert.Equal(10.0m, result.AutoAstScore);
        Assert.Equal(9.0m, result.HardwareScore);
        Assert.Equal(9.6m, result.FinalScore);
        Assert.Equal("Finalized", result.Status);

        var savedGrade = await ctx.Grades.SingleAsync(g => g.SubmissionId == 10);
        Assert.Equal("Voice", savedGrade.RemarkSource);

        // Tự động sinh Portfolio & QR Token khi điểm >= 8.0
        var portfolio = await ctx.PortfolioItems.Include(p => p.AchievementCards).SingleOrDefaultAsync(p => p.SubmissionId == 10);
        Assert.NotNull(portfolio);
        Assert.NotEmpty(portfolio!.AchievementCards);
        Assert.NotEqual(Guid.Empty, portfolio.AchievementCards.First().QrToken);
        Assert.Single(notify.Sent);
    }

    [Fact]
    public async Task SyncWorkstationCheckInAsync_MarksAttendancePresent_AndBroadcastsRealtime()
    {
        using var ctx = CreateSeededContext();
        var realtime = new FakeRealtimeService();
        var notify = new FakeNotificationService();
        var service = new TeacherService(ctx, new AstAnalysisService(), realtime, notify);

        var ok = await service.SyncWorkstationCheckInAsync(sessionId: 6, studentId: 2, workstationIp: "192.168.1.108");
        Assert.True(ok);
        Assert.Equal(1, realtime.CheckInCallCount);

        var attendance = await ctx.AttendanceRecords.SingleAsync(a => a.SessionId == 6 && a.StudentId == 2);
        Assert.Equal("Present", attendance.Status);
        Assert.Contains("192.168.1.108", attendance.AbsenceReason);
    }

    [Fact]
    public async Task ParentFlow_SendCheer_ResolvesStickerCode_AndVerifyQrPortfolio_IncrementsViewCount()
    {
        using var ctx = CreateSeededContext();
        var realtime = new FakeRealtimeService();
        var notify = new FakeNotificationService();
        var teacherService = new TeacherService(ctx, new AstAnalysisService(), realtime, notify);
        var parentService = new ParentService(ctx, realtime);

        await teacherService.GradeSubmissionAsync(new GradeSubmissionRequest
        {
            SubmissionId = 10,
            AssemblyScore = 9.5m,
            AlgorithmExplainScore = 9.0m,
            TeamworkScore = 8.5m,
            RemarkText = "Bài làm xuất sắc!",
            RemarkSource = "Text" // phải tự chuẩn hóa về 'Typed'
        }, teacherId: 1);

        var savedGrade = await ctx.Grades.SingleAsync(g => g.SubmissionId == 10);
        Assert.Equal("Typed", savedGrade.RemarkSource);

        var cheered = await parentService.SendCheerMessageAsync(new SendCheerMessageRequest
        {
            ParentId = 5,
            StudentId = 2,
            StickerId = 2,
            SessionId = 6,
            Message = "Bố mẹ rất tự hào về con!"
        });
        Assert.True(cheered);
        Assert.Equal("SUPER_CODER", realtime.LastStickerCode);

        var portfolios = await parentService.GetStudentPortfoliosAsync(studentId: 2);
        Assert.Single(portfolios);
        var qrToken = portfolios[0].QrToken;

        var verified = await parentService.GetPublicPortfolioByQrTokenAsync(qrToken);
        Assert.Contains("Thử thách vượt mê cung", verified.Title);
        Assert.True(verified.ViewCount >= 2);
    }
}
