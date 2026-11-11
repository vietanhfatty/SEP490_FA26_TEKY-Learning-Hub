using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.DTOs;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Domain.Enums;

namespace TekyLearningHub.Application.Services;

public interface ITeacherService
{
    Task<TeacherWorkspaceDto> GetTeacherWorkspaceAsync(Guid teacherId, CancellationToken ct = default);
    Task<ClassAttendanceSessionDto> GetSessionAttendanceAsync(Guid sessionId, CancellationToken ct = default);
    Task<bool> UpdateSessionAttendanceAsync(UpdateClassAttendanceRequest request, Guid teacherId, CancellationToken ct = default);
    Task<bool> ReviewMakeupRequestAsync(ReviewMakeupRequestDto request, Guid teacherId, CancellationToken ct = default);
    Task<Guid> CreateStemMapAsync(CreateStemMapRequest request, Guid teacherId, CancellationToken ct = default);
    Task<SubmissionGradingResultDto> GradeSubmissionAsync(GradeSubmissionRequest request, Guid teacherId, CancellationToken ct = default);
    Task<ClassPerformanceAnalyticsDto> GetClassPerformanceAnalyticsAsync(Guid classroomId, CancellationToken ct = default);
    Task<bool> SyncWorkstationCheckInAsync(Guid classSessionId, Guid studentId, string workstationIp, CancellationToken ct = default);
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

    public async Task<TeacherWorkspaceDto> GetTeacherWorkspaceAsync(Guid teacherId, CancellationToken ct = default)
    {
        var teacher = await _context.Teachers
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == teacherId, ct);

        var classrooms = await _context.Classrooms
            .AsNoTracking()
            .Where(c => c.TeacherId == teacherId && c.IsActive)
            .Include(c => c.Sessions)
            .Include(c => c.Students)
            .ToListAsync(ct);

        var activeClassIds = classrooms.Select(c => c.Id).ToList();

        var pendingSubmissionsCount = await _context.StudentSubmissions
            .CountAsync(s => s.Status == SubmissionStatus.Submitted && activeClassIds.Contains(s.Assignment.ClassroomId), ct);

        var today = DateTime.UtcNow.Date;
        var startOfWeek = today.AddDays(-(int)today.DayOfWeek);
        var endOfWeek = startOfWeek.AddDays(7);

        var weeklySessions = await _context.ClassSessions
            .AsNoTracking()
            .Where(s => activeClassIds.Contains(s.ClassroomId) && s.ScheduledDate >= startOfWeek && s.ScheduledDate < endOfWeek)
            .Include(s => s.Classroom)
            .Include(s => s.Attendances)
            .OrderBy(s => s.ScheduledDate)
            .ThenBy(s => s.StartTime)
            .ToListAsync(ct);

        var scheduleList = weeklySessions.Select(s => new TeacherScheduleSessionDto
        {
            SessionId = s.Id,
            ClassroomId = s.ClassroomId,
            ClassCode = s.Classroom.ClassCode,
            ClassName = s.Classroom.Name,
            SessionNumber = s.SessionNumber,
            Title = s.Title,
            ScheduledDate = s.ScheduledDate,
            StartTime = s.StartTime.ToString(@"hh\:mm"),
            EndTime = s.EndTime.ToString(@"hh\:mm"),
            RoomName = s.RoomName,
            Status = s.Status,
            EnrolledStudentsCount = s.Classroom.Students.Count,
            PresentCount = s.Attendances.Count(a => a.Status == AttendanceStatus.Present)
        }).ToList();

        var recentAbsents = await _context.Attendances
            .AsNoTracking()
            .Where(a => a.Status == AttendanceStatus.Absent && activeClassIds.Contains(a.ClassSession.ClassroomId))
            .OrderByDescending(a => a.CreatedAt)
            .Take(5)
            .Select(a => new AbsentAlertDto
            {
                StudentId = a.StudentId,
                StudentName = a.Student.FullName,
                ClassCode = a.ClassSession.Classroom.ClassCode,
                Date = a.ClassSession.ScheduledDate,
                Reason = a.Notes ?? "Vắng mặt đầu giờ"
            })
            .ToListAsync(ct);

        return new TeacherWorkspaceDto
        {
            TeacherId = teacherId,
            TeacherName = teacher?.FullName ?? "Giáo viên TEKY",
            PendingTaskCount = pendingSubmissionsCount,
            ActiveClassesCount = classrooms.Count,
            WeeklySchedule = scheduleList,
            RecentAbsentAlerts = recentAbsents
        };
    }

    public async Task<ClassAttendanceSessionDto> GetSessionAttendanceAsync(Guid sessionId, CancellationToken ct = default)
    {
        var session = await _context.ClassSessions
            .AsNoTracking()
            .Include(s => s.Classroom)
                .ThenInclude(c => c.Students)
                    .ThenInclude(cs => cs.Student)
            .Include(s => s.Attendances)
            .FirstOrDefaultAsync(s => s.Id == sessionId, ct)
            ?? throw new KeyNotFoundException("Không tìm thấy buổi học.");

        var existingAttendances = session.Attendances.ToDictionary(a => a.StudentId);

        var studentList = new List<StudentAttendanceItemDto>();
        foreach (var classStudent in session.Classroom.Students.Where(cs => cs.IsActive))
        {
            existingAttendances.TryGetValue(classStudent.StudentId, out var att);

            studentList.Add(new StudentAttendanceItemDto
            {
                AttendanceId = att?.Id ?? Guid.Empty,
                StudentId = classStudent.StudentId,
                StudentCode = classStudent.Student.StudentCode,
                StudentName = classStudent.Student.FullName,
                AvatarUrl = classStudent.Student.AvatarUrl,
                Status = att?.Status ?? AttendanceStatus.Absent,
                Source = att?.Source ?? AttendanceSource.ManualTeacher,
                CheckInTime = att?.CheckInTime,
                WorkstationIp = att?.WorkstationIp,
                Notes = att?.Notes
            });
        }

        return new ClassAttendanceSessionDto
        {
            SessionId = session.Id,
            ClassName = session.Classroom.Name,
            Date = session.ScheduledDate,
            Students = studentList.OrderBy(s => s.StudentName).ToList()
        };
    }

    public async Task<bool> UpdateSessionAttendanceAsync(UpdateClassAttendanceRequest request, Guid teacherId, CancellationToken ct = default)
    {
        var session = await _context.ClassSessions
            .Include(s => s.Attendances)
            .Include(s => s.Classroom)
            .FirstOrDefaultAsync(s => s.Id == request.SessionId, ct)
            ?? throw new KeyNotFoundException("Không tìm thấy buổi học.");

        var existing = session.Attendances.ToDictionary(a => a.StudentId);

        foreach (var item in request.AttendanceList)
        {
            if (existing.TryGetValue(item.StudentId, out var currentAtt))
            {
                currentAtt.Status = item.Status;
                currentAtt.Notes = item.Notes;
                currentAtt.Source = AttendanceSource.ManualTeacher;
                currentAtt.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                var newAtt = new Attendance
                {
                    Id = Guid.NewGuid(),
                    ClassSessionId = session.Id,
                    StudentId = item.StudentId,
                    Status = item.Status,
                    Source = AttendanceSource.ManualTeacher,
                    Notes = item.Notes,
                    CheckInTime = item.Status == AttendanceStatus.Present ? DateTime.UtcNow : null
                };
                await _context.Attendances.AddAsync(newAtt, ct);
            }

            // Sync EContactBook record for session
            var contactBook = await _context.EContactBooks
                .FirstOrDefaultAsync(cb => cb.ClassSessionId == session.Id && cb.StudentId == item.StudentId, ct);

            if (contactBook == null)
            {
                contactBook = new EContactBook
                {
                    Id = Guid.NewGuid(),
                    ClassSessionId = session.Id,
                    StudentId = item.StudentId,
                    AttendanceStatus = item.Status,
                    SummaryNote = item.Status == AttendanceStatus.Present ? "Học sinh tham gia đầy đủ buổi học." : "Học sinh vắng mặt."
                };
                await _context.EContactBooks.AddAsync(contactBook, ct);
            }
            else
            {
                contactBook.AttendanceStatus = item.Status;
                contactBook.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> ReviewMakeupRequestAsync(ReviewMakeupRequestDto request, Guid teacherId, CancellationToken ct = default)
    {
        var makeupReq = await _context.MakeupRequests
            .Include(m => m.Student)
            .FirstOrDefaultAsync(m => m.Id == request.RequestId, ct)
            ?? throw new KeyNotFoundException("Không tìm thấy đơn xin học bù.");

        makeupReq.Status = request.IsApproved ? MakeupRequestStatus.Approved : MakeupRequestStatus.Rejected;
        makeupReq.ReviewedByTeacherId = teacherId;
        makeupReq.ReviewedAt = DateTime.UtcNow;
        makeupReq.TeacherNote = request.TeacherNote;

        if (request.IsApproved)
        {
            // Add student as attendee in target session with source MakeupSession
            var existingAtt = await _context.Attendances
                .FirstOrDefaultAsync(a => a.ClassSessionId == makeupReq.TargetSessionId && a.StudentId == makeupReq.StudentId, ct);

            if (existingAtt == null)
            {
                await _context.Attendances.AddAsync(new Attendance
                {
                    Id = Guid.NewGuid(),
                    ClassSessionId = makeupReq.TargetSessionId,
                    StudentId = makeupReq.StudentId,
                    Status = AttendanceStatus.Present,
                    Source = AttendanceSource.MakeupSession,
                    Notes = $"Học bù (Đơn được duyệt bởi GV)"
                }, ct);
            }
        }

        await _context.SaveChangesAsync(ct);

        // Notify Student and Parent
        await _notificationService.SendMultiChannelNotificationAsync(
            makeupReq.Student.UserId,
            NotificationType.MakeupStatusUpdated,
            "Kết quả đơn xin học bù",
            $"Đơn xin học bù của bạn đã được giáo viên {(request.IsApproved ? "CHẤP THUẬN" : "TỪ CHỐI")}.",
            null,
            ct);

        return true;
    }

    public async Task<Guid> CreateStemMapAsync(CreateStemMapRequest request, Guid teacherId, CancellationToken ct = default)
    {
        var map = new StemMap
        {
            Id = Guid.NewGuid(),
            TeacherId = teacherId,
            Title = request.Title,
            Description = request.Description,
            ImageUrl = request.ImageUrl,
            GridWidth = request.GridWidth,
            GridHeight = request.GridHeight,
            ParTimeSeconds = request.ParTimeSeconds
        };

        int order = 1;
        foreach (var cp in request.Checkpoints)
        {
            map.Checkpoints.Add(new MapCheckpoint
            {
                Id = Guid.NewGuid(),
                StemMapId = map.Id,
                OrderIndex = cp.OrderIndex > 0 ? cp.OrderIndex : order++,
                CoordinateX = cp.CoordinateX,
                CoordinateY = cp.CoordinateY,
                Name = cp.Name,
                QuestionPrompt = cp.QuestionPrompt
            });
        }

        await _context.StemMaps.AddAsync(map, ct);
        await _context.SaveChangesAsync(ct);
        return map.Id;
    }

    public async Task<SubmissionGradingResultDto> GradeSubmissionAsync(GradeSubmissionRequest request, Guid teacherId, CancellationToken ct = default)
    {
        var submission = await _context.StudentSubmissions
            .Include(s => s.Assignment)
            .Include(s => s.RubricDetail)
            .Include(s => s.Student)
            .FirstOrDefaultAsync(s => s.Id == request.SubmissionId, ct)
            ?? throw new KeyNotFoundException("Không tìm thấy bài nộp.");

        // Calculate AST Auto Score (60%) if master AST is present
        double astScore = submission.AstAutoScore;
        if (!string.IsNullOrWhiteSpace(submission.Assignment.MasterAstJson) && !string.IsNullOrWhiteSpace(submission.SubmittedAstJson))
        {
            astScore = _astService.CalculateTreeEditDistanceScore(submission.SubmittedAstJson, submission.Assignment.MasterAstJson);
            submission.AstAutoScore = astScore;
        }

        // Calculate Qualitative Rubric Score (40%): average of 3 pills (Assembly, Algorithm, Teamwork)
        double rubricScore = Math.Round((request.AssemblyScore + request.AlgorithmExplainScore + request.TeamworkScore) / 3.0, 2);
        submission.RubricScore = rubricScore;

        // Apply 60/40 Formula
        submission.TotalScore = _astService.ComputeHybridScore(astScore, rubricScore);
        submission.Status = SubmissionStatus.Graded;

        if (submission.RubricDetail == null)
        {
            submission.RubricDetail = new SubmissionRubric
            {
                Id = Guid.NewGuid(),
                StudentSubmissionId = submission.Id,
                AssemblyScore = request.AssemblyScore,
                AlgorithmExplainScore = request.AlgorithmExplainScore,
                TeamworkScore = request.TeamworkScore,
                TeacherNote = request.TeacherNote,
                VoiceMemoUrl = request.VoiceMemoUrl,
                VoiceMemoTranscript = request.VoiceMemoTranscript
            };
            await _context.SubmissionRubrics.AddAsync(submission.RubricDetail, ct);
        }
        else
        {
            submission.RubricDetail.AssemblyScore = request.AssemblyScore;
            submission.RubricDetail.AlgorithmExplainScore = request.AlgorithmExplainScore;
            submission.RubricDetail.TeamworkScore = request.TeamworkScore;
            submission.RubricDetail.TeacherNote = request.TeacherNote;
            submission.RubricDetail.VoiceMemoUrl = request.VoiceMemoUrl;
            submission.RubricDetail.VoiceMemoTranscript = request.VoiceMemoTranscript;
        }

        // Award XP to Student
        submission.Student.TotalXp += (int)(submission.TotalScore * 10);
        submission.Student.CurrentLevel = (submission.Student.TotalXp / 100) + 1;

        // Update or create EContactBook record
        if (submission.ClassSessionId.HasValue)
        {
            var contactBook = await _context.EContactBooks
                .FirstOrDefaultAsync(cb => cb.ClassSessionId == submission.ClassSessionId.Value && cb.StudentId == submission.StudentId, ct);

            if (contactBook != null)
            {
                contactBook.SummaryNote = $"Hoàn thành bài tập '{submission.Assignment.Title}' đạt {submission.TotalScore:F1}/10 điểm.";
                contactBook.TeacherVoiceMemoUrl = request.VoiceMemoUrl;
                contactBook.TeacherTranscript = request.VoiceMemoTranscript;
                contactBook.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync(ct);

        // Notify Student and Parent
        await _notificationService.SendMultiChannelNotificationAsync(
            submission.Student.UserId,
            NotificationType.GradePublished,
            "Kết quả bài thực hành STEM",
            $"Bạn đã đạt {submission.TotalScore:F1} điểm cho bài tập '{submission.Assignment.Title}'.",
            null,
            ct);

        return new SubmissionGradingResultDto
        {
            SubmissionId = submission.Id,
            AstAutoScore = submission.AstAutoScore,
            RubricScore = submission.RubricScore,
            TotalScore = submission.TotalScore,
            Status = submission.Status.ToString()
        };
    }

    public async Task<ClassPerformanceAnalyticsDto> GetClassPerformanceAnalyticsAsync(Guid classroomId, CancellationToken ct = default)
    {
        var classroom = await _context.Classrooms
            .AsNoTracking()
            .Include(c => c.Students)
            .FirstOrDefaultAsync(c => c.Id == classroomId, ct)
            ?? throw new KeyNotFoundException("Không tìm thấy lớp học.");

        var submissions = await _context.StudentSubmissions
            .AsNoTracking()
            .Include(s => s.RubricDetail)
            .Where(s => s.Assignment.ClassroomId == classroomId && s.Status == SubmissionStatus.Graded)
            .ToListAsync(ct);

        if (submissions.Count == 0)
        {
            return new ClassPerformanceAnalyticsDto
            {
                ClassroomId = classroomId,
                ClassName = classroom.Name,
                TotalStudents = classroom.Students.Count
            };
        }

        var scores = submissions.Select(s => s.TotalScore).ToList();
        var rubrics = submissions.Where(s => s.RubricDetail != null).Select(s => s.RubricDetail!).ToList();

        var buckets = new List<ScoreDistributionBucketDto>
        {
            new() { Range = "Dưới 5.0 (Cần phụ đạo)", Count = scores.Count(s => s < 5.0) },
            new() { Range = "5.0 - 6.9 (Trung bình)", Count = scores.Count(s => s >= 5.0 && s < 7.0) },
            new() { Range = "7.0 - 8.4 (Khá)", Count = scores.Count(s => s >= 7.0 && s < 8.5) },
            new() { Range = "8.5 - 10 (Giỏi & Xuất sắc)", Count = scores.Count(s => s >= 8.5) }
        };

        return new ClassPerformanceAnalyticsDto
        {
            ClassroomId = classroomId,
            ClassName = classroom.Name,
            TotalStudents = classroom.Students.Count,
            AverageScore = Math.Round(scores.Average(), 2),
            MinScore = Math.Round(scores.Min(), 2),
            MaxScore = Math.Round(scores.Max(), 2),
            AssemblyAverage = rubrics.Any() ? Math.Round(rubrics.Average(r => r.AssemblyScore), 2) : 0.0,
            AlgorithmAverage = rubrics.Any() ? Math.Round(rubrics.Average(r => r.AlgorithmExplainScore), 2) : 0.0,
            TeamworkAverage = rubrics.Any() ? Math.Round(rubrics.Average(r => r.TeamworkScore), 2) : 0.0,
            ScoreBuckets = buckets
        };
    }

    public async Task<bool> SyncWorkstationCheckInAsync(Guid classSessionId, Guid studentId, string workstationIp, CancellationToken ct = default)
    {
        var session = await _context.ClassSessions
            .Include(s => s.Classroom)
            .FirstOrDefaultAsync(s => s.Id == classSessionId, ct)
            ?? throw new KeyNotFoundException("Không tìm thấy buổi học.");

        var attendance = await _context.Attendances
            .FirstOrDefaultAsync(a => a.ClassSessionId == classSessionId && a.StudentId == studentId, ct);

        if (attendance == null)
        {
            attendance = new Attendance
            {
                Id = Guid.NewGuid(),
                ClassSessionId = classSessionId,
                StudentId = studentId,
                Status = AttendanceStatus.Present,
                Source = AttendanceSource.WorkstationAuto,
                CheckInTime = DateTime.UtcNow,
                WorkstationIp = workstationIp,
                Notes = $"Tự động check-in từ máy trạm IP: {workstationIp}"
            };
            await _context.Attendances.AddAsync(attendance, ct);
        }
        else
        {
            attendance.Status = AttendanceStatus.Present;
            attendance.Source = AttendanceSource.WorkstationAuto;
            attendance.CheckInTime = DateTime.UtcNow;
            attendance.WorkstationIp = workstationIp;
        }

        var student = await _context.Students.FirstOrDefaultAsync(s => s.Id == studentId, ct);
        if (student != null)
        {
            student.LastActiveAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync(ct);

        // Realtime broadcast to Teacher & Parent
        await _realtimeService.NotifyWorkstationCheckInAsync(session.ClassroomId, studentId, student?.FullName ?? "Học sinh", workstationIp, ct);

        return true;
    }
}
