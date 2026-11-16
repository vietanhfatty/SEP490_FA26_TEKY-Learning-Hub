namespace TekyLearningHub.Application.DTOs.Backoffice;
public record ProjectReviewDto(int AssignmentId, int StudentId, int AttemptNo, string FileName, DateTime SubmittedAt, string ReviewStatus, string? Feedback, string StudentName, string AssignmentTitle, string ClassCode);
