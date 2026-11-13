namespace TekyLearningHub.Application.DTOs.Student;

public record StudentClassesDto(int StudentId, string StudentCode, string FullName, IReadOnlyList<StudentClassDto> Classes);
public record StudentClassDto(int ClassId, string ClassCode, string Name, string Status,
    string EnrollmentStatus, decimal ProgressPercent, int CourseId, string CourseCode,
    string CourseName, string? TeacherName, string? TeacherEmail, IReadOnlyList<StudentSessionDto> Sessions);
public record StudentSessionDto(int SessionId, int ClassId, string ClassCode, string ClassName,
    int CourseId, string CourseCode, string CourseName, int? LessonId, string Title,
    string? Content, DateTimeOffset StartsAt, DateTimeOffset EndsAt, string Status,
    string? TeacherName, string? TeacherEmail, string? RoomName, IReadOnlyList<StudentMaterialDto> Materials);
public record StudentMaterialDto(int MaterialId, string Title, string MaterialType, string FileUrl);
