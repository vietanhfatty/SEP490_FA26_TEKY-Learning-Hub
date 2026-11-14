namespace TekyLearningHub.Application.DTOs.Student;

public record StudentAssignmentDto(int AssignmentId, string Title, string? Instructions, DateTimeOffset? DueAt,
    bool CanSubmit, StudentProjectDto? Submission);

public record StudentProjectDto(string FileName, DateTimeOffset SubmittedAt);
public record StudentProjectFile(string FileName, byte[] Content);
public record StudentProjectOutcome(StudentProjectResult Result, StudentProjectDto? Submission = null);

public enum StudentProjectResult
{
    Submitted,
    NotFound,
    Closed,
    AlreadySubmitted
}
