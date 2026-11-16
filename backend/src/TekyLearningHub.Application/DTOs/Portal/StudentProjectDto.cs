namespace TekyLearningHub.Application.DTOs.Portal;

public record StudentAssignmentDto(int AssignmentId, string Title, string? Instructions, DateTimeOffset? DueAt,
    bool CanSubmit, StudentProjectDto? Submission, StudentCodeSubmissionDto? CodeSubmission = null);

public record StudentProjectDto(string FileName, DateTimeOffset SubmittedAt, int AttemptNo = 1,
    string ReviewStatus = "Pending", string? Feedback = null, DateTimeOffset? ReviewedAt = null);
public record StudentProjectFile(string FileName, byte[] Content);
public record StudentProjectOutcome(StudentProjectResult Result, StudentProjectDto? Submission = null);

public enum StudentProjectResult
{
    Submitted,
    NotFound,
    Closed,
    AlreadySubmitted
}
