using TekyLearningHub.Application.DTOs.Portal;
using TekyLearningHub.Application.Interfaces.Portal;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.DTOs.Portal;

public record StudentOverviewMetrics(List<StudentCourseOverviewDto> Courses,int ProjectCount,int Passed,List<OverviewDeadlineRow> Deadlines);
public sealed record OverviewDeadlineRow {
 public int AssignmentId {get;init;} public string Title {get;init;}=null!;
 public int ClassId {get;init;} public string ClassCode {get;init;}=null!; public int CourseId {get;init;}
 public int? LessonId {get;init;} public DateTime? DueAt {get;init;} public int? SessionId {get;init;} public bool NeedsRevision {get;init;}
}
public sealed record ClassEnrollmentRow {
 public int ClassId {get;init;} public string ClassCode {get;init;}=null!;public string Name {get;init;}=null!;
 public int CourseId {get;init;} public string CourseName {get;init;}=null!;public string Status {get;init;}=null!;
 public string EnrollmentStatus {get;init;}=null!; public DateOnly? StartDate {get;init;}public DateOnly? EndDate {get;init;}
 public int MaxStudents {get;init;}public DateTime EnrolledAt {get;init;}public string? TeacherName {get;init;}public string? TeacherEmail {get;init;}
}
public record ClassNoticeRow(long NotificationId,string Title,string? Body,bool IsRead,DateTime CreatedAt);
public record ClassNoticeData(int Count,List<ClassNoticeRow> Items);
