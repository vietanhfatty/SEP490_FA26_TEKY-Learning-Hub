using System.Threading;
using System.Threading.Tasks;

namespace TekyLearningHub.Application.Interfaces.Portal;

/// <summary>Cổng gửi thông báo tới người dùng. Adapter lưu bản ghi rồi phát realtime.</summary>
public interface INotificationService
{
    Task SendNotificationAsync(int recipientUserId, string type, string title, string body, string? refType = null, long? refId = null, CancellationToken cancellationToken = default);
}
