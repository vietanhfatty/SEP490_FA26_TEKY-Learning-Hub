namespace TekyLearningHub.Application.Interfaces.Backoffice;

public interface ITeacherAccessReader
{
    Task<bool> CanAccess(int teacherId, string resource, long id, CancellationToken ct);
    Task<bool> Enrolled(int sessionId, int studentId, CancellationToken ct);
}
