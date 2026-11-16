using TekyLearningHub.Application.DTOs.Portal;

namespace TekyLearningHub.Application.Interfaces.Portal;

public interface IStudentClassesService
{
    Task<StudentClassesDto?> GetClassesAsync(int userId, CancellationToken cancellationToken);
    Task<StudentSessionDto?> GetSessionAsync(int userId, int sessionId, CancellationToken cancellationToken);
    Task<StudentProjectOutcome> SubmitProjectAsync(int userId, int sessionId, int assignmentId, string fileName,
        byte[] content, CancellationToken cancellationToken);
    Task<StudentProjectFile?> GetProjectFileAsync(int userId, int sessionId, int assignmentId,
        CancellationToken cancellationToken);
}
