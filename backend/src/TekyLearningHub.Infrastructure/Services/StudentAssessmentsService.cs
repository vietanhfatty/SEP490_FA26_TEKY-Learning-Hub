using System.Text.Json;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.DTOs.Student;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Infrastructure.Data;

namespace TekyLearningHub.Infrastructure.Services;

public sealed class StudentAssessmentsService(ApplicationDbContext db)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private sealed record Question(string Prompt, string[] Options, int? Correct, string? Explanation);
    private sealed record Paper
    {
        public required Assessment Assessment { get; init; }
        public required string ClassCode { get; init; }
        public required string CourseName { get; init; }
        public bool Active { get; init; }
        public AssessmentAttempt? Attempt { get; init; }
    }

    private IQueryable<Enrollment> Enrollments(int studentId) => db.Enrollments.Where(e =>
        e.StudentId == studentId && (e.Status == "Active" || e.Status == "Completed")
        && e.Student.User.Status == "Active"
        && e.Student.User.RoleAssignments.Any(r => r.RoleId == 1 && r.RevokedAt == null));

    private IQueryable<Paper> Papers(int studentId) =>
        from a in db.Assessments.AsNoTracking()
        where a.IsPublished && Enrollments(studentId).Any(e => e.ClassId == a.ClassId)
        join attempt in db.AssessmentAttempts.AsNoTracking().Where(x => x.StudentId == studentId)
            on a.AssessmentId equals attempt.AssessmentId into attempts
        from attempt in attempts.DefaultIfEmpty()
        select new Paper {
            Assessment = a, ClassCode = a.Class.ClassCode, CourseName = a.Class.Course.Name,
            Active = a.Class.Status != "Completed" && a.Class.Status != "Cancelled"
                && Enrollments(studentId).Any(e => e.ClassId == a.ClassId && e.Status == "Active"),
            Attempt = attempt
        };

    public async Task<StudentAssessmentSummary[]> List(int studentId, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var papers = await Papers(studentId).OrderBy(p => p.Assessment.ClosesAt == null)
            .ThenBy(p => p.Assessment.ClosesAt).ThenBy(p => p.Assessment.AssessmentId)
            .Select(p => new { p.Assessment.AssessmentId, p.Assessment.Title, p.ClassCode, p.CourseName, p.Active,
                p.Assessment.OpensAt, p.Assessment.ClosesAt,
                Started = p.Attempt != null, Submitted = p.Attempt != null && p.Attempt.SubmittedAt != null })
            .ToListAsync(ct);
        return papers.Select(p => new StudentAssessmentSummary(p.AssessmentId, p.Title, p.ClassCode, p.CourseName,
            Status(p.Active, p.OpensAt, p.ClosesAt, p.Started, p.Submitted, now), Utc(p.OpensAt), Utc(p.ClosesAt))).ToArray();
    }

    private Task<Paper?> Find(int studentId, int id, CancellationToken ct) =>
        Papers(studentId).Where(p => p.Assessment.AssessmentId == id).SingleOrDefaultAsync(ct);

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
        var attempt = new AssessmentAttempt {
            AttemptId = Guid.NewGuid(), StudentId = studentId, AssessmentId = id,
            StartedAt = now, QuestionsSnapshot = paper.Assessment.QuestionsJson
        };
        db.AssessmentAttempts.Add(attempt);
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 })
        {
            db.Entry(attempt).State = EntityState.Detached;
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
        var allowed = db.Assessments.Where(a => a.AssessmentId == id && a.IsPublished
            && (a.OpensAt == null || a.OpensAt <= submitted) && (a.ClosesAt == null || a.ClosesAt > submitted)
            && a.Class.Status != "Completed" && a.Class.Status != "Cancelled"
            && Enrollments(studentId).Any(e => e.ClassId == a.ClassId && e.Status == "Active"));
        var updated = await db.AssessmentAttempts.Where(a => a.AssessmentId == id && a.StudentId == studentId
                && a.SubmittedAt == null && allowed.Any())
            .ExecuteUpdateAsync(s => s.SetProperty(a => a.SubmittedAt, submitted)
                .SetProperty(a => a.CorrectCount, correct).SetProperty(a => a.AnswersJson, json), ct);
        var detail = await Detail(studentId, id, ct);
        return updated == 1 || detail?.Result != null || detail is null
            ? new(detail) : new(null, "Bài kiểm tra đã đóng hoặc quyền làm bài đã thay đổi.");
    }

    private static StudentAssessmentDetail Map(Paper p)
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

    private static string GetStatus(Paper p, DateTime now) => Status(p.Active, p.Assessment.OpensAt, p.Assessment.ClosesAt,
        p.Attempt is not null, p.Attempt?.SubmittedAt is not null, now);
    private static string Status(bool active, DateTime? opens, DateTime? closes, bool started, bool submitted, DateTime now) =>
        submitted ? "Submitted" : !active || closes <= now ? "Closed" : opens > now ? "Upcoming" : started ? "InProgress" : "Available";
    private static DateTimeOffset? Utc(DateTime? value) =>
        value is { } date ? new DateTimeOffset(DateTime.SpecifyKind(date, DateTimeKind.Utc)) : null;
}
