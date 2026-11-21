using System.ComponentModel.DataAnnotations;

namespace TekyLearningHub.Application.DTOs.Backoffice;

public record AcademicCourse(int CourseId, string CourseCode, string Name, int? DepartmentId, string Status,
    string ReviewStatus, string? Comment, int Version, string? LearningObjectives, int? TuitionVnd, int Lessons);
public record AcademicClass(int ClassId, int CourseId, string CourseName, string ClassCode, string Name, string Status,
    int MaxStudents, int Students, int Reserved, int? TeacherId, string? TeacherName, DateOnly? StartDate, DateOnly? EndDate,
    int Version, int TotalSessions, int DoneSessions, int CancelledSessions);
public record AcademicStudent(int StudentId, string StudentCode, string Name, string? GradeLevel);
public record AcademicEnrollment(int EnrollmentId, int ClassId, int StudentId, string StudentName, string StudentCode,
    string Status, decimal ProgressPercent);
public record AcademicTeacher(int TeacherId, string TeacherCode, string Name, string? Specialty, int Classes, int Sessions, int Minutes);
public record AcademicAvailability(int AvailabilityId, int TeacherId, int Weekday, TimeOnly StartsAt, TimeOnly EndsAt);
public record AcademicDepartment(int DepartmentId, string Name);
public record AcademicRoom(int RoomId, string RoomName, int Capacity, string Status, int? DepartmentId);
public record AcademicSession(int SessionId, int ClassId, string ClassCode, int? LessonId, string? Title, int? TeacherId,
    string? TeacherName, int? RoomId, string? RoomName, DateOnly Date, TimeOnly StartsAt, TimeOnly EndsAt,
    string Status, int Version, string? ChangeReason);
public record AcademicRegistration(long RequestId, int ParentId, string ParentName, int StudentId, string StudentName,
    string? GradeLevel, int ClassId, string ClassCode, int CourseId, string CourseName, string Status, string? ManagerNote,
    int Version, string PaymentStatus, int? TuitionVnd, bool Enrolled);
public record AcademicMakeup(int MakeupId, int StudentId, string StudentName, int ClassId, string ClassCode,
    int? LessonId, DateOnly AbsentDate, string? Reason, string Status, int? SessionId, string? ManagerNote, int Version);
public record AcademicEquipment(int EquipmentId, string Code, string Name, int? RoomId, string? RoomName, string Status,
    DateOnly PurchaseDate, int CostVnd, int UsefulLifeMonths, string? Note, int Version, int BookValueVnd, int? DepartmentId);
public record AcademicWorkspace(AcademicCourse[] Courses, AcademicClass[] Classes, AcademicStudent[] Students,
    AcademicEnrollment[] Enrollments, AcademicTeacher[] Teachers, AcademicAvailability[] Availability,
    AcademicRoom[] Rooms, AcademicSession[] Sessions, AcademicRegistration[] Registrations,
    AcademicMakeup[] MakeupRequests, AcademicEquipment[] Equipment, bool CanManageSharedResources, AcademicLesson[] Lessons, AcademicDepartment[] Departments);
public record AcademicLesson(int LessonId, int CourseId, string Title, int OrderNo);
public record AcademicMutation(int Id);

public record AcademicClassDraft
{
    public int? ClassId { get; init; }
    [Range(1, int.MaxValue)] public int CourseId { get; init; }
    [Required, StringLength(30, MinimumLength = 2)] public string ClassCode { get; init; } = "";
    [Required, StringLength(150)] public string Name { get; init; } = "";
    [Range(1, 500)] public int MaxStudents { get; init; } = 20;
    public int? TeacherId { get; init; }
    public DateOnly? StartDate { get; init; }
    public DateOnly? EndDate { get; init; }
    [Required] public string Status { get; init; } = "Planned";
    [StringLength(1000)] public string? Reason { get; init; }
    public int Version { get; init; }
}
public record AcademicPlacement(int ClassId, int StudentId, int? FromClassId, string? Reason);
public record AcademicTeacherAssignment(int ClassId, int? TeacherId, int Version);
public record AcademicAvailabilityDraft(int? AvailabilityId, int TeacherId, int Weekday, TimeOnly StartsAt, TimeOnly EndsAt, bool Delete = false);
public record AcademicSessionDraft
{
    public int? SessionId { get; init; }
    [Range(1, int.MaxValue)] public int ClassId { get; init; }
    public int? LessonId { get; init; }
    public int? RoomId { get; init; }
    public DateOnly Date { get; init; }
    public TimeOnly StartsAt { get; init; }
    public TimeOnly EndsAt { get; init; }
    public bool Cancel { get; init; }
    public int Version { get; init; }
    [StringLength(1000)] public string? Reason { get; init; }
}
public record AcademicRoomDraft(int? RoomId, string RoomName, int Capacity, string Status, int? DepartmentId = null);
public record AcademicReview(int Id, string Action, string? Comment, int Version);
public record AcademicRegistrationReview(long RequestId, string Action, int? ClassId, string? Comment, int Version);
public record AcademicMakeupReview(int MakeupId, string Action, int? SessionId, string? Comment, int Version);
public record AcademicEquipmentDraft
{
    public int? EquipmentId { get; init; }
    public int? DepartmentId { get; init; }
    [Required, StringLength(40)] public string Code { get; init; } = "";
    [Required, StringLength(150)] public string Name { get; init; } = "";
    public int? RoomId { get; init; }
    [Required] public string Status { get; init; } = "Available";
    public DateOnly PurchaseDate { get; init; }
    [Range(0, int.MaxValue)] public int CostVnd { get; init; }
    [Range(1, 600)] public int UsefulLifeMonths { get; init; } = 36;
    [StringLength(1000)] public string? Note { get; init; }
    public int Version { get; init; }
}
