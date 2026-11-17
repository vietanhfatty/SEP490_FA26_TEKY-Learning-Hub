using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace TekyLearningHub.Infrastructure.Hubs;

/// <summary>
/// SCR-TEA-02 & SCR-TEA-03: Hub thời gian thực điều phối phòng Lab (Focus Mode, Spotlight, Workstation Check-in)
/// </summary>
public class ClassroomHub : Hub
{
    public async Task JoinClassroom(string classId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"class_{classId}");
    }

    public async Task LeaveClassroom(string classId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"class_{classId}");
    }

    public async Task SendLiveSpotlight(string classId, string studentName, string screenPayload)
    {
        await Clients.Group($"class_{classId}").SendAsync("OnScreenSpotlight", new
        {
            StudentName = studentName,
            ScreenPayload = screenPayload,
            Timestamp = DateTime.UtcNow
        });
    }
}

/// <summary>
/// SCR-PAR-04: Hub thời gian thực truyền tín hiệu cổ vũ & pháo hoa Confetti từ Phụ huynh tới Máy trạm của con
/// </summary>
public class CheerHub : Hub
{
    public async Task JoinStudentChannel(string studentId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"student_{studentId}");
    }

    public async Task SendCheer(string studentId, string stickerName, string message)
    {
        await Clients.Group($"student_{studentId}").SendAsync("OnCheerReceived", new
        {
            Sticker = stickerName,
            Message = message,
            Timestamp = DateTime.UtcNow
        });
    }
}

/// <summary>
/// SERVICE-04: Hub điều phối thông báo thời gian thực cho toàn hệ thống
/// </summary>
public class NotificationHub : Hub
{
    public async Task JoinUserNotifications(string userId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
    }
}
