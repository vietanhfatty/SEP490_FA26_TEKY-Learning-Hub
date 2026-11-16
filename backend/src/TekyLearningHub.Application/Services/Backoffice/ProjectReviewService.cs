using TekyLearningHub.Application.Common;
using TekyLearningHub.Application.DTOs.Backoffice;
using TekyLearningHub.Application.DTOs.Portal;
using TekyLearningHub.Application.Interfaces.Backoffice;

namespace TekyLearningHub.Application.Services.Backoffice;

public sealed class ProjectReviewService(IProjectReviewRepository repository) : IProjectReviewService
{
    public Task<List<ProjectReviewDto>> Reviews(int teacherId, CancellationToken ct) => repository.Reviews(teacherId, ct);
    public async Task<StudentProjectFile?> ReviewFile(int teacherId, int assignmentId, int studentId, CancellationToken ct)
    {
        var file = await repository.ReviewFile(teacherId, assignmentId, studentId, ct);
        return file is null ? null : new(file.FileName, file.Content);
    }
    public Task<bool> SubmitReview(int teacherId, int assignmentId, int studentId, int attemptNo, string status, string feedback, CancellationToken ct)
    {
        if (status is not ("NeedsRevision" or "Passed") || attemptNo < 1 || string.IsNullOrWhiteSpace(feedback) || feedback.Length > 2000)
            throw new UseCaseException(400, "Chọn kết quả và nhập phản hồi từ 1 đến 2000 ký tự.");
        return repository.SubmitReview(teacherId, assignmentId, studentId, attemptNo, status, feedback.Trim(), ct);
    }
}
