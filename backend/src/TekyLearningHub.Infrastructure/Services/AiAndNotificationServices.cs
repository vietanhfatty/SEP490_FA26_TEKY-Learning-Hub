using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Application.Interfaces.Backoffice;
using TekyLearningHub.Application.Interfaces.Portal;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Infrastructure.Hubs;

namespace TekyLearningHub.Infrastructure.Services;

/// <summary>Trợ lý sinh sa bàn và bản tin âm thanh. Đọc dữ liệu qua cổng repository.</summary>
public class AiAssistantService(IParentRepository parentRepository) : IAiAssistantService
{
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
        var data = await parentRepository.DigestData(sessionId, studentId, cancellationToken);

        var studentName = data?.StudentName ?? "con";
        var className = data?.ClassName ?? "lớp STEM";
        var score = data?.FinalScore ?? 9.0m;

        return $"Chào phụ huynh của {studentName}! Hôm nay tại {className}, {studentName} đã học tập rất tích cực. " +
               $"Con đã hoàn thành thử thách lập trình sa bàn thực hành với số điểm ấn tượng {score:F1}/10. " +
               $"Giáo viên đánh giá cao khả năng tư duy thuật toán và sự sáng tạo của con. Cảm ơn bố mẹ đã luôn đồng hành cùng TEKY!";
    }
}

/// <summary>Lưu thông báo rồi phát tín hiệu realtime tới người nhận.</summary>
public class NotificationService(
    INotificationRepository repository,
    IUnitOfWork unit,
    IHubContext<NotificationHub> notificationHub) : INotificationService
{
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

        repository.AddNotification(notification);
        await unit.SaveChangesAsync(cancellationToken);

        await notificationHub.Clients.Group($"user_{recipientUserId}").SendAsync("OnNotificationReceived", new
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
