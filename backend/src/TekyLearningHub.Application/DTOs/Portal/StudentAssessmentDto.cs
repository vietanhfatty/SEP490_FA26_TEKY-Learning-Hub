namespace TekyLearningHub.Application.DTOs.Portal;

public record StudentAssessmentSummary(int AssessmentId, string Title, string ClassCode, string CourseName,
    string Status, DateTimeOffset? OpensAt, DateTimeOffset? ClosesAt);
public record StudentAssessmentQuestion(string Prompt, string[] Options);
public record StudentAssessmentWork(Guid AttemptId, StudentAssessmentQuestion[] Questions);
public record StudentAssessmentReview(string Prompt, string[] Options, int Selected, int Correct, string? Explanation);
public record StudentAssessmentResult(int CorrectCount, int TotalQuestions, decimal Score,
    DateTimeOffset SubmittedAt, StudentAssessmentReview[]? Review);
public record StudentAssessmentDetail(StudentAssessmentSummary Assessment, string? Instructions,
    int QuestionCount, StudentAssessmentWork? Work, StudentAssessmentResult? Result);
public record StudentAssessmentSubmission(int[] Answers);
public record StudentAssessmentOutcome(StudentAssessmentDetail? Detail, string? Error = null, bool Invalid = false);
