using TekyLearningHub.Application.Interfaces.Portal;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Infrastructure.Data;

namespace TekyLearningHub.Infrastructure.Repositories.Portal;

/// <summary>Adapter ghi thông báo. Lưu bản ghi; phát realtime do adapter realtime đảm nhiệm.</summary>
public sealed class NotificationRepository(ApplicationDbContext db) : INotificationRepository
{
    public void AddNotification(Notification notification) => db.Notifications.Add(notification);
}
