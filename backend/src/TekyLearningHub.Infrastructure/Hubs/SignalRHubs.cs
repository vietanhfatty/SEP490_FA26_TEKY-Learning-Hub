using Microsoft.AspNetCore.SignalR;
using TekyLearningHub.Domain.Enums;

namespace TekyLearningHub.Infrastructure.Hubs;

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

public class NotificationHub : Hub
{
    public async Task JoinUserNotifications(string userId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
    }
}
