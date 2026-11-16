using TekyLearningHub.Application.DTOs.Student;

namespace TekyLearningHub.Application.Interfaces;

public interface IStudentClassesService
{
    Task<StudentClassesDto?> GetClassesAsync(int userId, CancellationToken cancellationToken);
    Task<StudentSessionDto?> GetSessionAsync(int userId, int sessionId, CancellationToken cancellationToken);
    Task<IReadOnlyList<StudentAssignmentItemDto>?> GetAssignmentsAsync(int userId, CancellationToken cancellationToken);
    Task<StudentAssignmentDetailDto?> GetAssignmentAsync(int userId, int assignmentId, CancellationToken cancellationToken);
    Task<IReadOnlyList<StudentProjectItemDto>?> GetProjectsAsync(int userId, CancellationToken cancellationToken);
    Task<StudentProjectOutcome> SubmitProjectAsync(int userId, int? sessionId, int assignmentId, string fileName,
        byte[] content, CancellationToken cancellationToken);
    Task<StudentProjectFile?> GetProjectFileAsync(int userId, int? sessionId, int assignmentId,
        CancellationToken cancellationToken);
}
