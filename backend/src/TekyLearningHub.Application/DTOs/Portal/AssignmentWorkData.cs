using TekyLearningHub.Application.DTOs.Portal;

namespace TekyLearningHub.Application.DTOs.Portal;

public record StudentIdentity(int UserId, string StudentCode, string FullName);
public record AssignmentWorkData(int AssignmentId, string Title, string? Instructions, DateTime? DueAt, string Status, string? FileName, DateTime? SubmittedAt, int AttemptNo, string? ReviewStatus, string? Feedback, DateTime? ReviewedAt);
