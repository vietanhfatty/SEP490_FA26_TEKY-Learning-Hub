using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.Interfaces.Portal;

/// <summary>Cổng ghi thông báo của hệ thống. Adapter realtime phát tín hiệu sau khi lưu.</summary>
public interface INotificationRepository
{
    void AddNotification(Notification notification);
}
