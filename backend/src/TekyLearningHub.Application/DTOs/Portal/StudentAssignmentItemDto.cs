namespace TekyLearningHub.Application.DTOs.Portal;

public record StudentAssignmentItemDto(StudentAssignmentDto Assignment, int ClassId, string ClassCode,
    string ClassName, int CourseId, string CourseName, int? LessonId, string? LessonTitle, int? SessionId);

public record StudentAssignmentDetailDto(StudentAssignmentItemDto Item, IReadOnlyList<StudentProjectDto> History);

public record StudentCodeSubmissionDto(int AttemptNo, DateTimeOffset SubmittedAt,
    bool IsFinalized, decimal? Score, decimal MaxScore, string? Feedback);
