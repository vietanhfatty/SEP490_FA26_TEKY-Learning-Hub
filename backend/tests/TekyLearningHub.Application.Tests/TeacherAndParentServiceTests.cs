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
using TekyLearningHub.Infrastructure.Services;
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
        var studentUser = new User { UserId = 2, Email = "hs@teky.edu.vn", PasswordHash = "hash", FullName = "Lê Bảo An", Status = "Active", ThemeMode = "Light", RoleId = 1 };
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

        var absentAtt = new AttendanceRecord
        {
            AttendanceId = 100,
            SessionId = 6,
            Session = session,
            StudentId = 2,
            Student = student,
            Status = "Absent",
            AbsenceReason = "Xin phép nghỉ ốm",
            MarkedBy = 1,
            MarkedAt = DateTime.UtcNow.AddDays(-1)
        };

        var makeup = new MakeupRequest
        {
            MakeupId = 1,
            AttendanceId = 100,
            Attendance = absentAtt,
            RequestedBy = 5,
            PreferredSessionId = 6,
            PreferredSession = session,
            Reason = "Xin học bù buổi cảm biến",
            Status = "Pending",
            CreatedAt = DateTime.UtcNow
        };

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

        var cycle = new LeaderboardCycle { CycleId = 1, WeekStart = today.AddDays(-3), WeekEnd = today.AddDays(4), Status = "Active" };
        var lbEntry = new LeaderboardEntry { EntryId = 1, CycleId = 1, Cycle = cycle, MapId = 3, Map = map, StudentId = 2, Student = student, BestRunId = 1, RankNo = 1, XpEarned = 280, BestTimeMs = 1420, BestBlockCount = 7, UpdatedAt = DateTime.UtcNow };

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
        ctx.AttendanceRecords.Add(absentAtt);
        ctx.MakeupRequests.Add(makeup);
        ctx.ChallengeMaps.Add(map);
        ctx.Assignments.Add(assignment);
        ctx.Submissions.Add(submission);
        ctx.CheerStickers.Add(sticker);
        ctx.LeaderboardCycles.Add(cycle);
        ctx.LeaderboardEntries.Add(lbEntry);
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

        Assert.Equal(10.0m, result.AutoAstScore);
        Assert.Equal(9.0m, result.HardwareScore);
        Assert.Equal(9.6m, result.FinalScore);
        Assert.Equal("Finalized", result.Status);

        var savedGrade = await ctx.Grades.SingleAsync(g => g.SubmissionId == 10);
        Assert.Equal("Voice", savedGrade.RemarkSource);

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
            RemarkSource = "Text"
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

    [Fact]
    public async Task TeacherWorkspace_Classes_Attendance_Makeup_Map_Queue_And_Analytics_WorkEndToEnd()
    {
        using var ctx = CreateSeededContext();
        var realtime = new FakeRealtimeService();
        var notify = new FakeNotificationService();
        var service = new TeacherService(ctx, new AstAnalysisService(), realtime, notify);

        // 1. GetTeacherWorkspaceAsync & GetTeacherClassesAsync
        var workspace = await service.GetTeacherWorkspaceAsync(teacherId: 1);
        Assert.Equal(1, workspace.ActiveClassesCount);
        Assert.NotEmpty(workspace.WeeklySchedule);

        var classes = await service.GetTeacherClassesAsync(teacherId: 1);
        Assert.Single(classes);
        Assert.Equal("ROBOT-K10-A", classes[0].ClassCode);

        // 2. GetSessionAttendanceAsync & UpdateSessionAttendanceAsync
        var attSession = await service.GetSessionAttendanceAsync(sessionId: 6);
        Assert.Single(attSession.Students);
        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.GetSessionAttendanceAsync(sessionId: 9999));

        var updatedAtt = await service.UpdateSessionAttendanceAsync(new UpdateClassAttendanceRequest
        {
            SessionId = 6,
            AttendanceList = new List<UpdateAttendanceItemRequest>
            {
                new() { StudentId = 2, Status = "Late", Reason = "Đi muộn 5 phút" }
            }
        }, teacherId: 1);
        Assert.True(updatedAtt);

        // 3. GetMakeupRequestsAsync & ReviewMakeupRequestAsync
        var makeups = await service.GetMakeupRequestsAsync(teacherId: 1);
        Assert.Single(makeups);
        var reviewed = await service.ReviewMakeupRequestAsync(new ReviewMakeupRequestDto
        {
            MakeupId = 1,
            IsApproved = true
        }, teacherId: 1);
        Assert.True(reviewed);

        // 4. CreateStemMapAsync
        var mapId = await service.CreateStemMapAsync(new CreateStemMapRequest
        {
            Name = "Sa bàn Sao Hỏa",
            Theme = "MarsRover",
            LayoutJson = "{\"gridSize\":10}",
            StartX = 1,
            StartY = 1,
            Checkpoints = new List<CreateMapCheckpointDto>
            {
                new() { SeqNo = 1, X = 5, Y = 5, UnlockMessage = "Trạm 1", IsFinish = true }
            }
        }, teacherId: 1);
        Assert.True(mapId > 0);

        // 5. GetGradingQueueAsync & GetClassPerformanceAnalyticsAsync
        var queue = await service.GetGradingQueueAsync(teacherId: 1, classId: 3);
        Assert.Single(queue);

        await service.GradeSubmissionAsync(new GradeSubmissionRequest
        {
            SubmissionId = 10,
            AssemblyScore = 9.0m,
            AlgorithmExplainScore = 8.5m,
            TeamworkScore = 9.5m,
            RemarkText = "Tốt",
            RemarkSource = "Typed"
        }, teacherId: 1);

        var analytics = await service.GetClassPerformanceAnalyticsAsync(classId: 3);
        Assert.Equal(1, analytics.TotalStudents);
        Assert.True(analytics.AverageScore >= 9.0m);

        // 6. ExportClassGradebookAsync
        var excelService = new ExcelExportService(ctx);
        var excelBytes = await excelService.ExportClassGradebookAsync(classId: 3);
        Assert.NotEmpty(excelBytes);
    }

    [Fact]
    public async Task ParentHub_Dashboard_ContactBook_Feedback_Stickers_Leaderboard_And_AiDigest_WorkEndToEnd()
    {
        using var ctx = CreateSeededContext();
        var realtime = new FakeRealtimeService();
        var parentService = new ParentService(ctx, realtime);
        var aiService = new AiAssistantService(ctx);

        // 1. GetParentDashboardAsync
        var dash = await parentService.GetParentDashboardAsync(parentId: 5);
        Assert.Single(dash.Children);
        Assert.Equal("Lê Bảo An", dash.Children[0].FullName);

        // 2. GetChildContactBookHistoryAsync (Authorized vs Unauthorized)
        var contactBook = await parentService.GetChildContactBookHistoryAsync(studentId: 2, parentId: 5);
        Assert.NotEmpty(contactBook);
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            parentService.GetChildContactBookHistoryAsync(studentId: 2, parentId: 999));

        // 3. SubmitParentFeedbackAsync
        var feedbackOk = await parentService.SubmitParentFeedbackAsync(new SubmitParentFeedbackRequest
        {
            StudentId = 2,
            SessionId = 6,
            StarRating = 5,
            FeedbackNote = "Rất hài lòng!"
        }, parentId: 5);
        Assert.True(feedbackOk);

        // 4. GetCheerStickersAsync & GetClassLeaderboardAsync
        var stickers = await parentService.GetCheerStickersAsync();
        Assert.NotEmpty(stickers);

        var leaderboard = await parentService.GetClassLeaderboardAsync(classId: 3);
        Assert.Single(leaderboard.TopRankings);
        Assert.Equal(1, leaderboard.TopRankings[0].Rank);

        // 5. AiAssistantService (Map & 60s Audio Digest)
        var generatedMap = await aiService.GenerateStemMapAndQuestAsync("Sa bàn Sao Hỏa");
        Assert.NotEmpty(generatedMap.Checkpoints);

        var digest = await aiService.GenerateParentAudioDigestTextAsync(sessionId: 6, studentId: 2);
        Assert.Contains("Lê Bảo An", digest);
    }
}
