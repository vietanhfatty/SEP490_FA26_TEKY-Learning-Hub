namespace TekyLearningHub.Application.DTOs.Portal;

public record ParentChildDto(int StudentId, string StudentCode, string FullName, string? Relationship,
    string? GradeLevel, string? SchoolName);
public record ParentEnrollmentDto(int ClassId, string ClassCode, string ClassName, int CourseId,
    string CourseName, string Status, decimal ProgressPercent, string? TeacherName);
public record ParentLessonDto(int CourseId, string CourseName, int LessonId, int OrderNo, string Title,
    DateTime? ViewedAt, DateTime? CompletedAt);
public record ParentAttendanceDto(int SessionId, string ClassCode, string Title, string Status, string? AbsenceReason,
    DateOnly Date, TimeOnly StartsAt, TimeOnly EndsAt);
public record ParentAssessmentRow(int AssessmentId, string Title, string ClassCode, DateTime SubmittedAt,
    int CorrectCount, string Snapshot);
public record ParentResultDto(string Type, int ItemId, string Title, string ClassCode, DateTimeOffset Date,
    decimal? Score, decimal? MaxScore, string? Status, string? Feedback);
public record ParentAssignmentDto(int AssignmentId, string Title, string ClassCode, DateTimeOffset? DueAt,
    string Status, DateTimeOffset? SubmittedAt);
public record ParentTeacherDto(int TeacherId, string FullName, string? Specialty, string? Bio);
public record ParentLearningDto(ParentChildDto Child, IReadOnlyList<ParentEnrollmentDto> Enrollments,
    IReadOnlyList<StudentCourseOverviewDto> Courses, IReadOnlyList<ParentLessonDto> Lessons,
    IReadOnlyList<ParentAttendanceDto> Attendance, int ScheduledAttendanceMinutes,
    IReadOnlyList<ParentAssignmentDto> Assignments, IReadOnlyList<ParentResultDto> Results,
    IReadOnlyList<StudentDeadlineDto> UpcomingAssignments, IReadOnlyList<StudentSessionDto> UpcomingSessions,
    IReadOnlyList<ParentTeacherDto> Teachers);
