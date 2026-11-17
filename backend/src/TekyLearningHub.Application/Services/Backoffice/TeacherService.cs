using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using TekyLearningHub.Application.DTOs;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Application.Interfaces.Backoffice;
using TekyLearningHub.Application.Interfaces.Portal;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.Services.Backoffice;

public class TeacherService(
    ITeacherRepository repository,
    IUnitOfWork unit,
    IAstAnalysisService astService,
    IClassroomRealtimeService realtimeService,
    INotificationService notificationService) : ITeacherService
{
    // ==================== SCR-TEA-01: BÀN LÀM VIỆC & LỚP PHỤ TRÁCH ====================

    public async Task<TeacherWorkspaceDto> GetTeacherWorkspaceAsync(int teacherId, DateOnly? weekStart = null, CancellationToken ct = default)
    {
        var teacher = await repository.FindUser(teacherId, ct);

        var classes = await repository.TeacherClasses(teacherId, ct);
        var activeClassIds = classes.Select(c => c.ClassId).ToList();

        var pendingSubmissionsCount = activeClassIds.Count == 0
            ? 0
            : await repository.PendingSubmissionCount(activeClassIds, ct);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var anchor = weekStart ?? today;
        var startOfWeek = anchor.AddDays(-(((int)anchor.DayOfWeek + 6) % 7));
        var endOfWeek = startOfWeek.AddDays(7);

        var weeklySessions = await repository.WeekSessions(activeClassIds, startOfWeek, endOfWeek, ct);

        var sessionMapByClass = classes.ToDictionary(c => c.ClassId, c => c.ClassSessions);

        var scheduleList = weeklySessions.Select(s => new TeacherScheduleSessionDto
        {
            SessionId = s.SessionId,
            ClassId = s.ClassId,
            ClassCode = s.Class.ClassCode,
            ClassName = s.Class.Name,
            SessionNumber = (sessionMapByClass.TryGetValue(s.ClassId, out var allSessions)
                ? allSessions.Count(x => x.SessionDate < s.SessionDate)
                : 0) + 1,
            Title = $"Buổi học ngày {s.SessionDate:dd/MM/yyyy}",
            SessionDate = s.SessionDate,
            StartTime = s.StartTime.ToString("HH:mm"),
            EndTime = s.EndTime.ToString("HH:mm"),
            RoomName = s.Room?.RoomName ?? "Phòng Lab STEM",
            Status = s.Status,
            EnrolledStudentsCount = s.Class.Enrollments.Count(e => e.Status == "Active"),
            PresentCount = s.AttendanceRecords.Count(a => a.Status == "Present")
        }).ToList();

        var recentAbsents = (await repository.RecentAbsences(activeClassIds, 5, ct)).Select(a => new AbsentAlertDto
        {
            StudentId = a.StudentId,
            StudentName = a.Student?.User?.FullName ?? "Học sinh",
            ClassCode = a.Session?.Class?.ClassCode ?? string.Empty,
            Date = a.Session?.SessionDate ?? default,
            Reason = a.AbsenceReason ?? "Vắng mặt đầu giờ"
        }).ToList();

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

    public async Task<List<TeacherClassSummaryDto>> GetTeacherClassesAsync(int teacherId, CancellationToken ct = default)
    {
        var classes = await repository.TeacherClassesIncludingPlanned(teacherId, ct);
        return classes
            .OrderBy(c => c.ClassCode)
            .Select(c => new TeacherClassSummaryDto
            {
                ClassId = c.ClassId,
                ClassCode = c.ClassCode,
                ClassName = c.Name,
                Status = c.Status,
                StudentCount = c.Enrollments.Count(e => e.Status == "Active")
            })
            .ToList();
    }

    // ==================== SCR-TEA-02: ĐIỂM DANH 1-CHẠM, MÁY TRẠM & HỌC BÙ ====================

    public async Task<ClassAttendanceSessionDto> GetSessionAttendanceAsync(int sessionId, CancellationToken ct = default)
    {
        var session = await repository.SessionWithAttendance(sessionId, ct)
            ?? throw new KeyNotFoundException("Không tìm thấy buổi học.");

        var existingMap = session.AttendanceRecords.ToDictionary(a => a.StudentId);

        var list = new List<StudentAttendanceItemDto>();
        foreach (var enrollment in session.Class.Enrollments.Where(e => e.Status == "Active"))
        {
            existingMap.TryGetValue(enrollment.StudentId, out var att);

            list.Add(new StudentAttendanceItemDto
            {
                AttendanceId = att?.AttendanceId ?? 0,
                StudentId = enrollment.StudentId,
                StudentCode = enrollment.Student?.StudentCode ?? string.Empty,
                StudentName = enrollment.Student?.User?.FullName ?? "Học sinh",
                AvatarUrl = enrollment.Student?.User?.AvatarUrl,
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
        var session = await repository.SessionForUpdate(request.SessionId, ct)
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
                repository.AddAttendance(new AttendanceRecord
                {
                    SessionId = session.SessionId,
                    StudentId = item.StudentId,
                    Status = item.Status,
                    AbsenceReason = item.Reason,
                    MarkedBy = teacherId,
                    MarkedAt = DateTime.UtcNow
                });
            }
        }

        await unit.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> SyncWorkstationCheckInAsync(int sessionId, int studentId, string workstationIp, CancellationToken ct = default)
    {
        var session = await repository.SessionForUpdate(sessionId, ct)
            ?? throw new KeyNotFoundException("Không tìm thấy buổi học.");

        var attendance = await repository.FindAttendance(sessionId, studentId, ct);

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
            repository.AddAttendance(attendance);
        }
        else
        {
            attendance.Status = "Present";
            attendance.AbsenceReason = $"Tự động check-in từ máy trạm IP: {workstationIp}";
            attendance.UpdatedAt = DateTime.UtcNow;
        }

        var student = await repository.FindUserForUpdate(studentId, ct);
        if (student != null)
        {
            student.LastLoginAt = DateTime.UtcNow;
        }

        await unit.SaveChangesAsync(ct);

        await realtimeService.NotifyWorkstationCheckInAsync(session.ClassId, studentId, student?.FullName ?? "Học sinh", workstationIp, ct);

        return true;
    }

    public async Task<List<MakeupRequestItemDto>> GetMakeupRequestsAsync(int teacherId, CancellationToken ct = default)
    {
        var requests = await repository.TeacherMakeupRequests(teacherId, ct);
        return requests
            .OrderBy(m => m.Status != "Pending")
            .ThenByDescending(m => m.CreatedAt)
            .Select(m => new MakeupRequestItemDto
            {
                MakeupId = m.MakeupId,
                StudentId = m.Attendance?.StudentId ?? 0,
                StudentName = m.Attendance?.Student?.User?.FullName ?? "Học sinh",
                ClassCode = m.Attendance?.Session?.Class?.ClassCode ?? string.Empty,
                MissedDate = m.Attendance?.Session?.SessionDate ?? default,
                PreferredSessionId = m.PreferredSessionId,
                PreferredDate = m.PreferredSession?.SessionDate,
                Reason = m.Reason,
                Status = m.Status,
                CreatedAt = m.CreatedAt
            })
            .ToList();
    }

    public async Task<bool> ReviewMakeupRequestAsync(ReviewMakeupRequestDto request, int teacherId, CancellationToken ct = default)
    {
        var makeup = await repository.FindMakeupRequest(request.MakeupId, ct)
            ?? throw new KeyNotFoundException("Không tìm thấy đơn xin học bù.");

        makeup.Status = request.IsApproved ? "Approved" : "Rejected";
        makeup.ProcessedBy = teacherId;
        makeup.ProcessedAt = DateTime.UtcNow;

        if (request.IsApproved && makeup.PreferredSessionId.HasValue)
        {
            var existingAtt = await repository.FindAttendance(makeup.PreferredSessionId.Value, makeup.Attendance?.StudentId ?? 0, ct);

            if (existingAtt == null)
            {
                repository.AddAttendance(new AttendanceRecord
                {
                    SessionId = makeup.PreferredSessionId.Value,
                    StudentId = makeup.Attendance?.StudentId ?? 0,
                    Status = "Present",
                    AbsenceReason = "Học bù đã duyệt",
                    MarkedBy = teacherId,
                    MarkedAt = DateTime.UtcNow
                });
            }
        }

        await unit.SaveChangesAsync(ct);

        await notificationService.SendNotificationAsync(
            makeup.Attendance?.StudentId ?? 0,
            "MakeupStatusUpdated",
            "Kết quả đơn xin học bù",
            $"Đơn xin học bù của bạn đã được giáo viên {(request.IsApproved ? "CHẤP THUẬN" : "TỪ CHỐI")}.",
            "MakeupRequest",
            makeup.MakeupId,
            ct);

        return true;
    }

    // ==================== SCR-TEA-04: THIẾT KẾ SA BÀN 2D & TRẠM KIỂM SOÁT ====================

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
            map.MapCheckpoints.Add(new MapCheckpoint
            {
                SeqNo = cp.SeqNo,
                X = cp.X,
                Y = cp.Y,
                UnlockMessage = cp.UnlockMessage,
                IsFinish = cp.IsFinish
            });
        }

        repository.AddChallengeMap(map);
        await unit.SaveChangesAsync(ct);
        return map.MapId;
    }

    // ==================== SCR-TEA-05: CHẤM ĐIỂM KẾT HỢP 60/40 ====================

    public async Task<List<GradingQueueItemDto>> GetGradingQueueAsync(int teacherId, int? classId, CancellationToken ct = default)
    {
        var submissions = await repository.GradingQueue(teacherId, classId, ct);

        return submissions
            .OrderBy(s => s.Status == "Finalized")
            .ThenByDescending(s => s.SubmittedAt)
            .Select(s => new GradingQueueItemDto
            {
                SubmissionId = s.SubmissionId,
                AssignmentId = s.AssignmentId,
                AssignmentTitle = s.Assignment?.Title ?? string.Empty,
                ClassId = s.Assignment?.ClassId ?? 0,
                ClassCode = s.Assignment?.Class?.ClassCode ?? string.Empty,
                StudentId = s.StudentId,
                StudentCode = s.Student?.StudentCode ?? string.Empty,
                StudentName = s.Student?.User?.FullName ?? "Học sinh",
                AttemptNo = s.AttemptNo,
                Status = s.Status,
                SubmittedAt = s.SubmittedAt,
                BlocklyJson = s.BlocklyJson,
                AutoAstScore = s.AstEvaluation?.AutoAstScore,
                MatchPercent = s.AstEvaluation?.MatchPercent,
                HardwareScore = s.Grade?.HardwareScore,
                FinalScore = s.Grade?.FinalScore,
                RemarkText = s.Grade?.RemarkText,
                RemarkSource = s.Grade?.RemarkSource
            })
            .ToList();
    }

    public async Task<SubmissionGradingResultDto> GradeSubmissionAsync(GradeSubmissionRequest request, int teacherId, CancellationToken ct = default)
    {
        var submission = await repository.SubmissionForGrading(request.SubmissionId, ct)
            ?? throw new KeyNotFoundException("Không tìm thấy bài nộp.");

        decimal astScore = submission.AstEvaluation?.AutoAstScore ?? 0m;
        if (submission.AstEvaluation == null && !string.IsNullOrWhiteSpace(submission.Assignment?.MasterAstJson) && !string.IsNullOrWhiteSpace(submission.AstJson))
        {
            astScore = astService.CalculateTreeEditDistanceScore(submission.AstJson, submission.Assignment.MasterAstJson);

            repository.AddAstEvaluation(new AstEvaluation
            {
                SubmissionId = submission.SubmissionId,
                AutoAstScore = astScore,
                MatchPercent = astScore * 10m,
                EngineVersion = "TED-v1.0",
                EvaluatedAt = DateTime.UtcNow
            });
        }

        decimal hardwareScore = Math.Round((request.AssemblyScore + request.AlgorithmExplainScore + request.TeamworkScore) / 3.0m, 2);
        decimal finalScore = astService.ComputeHybridScore(astScore, hardwareScore);

        submission.Status = "Finalized";

        var grade = await repository.FindGrade(submission.SubmissionId, ct);
        if (grade == null)
        {
            grade = new Grade
            {
                SubmissionId = submission.SubmissionId,
                AutoAstScore = astScore,
                HardwareScore = hardwareScore,
                FinalScore = finalScore,
                RemarkText = request.RemarkText,
                RemarkSource = NormalizeRemarkSource(request.RemarkSource),
                IsFinalized = true,
                FinalizedBy = teacherId,
                FinalizedAt = DateTime.UtcNow
            };
            repository.AddGrade(grade);
        }
        else
        {
            grade.AutoAstScore = astScore;
            grade.HardwareScore = hardwareScore;
            grade.FinalScore = finalScore;
            grade.RemarkText = request.RemarkText;
            grade.RemarkSource = NormalizeRemarkSource(request.RemarkSource);
            grade.FinalizedBy = teacherId;
            grade.FinalizedAt = DateTime.UtcNow;
        }

        if (submission.Student != null)
        {
            submission.Student.TotalXp += (int)(finalScore * 10m);
            submission.Student.StemPoints += (int)(finalScore * 5m);
        }

        var existingPortfolio = await repository.FindPortfolioBySubmission(submission.SubmissionId, ct);

        if (existingPortfolio == null && finalScore >= 8.0m)
        {
            var portfolioItem = new PortfolioItem
            {
                StudentId = submission.StudentId,
                SubmissionId = submission.SubmissionId,
                Title = submission.Assignment?.Title ?? "Dự án thực hành STEM",
                Summary = request.RemarkText ?? $"Hoàn thành bài thực hành với điểm tổng kết {finalScore:F1}/10 (AST {astScore:F1} • Phần cứng {hardwareScore:F1}).",
                FinalScore = finalScore,
                CompletedAt = DateTime.UtcNow
            };
            portfolioItem.AchievementCards.Add(new AchievementCard
            {
                StudentId = submission.StudentId,
                Title = $"Chứng nhận: {submission.Assignment?.Title ?? "Kỹ sư STEM nhí"}",
                QrToken = Guid.NewGuid(),
                IsPublic = true,
                ExportedBy = teacherId,
                ViewCount = 1,
                CreatedAt = DateTime.UtcNow
            });
            repository.AddPortfolio(portfolioItem);
        }
        else if (existingPortfolio != null)
        {
            existingPortfolio.FinalScore = finalScore;
            if (!string.IsNullOrWhiteSpace(request.RemarkText))
            {
                existingPortfolio.Summary = request.RemarkText;
            }
        }

        await unit.SaveChangesAsync(ct);

        await notificationService.SendNotificationAsync(
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

    // ==================== SCR-TEA-06: PHÂN TÍCH PHỔ ĐIỂM LỚP HỌC ====================

    public async Task<ClassPerformanceAnalyticsDto> GetClassPerformanceAnalyticsAsync(int classId, CancellationToken ct = default)
    {
        var classroom = await repository.FindClass(classId, ct)
            ?? throw new KeyNotFoundException("Không tìm thấy lớp học.");

        var grades = await repository.ClassGrades(classId, ct);

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

    private static string NormalizeRemarkSource(string? source) =>
        string.Equals(source, "Voice", StringComparison.OrdinalIgnoreCase) ? "Voice" : "Typed";
}
