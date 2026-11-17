using System.Text.Json;
using TekyLearningHub.Application.DTOs.Portal;
using TekyLearningHub.Application.Interfaces.Portal;

namespace TekyLearningHub.Application.Services.Portal;

public sealed class ParentLearningService(IParentLearningRepository repository, IStudentClassesService classes,
    IStudentOverviewService overview) : IParentLearningService
{
    public Task<IReadOnlyList<ParentChildDto>> Children(int parentId, CancellationToken ct) =>
        repository.Children(parentId, ct);

    public async Task<ParentLearningDto?> Learning(int parentId, int studentId, CancellationToken ct)
    {
        var child = (await Children(parentId, ct)).SingleOrDefault(c => c.StudentId == studentId);
        if (child is null) return null;

        var enrollment = await classes.GetClassesAsync(studentId, ct);
        if (enrollment is null) return null;
        var dashboard = await overview.Overview(studentId, ct);
        if (dashboard is null) return null;

        var assignments = await classes.GetAssignmentsAsync(studentId, ct) ?? [];
        var lessons = await repository.Lessons(studentId, ct);
        var attendance = await repository.Attendance(studentId, ct);
        var attempts = await repository.Assessments(studentId, ct);
        var teachers = await repository.Teachers(studentId, ct);

        // Recheck after the separate read queries in case the link was revoked during the request.
        if (!(await Children(parentId, ct)).Any(c => c.StudentId == studentId)) return null;

        var courses = enrollment.Classes.GroupBy(c => c.CourseId).Select(group =>
        {
            var course = group.First();
            var units = lessons.Where(l => l.CourseId == course.CourseId).ToArray();
            return new StudentCourseOverviewDto(course.CourseId, course.CourseCode, course.CourseName,
                units.Length, units.Count(l => l.CompletedAt.HasValue));
        }).OrderBy(c => c.Name).ToArray();
        var results = new List<ParentResultDto>();
        foreach (var item in assignments)
        {
            var assignment = item.Assignment;
            if (assignment.Submission is { } file && (file.ReviewStatus != "Pending" || file.Feedback is not null))
                results.Add(new("Project", assignment.AssignmentId, assignment.Title, item.ClassCode,
                    file.ReviewedAt ?? file.SubmittedAt, null, null, file.ReviewStatus, file.Feedback));
            if (assignment.CodeSubmission is { IsFinalized: true } code)
                results.Add(new("Assignment", assignment.AssignmentId, assignment.Title, item.ClassCode,
                    code.SubmittedAt, code.Score, code.MaxScore, null, code.Feedback));
        }
        foreach (var attempt in attempts)
        {
            using var definition = JsonDocument.Parse(attempt.Snapshot);
            if (definition.RootElement.ValueKind != JsonValueKind.Array) continue;
            var count = definition.RootElement.GetArrayLength();
            if (count == 0) continue;
            var score = Math.Round(attempt.CorrectCount * 10m / count, 2, MidpointRounding.AwayFromZero);
            results.Add(new("Assessment", attempt.AssessmentId, attempt.Title, attempt.ClassCode,
                new(DateTime.SpecifyKind(attempt.SubmittedAt, DateTimeKind.Utc)), score, 10, null, null));
        }
        var minutes = attendance.Where(row => row.Status is "Present" or "Late")
            .Sum(row => (int)(row.EndsAt - row.StartsAt).TotalMinutes);
        return new(child, enrollment.Classes.Select(c => new ParentEnrollmentDto(c.ClassId, c.ClassCode, c.Name,
                c.CourseId, c.CourseName, c.EnrollmentStatus, c.ProgressPercent, c.TeacherName)).ToArray(),
            courses, lessons, attendance, minutes, assignments.Select(MapAssignment).ToArray(),
            results.OrderByDescending(r => r.Date).ToArray(), dashboard.UpcomingAssignments, dashboard.UpcomingSessions, teachers);
    }

    private static ParentAssignmentDto MapAssignment(StudentAssignmentItemDto item)
    {
        var a = item.Assignment;
        var status = a.CodeSubmission is { } code ? (code.IsFinalized ? "Graded" : "Pending")
            : a.Submission?.ReviewStatus ?? (a.CanSubmit ? "Todo" : "Closed");
        return new(a.AssignmentId, a.Title, item.ClassCode, a.DueAt, status,
            a.Submission?.SubmittedAt ?? a.CodeSubmission?.SubmittedAt);
    }
}
