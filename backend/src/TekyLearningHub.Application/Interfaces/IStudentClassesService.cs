using TekyLearningHub.Application.DTOs.Student;

namespace TekyLearningHub.Application.Interfaces;

public interface IStudentClassesService
{
    Task<StudentClassesDto?> GetClassesAsync(int userId, CancellationToken cancellationToken);
    Task<StudentSessionDto?> GetSessionAsync(int userId, int sessionId, CancellationToken cancellationToken);
}
