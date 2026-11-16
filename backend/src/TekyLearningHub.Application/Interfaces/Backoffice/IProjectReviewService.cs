using TekyLearningHub.Application.DTOs.Backoffice;
using TekyLearningHub.Application.DTOs.Portal;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.Interfaces.Backoffice;

public interface IProjectReviewService
{
    Task<List<ProjectReviewDto>> Reviews(int teacherId, CancellationToken ct);
    Task<StudentProjectFile?> ReviewFile(int teacherId, int assignmentId, int studentId, CancellationToken ct);
    Task<bool> SubmitReview(int teacherId, int assignmentId, int studentId, int attemptNo, string status, string feedback, CancellationToken ct);
}
public interface IProjectReviewRepository
{
    Task<List<ProjectReviewDto>> Reviews(int teacherId, CancellationToken ct);
    Task<StudentProjectSubmission?> ReviewFile(int teacherId, int assignmentId, int studentId, CancellationToken ct);
    Task<bool> SubmitReview(int teacherId, int assignmentId, int studentId, int attemptNo, string status, string feedback, CancellationToken ct);
}
