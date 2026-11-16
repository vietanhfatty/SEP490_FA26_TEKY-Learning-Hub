namespace TekyLearningHub.Application.DTOs.Portal;

public record StudentIdentityDto(int StudentId,string StudentCode,string FullName,string Email,string? SchoolName,string? GradeLevel);
public record StudentCourseOverviewDto(int CourseId,string CourseCode,string Name,int TotalLessons,int ReviewedLessons);
public record StudentDeadlineDto(int AssignmentId,string Title,int ClassId,string ClassCode,int CourseId,int? LessonId,
    DateTimeOffset DueAt,int? SessionId,bool NeedsRevision);
public record StudentOverviewDto(StudentIdentityDto Student,IReadOnlyList<StudentClassDto> ActiveClasses,
    IReadOnlyList<StudentCourseOverviewDto> Courses,int TotalLessons,int ReviewedLessons,int ProjectCount,int PassedProjects,
    IReadOnlyList<StudentDeadlineDto> UpcomingAssignments,IReadOnlyList<StudentSessionDto> UpcomingSessions,DateTimeOffset AsOf);
public record StudentClassNoticeDto(long NotificationId,string Title,string? Body,bool IsRead,DateTimeOffset CreatedAt);
public record StudentClassMaterialDto(int MaterialId,int LessonId,string LessonTitle,string Title,string MaterialType,string FileUrl);
public record StudentClassDetailsDto(int ClassId,string ClassCode,string Name,int CourseId,string CourseName,
    string Status,string EnrollmentStatus,DateOnly? StartDate,DateOnly? EndDate,int MaxStudents,
    string? TeacherName,string? TeacherEmail,DateTimeOffset EnrolledAt,
    IReadOnlyList<StudentClassNoticeDto> Notices,IReadOnlyList<StudentClassMaterialDto> Materials,int NoticeCount);
