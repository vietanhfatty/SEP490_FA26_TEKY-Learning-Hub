using System.Threading;
using System.Threading.Tasks;

namespace TekyLearningHub.Application.Interfaces.Backoffice;

/// <summary>
/// Cổng thời gian thực của phòng Lab. Adapter SignalR hiện thực; Application chỉ biết ý nghĩa nghiệp vụ.
/// </summary>
public interface IClassroomRealtimeService
{
    Task BroadcastFocusModeLockAsync(int classId, bool isLocked, string? message, CancellationToken cancellationToken = default);
    Task BroadcastSpotlightAsync(int classId, int studentId, string studentName, string screenPayload, CancellationToken cancellationToken = default);
    Task NotifyWorkstationCheckInAsync(int classId, int studentId, string studentName, string workstationIp, CancellationToken cancellationToken = default);
    Task SendCheerConfettiAsync(int classId, int studentId, string stickerCode, string message, CancellationToken cancellationToken = default);
}
