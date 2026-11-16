using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Application.Interfaces.Portal;
using System.Text.Json;
using TekyLearningHub.Application.DTOs.Portal;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.Services.Portal;

public sealed class StudentAssessmentsService(IStudentAssessmentsRepository db, IUnitOfWork unit) : IStudentAssessmentsService
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private sealed record Question(string Prompt, string[] Options, int? Correct, string? Explanation);
    public async Task<StudentAssessmentSummary[]> List(int studentId, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var papers = await db.List(studentId, ct);
        return papers.Select(p => new StudentAssessmentSummary(p.Assessment.AssessmentId, p.Assessment.Title, p.ClassCode, p.CourseName,
            GetStatus(p, now), Utc(p.Assessment.OpensAt), Utc(p.Assessment.ClosesAt))).ToArray();
    }

    private Task<AssessmentPaper?> Find(int studentId, int id, CancellationToken ct) => db.Find(studentId, id, ct);

    public async Task<StudentAssessmentDetail?> Detail(int studentId, int id, CancellationToken ct) =>
        await Find(studentId, id, ct) is { } paper ? Map(paper) : null;

    public async Task<StudentAssessmentOutcome> Start(int studentId, int id, CancellationToken ct)
    {
        var paper = await Find(studentId, id, ct);
        if (paper is null) return new(null);
        var now = DateTime.UtcNow;
        if (paper.Attempt?.SubmittedAt is not null) return new(Map(paper));
        if (GetStatus(paper, now) is not ("Available" or "InProgress"))
            return new(null, "Bài kiểm tra chưa mở hoặc đã đóng.");
        if (paper.Attempt is not null) return new(Map(paper));
        if (ReadQuestions(paper.Assessment.QuestionsJson) is null)
            return new(null, "Đề kiểm tra chưa đầy đủ. Em hãy báo giáo viên.");
        var attempt = new AssessmentAttempt
        {
            AttemptId = Guid.NewGuid(),
            StudentId = studentId,
            AssessmentId = id,
            StartedAt = now,
            QuestionsSnapshot = paper.Assessment.QuestionsJson
        };
        db.Add(attempt);
        try { await unit.SaveChangesAsync(ct); }
        catch (PersistenceConflictException ex) when (ex.Duplicate)
        {
            db.Detach(attempt);
            return new(await Detail(studentId, id, ct));
        }
        return new(Map(paper with { Attempt = attempt }));
    }

    public async Task<StudentAssessmentOutcome> Submit(int studentId, int id, int[]? answers, CancellationToken ct)
    {
        var paper = await Find(studentId, id, ct);
        if (paper is null) return new(null);
        if (paper.Attempt?.SubmittedAt is not null) return new(Map(paper));
        if (paper.Attempt is null || GetStatus(paper, DateTime.UtcNow) != "InProgress")
            return new(null, "Em cần bắt đầu bài kiểm tra và nộp trước khi bài đóng.");
        var questions = ReadQuestions(paper.Attempt.QuestionsSnapshot);
        if (questions is null) return new(null, "Đề kiểm tra chưa đầy đủ. Em hãy báo giáo viên.");
        if (answers is null || answers.Length != questions.Length ||
            questions.Where((q, i) => answers[i] < 0 || answers[i] >= q.Options.Length).Any())
            return new(null, "Hãy chọn một đáp án hợp lệ cho mỗi câu hỏi.", Invalid: true);
        var correct = questions.Where((q, i) => q.Correct == answers[i]).Count();
        var json = JsonSerializer.Serialize(answers, Json);
        var submitted = DateTime.UtcNow;
        var updated = await db.Submit(studentId, id, submitted, correct, json, ct);
        var detail = await Detail(studentId, id, ct);
        return updated == 1 || detail?.Result != null || detail is null
            ? new(detail) : new(null, "Bài kiểm tra đã đóng hoặc quyền làm bài đã thay đổi.");
    }

    private static StudentAssessmentDetail Map(AssessmentPaper p)
    {
        var a = p.Assessment;
        var attempt = p.Attempt;
        var status = GetStatus(p, DateTime.UtcNow);
        var questions = ReadQuestions(attempt?.QuestionsSnapshot ?? a.QuestionsJson) ?? [];
        var summary = new StudentAssessmentSummary(a.AssessmentId, a.Title, p.ClassCode, p.CourseName,
            status, Utc(a.OpensAt), Utc(a.ClosesAt));
        var work = status == "InProgress" && attempt is not null && questions.Length > 0
            ? new StudentAssessmentWork(attempt.AttemptId, questions.Select(q => new StudentAssessmentQuestion(q.Prompt, q.Options)).ToArray()) : null;
        StudentAssessmentResult? result = null;
        if (attempt?.SubmittedAt is { } date && attempt.CorrectCount is { } count && questions.Length > 0)
        {
            StudentAssessmentReview[]? review = null;
            if (a.AllowAnswerReview && attempt.AnswersJson is { } json)
            {
                var choices = JsonSerializer.Deserialize<int[]>(json, Json);
                if (choices?.Length == questions.Length)
                    review = questions.Select((q, i) => new StudentAssessmentReview(q.Prompt, q.Options, choices[i], q.Correct!.Value, q.Explanation)).ToArray();
            }
            result = new(count, questions.Length, Math.Round(count * 10m / questions.Length, 2, MidpointRounding.AwayFromZero),
                Utc(date)!.Value, review);
        }
        return new(summary, a.Instructions, questions.Length, work, result);
    }

    private static Question[]? ReadQuestions(string json)
    {
        try
        {
            var questions = JsonSerializer.Deserialize<Question[]>(json, Json);
            return questions is { Length: > 0 and <= 50 } && questions.All(q => q is not null &&
                !string.IsNullOrWhiteSpace(q.Prompt) && q.Options is { Length: >= 2 and <= 8 } &&
                q.Options.All(o => !string.IsNullOrWhiteSpace(o)) &&
                q.Correct is int correct && correct >= 0 && correct < q.Options.Length) ? questions : null;
        }
        catch (JsonException) { return null; }
    }

    private static string GetStatus(AssessmentPaper p, DateTime now) => Status(p.Active, p.Assessment.OpensAt, p.Assessment.ClosesAt,
        p.Attempt is not null, p.Attempt?.SubmittedAt is not null, now);
    private static string Status(bool active, DateTime? opens, DateTime? closes, bool started, bool submitted, DateTime now) =>
        submitted ? "Submitted" : !active || closes <= now ? "Closed" : opens > now ? "Upcoming" : started ? "InProgress" : "Available";
    private static DateTimeOffset? Utc(DateTime? value) =>
        value is { } date ? new DateTimeOffset(DateTime.SpecifyKind(date, DateTimeKind.Utc)) : null;
}
