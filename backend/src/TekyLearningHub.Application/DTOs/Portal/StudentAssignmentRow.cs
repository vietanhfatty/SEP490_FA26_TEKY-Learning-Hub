using TekyLearningHub.Application.DTOs.Portal;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Application.Interfaces.Portal;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.DTOs.Portal;
public sealed record StudentAssignmentRow {
 public int AssignmentId {get;init;}
 public int ClassId {get;init;}
 public int CourseId {get;init;}
 public int FileAttempt {get;init;}
 public int CodeAttempt {get;init;}
 public int? LessonId {get;init;}
 public int? SessionId {get;init;}
 public string Title {get;init;} = null!;
 public string Status {get;init;} = null!;
 public string ClassCode {get;init;} = null!;
 public string ClassName {get;init;} = null!;
 public string CourseName {get;init;} = null!;
 public string? Instructions {get;init;}
 public string? LessonTitle {get;init;}
 public string? FileName {get;init;}
 public string? ReviewStatus {get;init;}
 public string? Feedback {get;init;}
 public string? Remark {get;init;}
 public decimal MaxScore {get;init;}
 public decimal? Score {get;init;}
 public bool Active {get;init;}
 public bool IsFinalized {get;init;}
 public DateTime? DueAt {get;init;}
 public DateTime? FileSubmittedAt {get;init;}
 public DateTime? ReviewedAt {get;init;}
 public DateTime? CodeSubmittedAt {get;init;}
}
