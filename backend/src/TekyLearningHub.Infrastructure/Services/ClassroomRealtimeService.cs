using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Infrastructure.Hubs;

namespace TekyLearningHub.Infrastructure.Services;

public class ClassroomRealtimeService : IClassroomRealtimeService
{
    private readonly IHubContext<ClassroomHub> _classroomHub;
    private readonly IHubContext<CheerHub> _cheerHub;

    public ClassroomRealtimeService(
        IHubContext<ClassroomHub> classroomHub,
        IHubContext<CheerHub> cheerHub)
    {
        _classroomHub = classroomHub;
        _cheerHub = cheerHub;
    }

    public async Task BroadcastFocusModeLockAsync(int classId, bool isLocked, string? message, CancellationToken cancellationToken = default)
    {
        await _classroomHub.Clients.Group($"class_{classId}").SendAsync("OnFocusModeChanged", new
        {
            IsLocked = isLocked,
            Message = message ?? (isLocked ? "Giáo viên đang khóa màn hình để giảng bài." : "Màn hình đã được mở lại."),
            Timestamp = DateTime.UtcNow
        }, cancellationToken);
    }

    public async Task BroadcastSpotlightAsync(int classId, int studentId, string studentName, string screenPayload, CancellationToken cancellationToken = default)
    {
        await _classroomHub.Clients.Group($"class_{classId}").SendAsync("OnScreenSpotlight", new
        {
            StudentId = studentId,
            StudentName = studentName,
            ScreenPayload = screenPayload,
            Timestamp = DateTime.UtcNow
        }, cancellationToken);
    }

    public async Task NotifyWorkstationCheckInAsync(int classId, int studentId, string studentName, string workstationIp, CancellationToken cancellationToken = default)
    {
        await _classroomHub.Clients.Group($"class_{classId}").SendAsync("OnWorkstationCheckIn", new
        {
            StudentId = studentId,
            StudentName = studentName,
            WorkstationIp = workstationIp,
            CheckInTime = DateTime.UtcNow
        }, cancellationToken);
    }

    public async Task SendCheerConfettiAsync(int classId, int studentId, string stickerCode, string message, CancellationToken cancellationToken = default)
    {
        await _cheerHub.Clients.Group($"student_{studentId}").SendAsync("OnCheerConfettiExplosion", new
        {
            StudentId = studentId,
            Sticker = stickerCode,
            Message = message,
            TriggerConfetti = true,
            Timestamp = DateTime.UtcNow
        }, cancellationToken);

        await _classroomHub.Clients.Group($"class_{classId}").SendAsync("OnStudentCheered", new
        {
            StudentId = studentId,
            Sticker = stickerCode,
            Timestamp = DateTime.UtcNow
        }, cancellationToken);
    }
}
