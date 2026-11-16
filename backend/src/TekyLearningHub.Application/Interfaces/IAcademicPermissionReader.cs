namespace TekyLearningHub.Application.Interfaces;

public interface IAcademicPermissionReader
{
    Task<bool> HasPermissionAsync(int userId, string permission, int? departmentId, CancellationToken ct = default);
    Task<bool> CanEditAsync(int userId, long contentId, CancellationToken ct = default);
}
