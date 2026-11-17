namespace TekyLearningHub.Application.DTOs.Portal;

public record ParentCourseDto(int CourseId, string CourseCode, string Name, string? Description, string? LevelCode,
    int? TuitionVnd, int LessonCount, int OpenClassCount);
public record ParentCourseLessonDto(int LessonId, int OrderNo, string Title);
public record ParentCourseSessionDto(int SessionId, string Title, DateOnly Date, TimeOnly StartsAt, TimeOnly EndsAt);
public record ParentClassOfferDto(int ClassId, string ClassCode, string Name, string Status, DateOnly? StartDate,
    DateOnly? EndDate, string? TeacherName, DateOnly? NextDate, TimeOnly? StartsAt, TimeOnly? EndsAt, IReadOnlyList<ParentCourseSessionDto> Schedule);
public record ParentCourseDetailDto(ParentCourseDto Course, string? LearningObjectives,
    IReadOnlyList<ParentCourseLessonDto> Lessons, IReadOnlyList<ParentClassOfferDto> Classes);
public record ParentCourseRequestDto(long RequestId, int ClassId, string ClassCode, string CourseName, string Status,
    DateTime RequestedAt, string? ManagerNote = null);
public record ParentPaymentDto(int PaymentId, string Reference, string? InvoiceNumber, string CourseName,
    int AmountVnd, string Status, DateTime CreatedAt, DateTime? PaidAt, string? RefundStatus, string? RefundReason, DateTime? RefundRequestedAt);
public record ParentRegistration(int ClassId);
public record ParentRefund(string Reason);
public enum ParentChange { Saved, NotFound, Unavailable, Invalid }
