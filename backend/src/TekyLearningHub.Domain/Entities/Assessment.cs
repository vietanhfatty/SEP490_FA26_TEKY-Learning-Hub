namespace TekyLearningHub.Domain.Entities;

public sealed class Assessment
{
    public int AssessmentId { get; set; }
    public int ClassId { get; set; }
    public string Code { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string? Instructions { get; set; }
    public bool IsPublished { get; set; }
    public bool AllowAnswerReview { get; set; }
    public DateTime? OpensAt { get; set; }
    public DateTime? ClosesAt { get; set; }
    public string QuestionsJson { get; set; } = null!;
    public Class Class { get; set; } = null!;
}

public sealed class AssessmentAttempt
{
    public Guid AttemptId { get; set; }
    public int AssessmentId { get; set; }
    public int StudentId { get; set; }
    public DateTime StartedAt { get; set; }
    public string QuestionsSnapshot { get; set; } = null!;
    public DateTime? SubmittedAt { get; set; }
    public string? AnswersJson { get; set; }
    public int? CorrectCount { get; set; }
}
