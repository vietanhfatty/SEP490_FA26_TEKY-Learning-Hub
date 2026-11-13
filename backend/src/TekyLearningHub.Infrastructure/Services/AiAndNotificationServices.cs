using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Infrastructure.Hubs;

namespace TekyLearningHub.Infrastructure.Services;

public class AiAssistantService : IAiAssistantService
{
    private readonly IApplicationDbContext _context;

    public AiAssistantService(IApplicationDbContext context)
    {
        _context = context;
    }

    public Task<GeneratedMapResultDto> GenerateStemMapAndQuestAsync(string teacherPrompt, CancellationToken cancellationToken = default)
    {
        var cleanPrompt = string.IsNullOrWhiteSpace(teacherPrompt) ? "Thử thách lập trình xe robot vượt mê cung cơ bản" : teacherPrompt;

        var result = new GeneratedMapResultDto
        {
            Name = $"Sa bàn AI: {cleanPrompt}",
            Theme = "SpaceMission",
            LayoutJson = "{\"gridWidth\":12,\"gridHeight\":12,\"obstacles\":[{\"x\":3,\"y\":4},{\"x\":7,\"y\":8}]}",
            StartX = 1,
            StartY = 1,
            Checkpoints = new List<GeneratedCheckpointDto>
            {
                new() { SeqNo = 1, X = 3, Y = 5, UnlockMessage = "Trạm 1: Khởi động cảm biến siêu âm thành công!", IsFinish = false },
                new() { SeqNo = 2, X = 7, Y = 9, UnlockMessage = "Trạm 2: Vượt chướng ngại vật ma trận!", IsFinish = false },
                new() { SeqNo = 3, X = 11, Y = 11, UnlockMessage = "Vạch đích: Chúc mừng bạn đã hoàn thành xuất sắc!", IsFinish = true }
            },
            MasterBlocklyXml = "<xml><block type=\"robot_start\"><next><block type=\"robot_move_forward\"><field name=\"STEPS\">5</field><next><block type=\"robot_turn_right\"></block></next></block></next></block></xml>"
        };

        return Task.FromResult(result);
    }

    public async Task<string> GenerateParentAudioDigestTextAsync(int sessionId, int studentId, CancellationToken cancellationToken = default)
    {
        var session = await _context.ClassSessions
            .AsNoTracking()
            .Include(s => s.Class)
            .FirstOrDefaultAsync(s => s.SessionId == sessionId, cancellationToken);

        var student = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.UserId == studentId, cancellationToken);

        var grade = await _context.Grades
            .AsNoTracking()
            .Include(g => g.Submission)
            .Where(g => g.Submission.StudentId == studentId && g.Submission.Assignment.ClassId == (session != null ? session.ClassId : 0))
            .OrderByDescending(g => g.FinalizedAt)
            .FirstOrDefaultAsync(cancellationToken);

        var studentName = student?.FullName ?? "con";
        var className = session?.Class.Name ?? "lớp STEM";
        var score = grade?.FinalScore ?? 9.0m;

        return $"Chào phụ huynh của {studentName}! Hôm nay tại {className}, {studentName} đã học tập rất tích cực. " +
               $"Con đã hoàn thành thử thách lập trình sa bàn thực hành với số điểm ấn tượng {score:F1}/10. " +
               $"Giáo viên đánh giá cao khả năng tư duy thuật toán và sự sáng tạo của con. Cảm ơn bố mẹ đã luôn đồng hành cùng TEKY!";
    }
}

public class NotificationService : INotificationService
{
    private readonly IApplicationDbContext _context;
    private readonly IHubContext<NotificationHub> _notificationHub;

    public NotificationService(IApplicationDbContext context, IHubContext<NotificationHub> notificationHub)
    {
        _context = context;
        _notificationHub = notificationHub;
    }

    public async Task SendNotificationAsync(int recipientUserId, string type, string title, string body, string? refType = null, long? refId = null, CancellationToken cancellationToken = default)
    {
        var notification = new Notification
        {
            RecipientId = recipientUserId,
            Type = type,
            Title = title,
            Body = body,
            RefType = refType,
            RefId = refId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        await _context.Notifications.AddAsync(notification, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        await _notificationHub.Clients.Group($"user_{recipientUserId}").SendAsync("OnNotificationReceived", new
        {
            notification.NotificationId,
            notification.Type,
            notification.Title,
            notification.Body,
            notification.RefType,
            notification.RefId,
            notification.CreatedAt
        }, cancellationToken);
    }
}
