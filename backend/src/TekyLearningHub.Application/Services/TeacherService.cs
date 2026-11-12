using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.DTOs;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.Services;

public interface ITeacherService
{
    Task<TeacherWorkspaceDto> GetTeacherWorkspaceAsync(int teacherId, CancellationToken ct = default);
    Task<ClassAttendanceSessionDto> GetSessionAttendanceAsync(int sessionId, CancellationToken ct = default);
    Task<bool> UpdateSessionAttendanceAsync(UpdateClassAttendanceRequest request, int teacherId, CancellationToken ct = default);
    Task<bool> ReviewMakeupRequestAsync(ReviewMakeupRequestDto request, int teacherId, CancellationToken ct = default);
    Task<int> CreateStemMapAsync(CreateStemMapRequest request, int teacherId, CancellationToken ct = default);
    Task<SubmissionGradingResultDto> GradeSubmissionAsync(GradeSubmissionRequest request, int teacherId, CancellationToken ct = default);
    Task<ClassPerformanceAnalyticsDto> GetClassPerformanceAnalyticsAsync(int classId, CancellationToken ct = default);
    Task<bool> SyncWorkstationCheckInAsync(int sessionId, int studentId, string workstationIp, CancellationToken ct = default);
}

public class TeacherService : ITeacherService
{
    private readonly IApplicationDbContext _context;
    private readonly IAstAnalysisService _astService;
    private readonly IClassroomRealtimeService _realtimeService;
    private readonly INotificationService _notificationService;

    public TeacherService(
        IApplicationDbContext context,
        IAstAnalysisService astService,
        IClassroomRealtimeService realtimeService,
        INotificationService notificationService)
    {
        _context = context;
        _astService = astService;
        _realtimeService = realtimeService;
        _notificationService = notificationService;
    }

    public async Task<TeacherWorkspaceDto> GetTeacherWorkspaceAsync(int teacherId, CancellationToken ct = default)
    {
        var teacher = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.UserId == teacherId, ct);

        var classes = await _context.Classes
            .AsNoTracking()
            .Where(c => c.TeacherId == teacherId && c.Status == "Active")
            .Include(c => c.Sessions)
            .Include(c => c.Enrollments)
            .ToListAsync(ct);

        var activeClassIds = classes.Select(c => c.ClassId).ToList();

        var pendingSubmissionsCount = await _context.Submissions
            .CountAsync(s => s.Status == "Submitted" && activeClassIds.Contains(s.Assignment.ClassId), ct);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var startOfWeek = today.AddDays(-(int)today.DayOfWeek);
        var endOfWeek = startOfWeek.AddDays(7);

        var weeklySessions = await _context.ClassSessions
            .AsNoTracking()
            .Where(s => activeClassIds.Contains(s.ClassId) && s.SessionDate >= startOfWeek && s.SessionDate < endOfWeek)
            .Include(s => s.Class)
            .Include(s => s.Room)
            .Include(s => s.AttendanceRecords)
            .OrderBy(s => s.SessionDate)
            .ThenBy(s => s.StartTime)
            .ToListAsync(ct);

        var scheduleList = weeklySessions.Select(s => new TeacherScheduleSessionDto
        {
            SessionId = s.SessionId,
            ClassId = s.ClassId,
            ClassCode = s.Class.ClassCode,
            ClassName = s.Class.Name,
            SessionNumber = 1,
            Title = $"Buổi học ngày {s.SessionDate:dd/MM/yyyy}",
            SessionDate = s.SessionDate,
            StartTime = s.StartTime.ToString(@"hh\:mm"),
            EndTime = s.EndTime.ToString(@"hh\:mm"),
            RoomName = s.Room?.RoomName ?? "Phòng Lab STEM",
            Status = s.Status,
            EnrolledStudentsCount = s.Class.Enrollments.Count,
            PresentCount = s.AttendanceRecords.Count(a => a.Status == "Present")
        }).ToList();

        var recentAbsents = await _context.AttendanceRecords
            .AsNoTracking()
            .Where(a => a.Status == "Absent" && activeClassIds.Contains(a.Session.ClassId))
            .OrderByDescending(a => a.MarkedAt)
            .Take(5)
            .Select(a => new AbsentAlertDto
            {
                StudentId = a.StudentId,
                StudentName = a.Student.User.FullName,
                ClassCode = a.Session.Class.ClassCode,
                Date = a.Session.SessionDate,
                Reason = a.AbsenceReason ?? "Vắng mặt đầu giờ"
            })
            .ToListAsync(ct);

        return new TeacherWorkspaceDto
        {
            TeacherId = teacherId,
            TeacherName = teacher?.FullName ?? "Giáo viên TEKY",
            PendingTaskCount = pendingSubmissionsCount,
            ActiveClassesCount = classes.Count,
            WeeklySchedule = scheduleList,
            RecentAbsentAlerts = recentAbsents
        };
    }

    public async Task<ClassAttendanceSessionDto> GetSessionAttendanceAsync(int sessionId, CancellationToken ct = default)
    {
        var session = await _context.ClassSessions
            .AsNoTracking()
            .Include(s => s.Class)
                .ThenInclude(c => c.Enrollments)
                    .ThenInclude(e => e.Student)
                        .ThenInclude(st => st.User)
            .Include(s => s.AttendanceRecords)
            .FirstOrDefaultAsync(s => s.SessionId == sessionId, ct)
            ?? throw new KeyNotFoundException("Không tìm thấy buổi học.");

        var existingMap = session.AttendanceRecords.ToDictionary(a => a.StudentId);

        var list = new List<StudentAttendanceItemDto>();
        foreach (var enrollment in session.Class.Enrollments.Where(e => e.Status == "Enrolled"))
        {
            existingMap.TryGetValue(enrollment.StudentId, out var att);

            list.Add(new StudentAttendanceItemDto
            {
                AttendanceId = att?.AttendanceId ?? 0,
                StudentId = enrollment.StudentId,
                StudentCode = enrollment.Student.StudentCode,
                StudentName = enrollment.Student.User.FullName,
                AvatarUrl = enrollment.Student.User.AvatarUrl,
                Status = att?.Status ?? "Absent",
                AbsenceReason = att?.AbsenceReason,
                MarkedAt = att?.MarkedAt
            });
        }

        return new ClassAttendanceSessionDto
        {
            SessionId = session.SessionId,
            ClassName = session.Class.Name,
            Date = session.SessionDate,
            Students = list.OrderBy(s => s.StudentName).ToList()
        };
    }

    public async Task<bool> UpdateSessionAttendanceAsync(UpdateClassAttendanceRequest request, int teacherId, CancellationToken ct = default)
    {
        var session = await _context.ClassSessions
            .Include(s => s.AttendanceRecords)
            .FirstOrDefaultAsync(s => s.SessionId == request.SessionId, ct)
            ?? throw new KeyNotFoundException("Không tìm thấy buổi học.");

        var existingMap = session.AttendanceRecords.ToDictionary(a => a.StudentId);

        foreach (var item in request.AttendanceList)
        {
            if (existingMap.TryGetValue(item.StudentId, out var existingRecord))
            {
                existingRecord.Status = item.Status;
                existingRecord.AbsenceReason = item.Reason;
                existingRecord.MarkedBy = teacherId;
                existingRecord.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                var newRecord = new AttendanceRecord
                {
                    SessionId = session.SessionId,
                    StudentId = item.StudentId,
                    Status = item.Status,
                    AbsenceReason = item.Reason,
                    MarkedBy = teacherId,
                    MarkedAt = DateTime.UtcNow
                };
                await _context.AttendanceRecords.AddAsync(newRecord, ct);
            }
        }

        await _context.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> ReviewMakeupRequestAsync(ReviewMakeupRequestDto request, int teacherId, CancellationToken ct = default)
    {
        var makeup = await _context.MakeupRequests
            .Include(m => m.Attendance)
                .ThenInclude(a => a.Student)
            .FirstOrDefaultAsync(m => m.MakeupId == request.MakeupId, ct)
            ?? throw new KeyNotFoundException("Không tìm thấy đơn xin học bù.");

        makeup.Status = request.IsApproved ? "Approved" : "Rejected";
        makeup.ProcessedBy = teacherId;
        makeup.ProcessedAt = DateTime.UtcNow;

        if (request.IsApproved && makeup.PreferredSessionId.HasValue)
        {
            var existingAtt = await _context.AttendanceRecords
                .FirstOrDefaultAsync(a => a.SessionId == makeup.PreferredSessionId.Value && a.StudentId == makeup.Attendance.StudentId, ct);

            if (existingAtt == null)
            {
                await _context.AttendanceRecords.AddAsync(new AttendanceRecord
                {
                    SessionId = makeup.PreferredSessionId.Value,
                    StudentId = makeup.Attendance.StudentId,
                    Status = "Present",
                    AbsenceReason = "Học bù đã duyệt",
                    MarkedBy = teacherId,
                    MarkedAt = DateTime.UtcNow
                }, ct);
            }
        }

        await _context.SaveChangesAsync(ct);

        await _notificationService.SendNotificationAsync(
            makeup.Attendance.StudentId,
            "MakeupStatusUpdated",
            "Kết quả đơn xin học bù",
            $"Đơn xin học bù của bạn đã được giáo viên {(request.IsApproved ? "CHẤP THUẬN" : "TỪ CHỐI")}.",
            "MakeupRequest",
            makeup.MakeupId,
            ct);

        return true;
    }

    public async Task<int> CreateStemMapAsync(CreateStemMapRequest request, int teacherId, CancellationToken ct = default)
    {
        var map = new ChallengeMap
        {
            Name = request.Name,
            Theme = request.Theme,
            LayoutJson = request.LayoutJson,
            StartX = request.StartX,
            StartY = request.StartY,
            Status = "Active",
            CreatedBy = teacherId
        };

        foreach (var cp in request.Checkpoints)
        {
            map.Checkpoints.Add(new MapCheckpoint
            {
                SeqNo = cp.SeqNo,
                X = cp.X,
                Y = cp.Y,
                UnlockMessage = cp.UnlockMessage,
                IsFinish = cp.IsFinish
            });
        }

        await _context.ChallengeMaps.AddAsync(map, ct);
        await _context.SaveChangesAsync(ct);
        return map.MapId;
    }

    public async Task<SubmissionGradingResultDto> GradeSubmissionAsync(GradeSubmissionRequest request, int teacherId, CancellationToken ct = default)
    {
        var submission = await _context.Submissions
            .Include(s => s.Assignment)
            .Include(s => s.AstEvaluation)
            .Include(s => s.Grade)
                .ThenInclude(g => g.HardwareScores)
            .Include(s => s.Student)
            .FirstOrDefaultAsync(s => s.SubmissionId == request.SubmissionId, ct)
            ?? throw new KeyNotFoundException("Không tìm thấy bài nộp.");

        // Calculate AST Score if not evaluated yet
        decimal astScore = submission.AstEvaluation?.AutoAstScore ?? 0m;
        if (submission.AstEvaluation == null && !string.IsNullOrWhiteSpace(submission.Assignment?.MasterAstJson) && !string.IsNullOrWhiteSpace(submission.AstJson))
        {
            astScore = _astService.CalculateTreeEditDistanceScore(submission.AstJson, submission.Assignment.MasterAstJson);

            var astEval = new AstEvaluation
            {
                SubmissionId = submission.SubmissionId,
                AutoAstScore = astScore,
                MatchPercent = astScore * 10m,
                EvaluatedAt = DateTime.UtcNow
            };
            await _context.AstEvaluations.AddAsync(astEval, ct);
        }

        // Hardware Qualitative Rubric Score (Average of 3 criteria)
        decimal hardwareScore = Math.Round((request.AssemblyScore + request.AlgorithmExplainScore + request.TeamworkScore) / 3.0m, 2);

        // 60/40 Hybrid Formula: FinalScore = (AstScore * 0.6) + (HardwareScore * 0.4)
        decimal finalScore = _astService.ComputeHybridScore(astScore, hardwareScore);

        submission.Status = "Graded";

        var grade = submission.Grade;
        if (grade == null)
        {
            grade = new Grade
            {
                SubmissionId = submission.SubmissionId,
                AutoAstScore = astScore,
                HardwareScore = hardwareScore,
                FinalScore = finalScore,
                RemarkText = request.RemarkText,
                RemarkSource = request.RemarkSource ?? "Text",
                IsFinalized = true,
                FinalizedBy = teacherId,
                FinalizedAt = DateTime.UtcNow
            };
            await _context.Grades.AddAsync(grade, ct);
        }
        else
        {
            grade.AutoAstScore = astScore;
            grade.HardwareScore = hardwareScore;
            grade.FinalScore = finalScore;
            grade.RemarkText = request.RemarkText;
            grade.RemarkSource = request.RemarkSource ?? "Text";
            grade.FinalizedBy = teacherId;
            grade.FinalizedAt = DateTime.UtcNow;
        }

        // Award XP to Student
        submission.Student.TotalXp += (int)(finalScore * 10m);
        submission.Student.StemPoints += (int)(finalScore * 5m);

        await _context.SaveChangesAsync(ct);

        // Notify Student
        await _notificationService.SendNotificationAsync(
            submission.StudentId,
            "GradePublished",
            "Kết quả bài thực hành STEM",
            $"Bạn đã đạt {finalScore:F1}/10 điểm cho bài tập '{submission.Assignment?.Title ?? "Bài tập STEM"}'.",
            "Submission",
            submission.SubmissionId,
            ct);

        return new SubmissionGradingResultDto
        {
            SubmissionId = submission.SubmissionId,
            AutoAstScore = astScore,
            HardwareScore = hardwareScore,
            FinalScore = finalScore,
            Status = submission.Status
        };
    }

    public async Task<ClassPerformanceAnalyticsDto> GetClassPerformanceAnalyticsAsync(int classId, CancellationToken ct = default)
    {
        var classroom = await _context.Classes
            .AsNoTracking()
            .Include(c => c.Enrollments)
            .FirstOrDefaultAsync(c => c.ClassId == classId, ct)
            ?? throw new KeyNotFoundException("Không tìm thấy lớp học.");

        var grades = await _context.Grades
            .AsNoTracking()
            .Include(g => g.Submission)
                .ThenInclude(s => s.Assignment)
            .Where(g => g.Submission.Assignment.ClassId == classId && g.FinalScore.HasValue)
            .ToListAsync(ct);

        if (grades.Count == 0)
        {
            return new ClassPerformanceAnalyticsDto
            {
                ClassId = classId,
                ClassName = classroom.Name,
                TotalStudents = classroom.Enrollments.Count
            };
        }

        var scores = grades.Select(g => g.FinalScore!.Value).ToList();
        var hardwareScores = grades.Where(g => g.HardwareScore.HasValue).Select(g => g.HardwareScore!.Value).ToList();
        var astScores = grades.Where(g => g.AutoAstScore.HasValue).Select(g => g.AutoAstScore!.Value).ToList();

        var buckets = new List<ScoreDistributionBucketDto>
        {
            new() { Range = "Dưới 5.0 (Cần phụ đạo)", Count = scores.Count(s => s < 5.0m) },
            new() { Range = "5.0 - 6.9 (Trung bình)", Count = scores.Count(s => s >= 5.0m && s < 7.0m) },
            new() { Range = "7.0 - 8.4 (Khá)", Count = scores.Count(s => s >= 7.0m && s < 8.5m) },
            new() { Range = "8.5 - 10 (Giỏi & Xuất sắc)", Count = scores.Count(s => s >= 8.5m) }
        };

        return new ClassPerformanceAnalyticsDto
        {
            ClassId = classId,
            ClassName = classroom.Name,
            TotalStudents = classroom.Enrollments.Count,
            AverageScore = Math.Round(scores.Average(), 2),
            MinScore = Math.Round(scores.Min(), 2),
            MaxScore = Math.Round(scores.Max(), 2),
            HardwareAverage = hardwareScores.Any() ? Math.Round(hardwareScores.Average(), 2) : 0m,
            AstAverage = astScores.Any() ? Math.Round(astScores.Average(), 2) : 0m,
            ScoreBuckets = buckets
        };
    }

    public async Task<bool> SyncWorkstationCheckInAsync(int sessionId, int studentId, string workstationIp, CancellationToken ct = default)
    {
        var session = await _context.ClassSessions
            .Include(s => s.Class)
            .FirstOrDefaultAsync(s => s.SessionId == sessionId, ct)
            ?? throw new KeyNotFoundException("Không tìm thấy buổi học.");

        var attendance = await _context.AttendanceRecords
            .FirstOrDefaultAsync(a => a.SessionId == sessionId && a.StudentId == studentId, ct);

        if (attendance == null)
        {
            attendance = new AttendanceRecord
            {
                SessionId = sessionId,
                StudentId = studentId,
                Status = "Present",
                AbsenceReason = $"Tự động check-in từ máy trạm IP: {workstationIp}",
                MarkedBy = session.Class.TeacherId ?? 0,
                MarkedAt = DateTime.UtcNow
            };
            await _context.AttendanceRecords.AddAsync(attendance, ct);
        }
        else
        {
            attendance.Status = "Present";
            attendance.AbsenceReason = $"Tự động check-in từ máy trạm IP: {workstationIp}";
            attendance.UpdatedAt = DateTime.UtcNow;
        }

        var student = await _context.Users.FirstOrDefaultAsync(u => u.UserId == studentId, ct);
        if (student != null)
        {
            student.LastLoginAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync(ct);

        await _realtimeService.NotifyWorkstationCheckInAsync(session.ClassId, studentId, student?.FullName ?? "Học sinh", workstationIp, ct);

        return true;
    }
}
