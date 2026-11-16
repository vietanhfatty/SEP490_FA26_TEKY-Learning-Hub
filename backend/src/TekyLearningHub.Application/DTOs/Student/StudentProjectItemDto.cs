namespace TekyLearningHub.Application.DTOs.Student;

public record StudentProjectItemDto(int AssignmentId, string Title, string ClassCode, string CourseName,
    DateTimeOffset SubmittedAt, int AttemptNo, string ReviewStatus, string? FileName,
    string? Feedback, string? Summary = null, decimal? Score = null, decimal? MaxScore = null);
