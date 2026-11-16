using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.DTOs.Student;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Infrastructure.Data;
namespace TekyLearningHub.Infrastructure.Services;

public sealed class StudentOverviewService(ApplicationDbContext db,IStudentClassesService classes)
{
    private IQueryable<Enrollment> Access(int userId) => db.Enrollments.AsNoTracking().Where(e => e.StudentId==userId &&
        (e.Status=="Active"||e.Status=="Completed") && e.Student.User.Status=="Active" &&
        e.Student.User.RoleAssignments.Any(r=>r.RoleId==1&&r.RevokedAt==null));
    private static DateTimeOffset Utc(DateTime date) => new(DateTime.SpecifyKind(date,DateTimeKind.Utc));

    public async Task<StudentOverviewDto?> Overview(int userId,CancellationToken ct)
    {
        var identity=await db.StudentProfiles.AsNoTracking().Where(s=>s.UserId==userId&&s.User.Status=="Active"&&
            s.User.RoleAssignments.Any(r=>r.RoleId==1&&r.RevokedAt==null))
            .Select(s=>new StudentIdentityDto(s.UserId,s.StudentCode,s.User.FullName,s.User.Email,s.SchoolName,s.GradeLevel))
            .SingleOrDefaultAsync(ct);
        if(identity is null)return null;
        var now=DateTimeOffset.UtcNow;
        var all=await classes.GetClassesAsync(userId,ct);
        var active=all!.Classes.Where(c=>c.EnrollmentStatus=="Active"&&c.Status!="Completed"&&c.Status!="Cancelled").ToList();
        var courseIds=active.Select(c=>c.CourseId).Distinct().ToList();
        var courses=await db.Courses.AsNoTracking().Where(c=>courseIds.Contains(c.CourseId)).OrderBy(c=>c.Name)
            .Select(c=>new StudentCourseOverviewDto(c.CourseId,c.CourseCode,c.Name,
                c.Lessons.Count(l=>!l.IsDeleted),
                c.Lessons.Count(l=>!l.IsDeleted&&l.LessonProgresses.Any(p=>p.StudentId==userId&&p.CompletedAt!=null))))
            .ToListAsync(ct);
        var activeIds=active.Select(c=>c.ClassId).ToList();
        var assignments=db.Assignments.AsNoTracking().Where(a=>activeIds.Contains(a.ClassId)&&
            (a.Status=="Published"||a.Status=="Closed")&&(a.LessonId==null||!a.Lesson!.IsDeleted));
        var projectCount=await db.StudentProjectSubmissions.CountAsync(s=>s.StudentId==userId&&assignments.Any(a=>a.AssignmentId==s.AssignmentId),ct);
        var passed=await db.StudentProjectSubmissions.CountAsync(s=>s.StudentId==userId&&s.ReviewStatus=="Passed"&&assignments.Any(a=>a.AssignmentId==s.AssignmentId),ct);
        var end=now.UtcDateTime.AddDays(7);var start=now.UtcDateTime;
        var due=await assignments.Where(a=>a.Status=="Published"&&a.DueAt>=start&&a.DueAt<=end&&
            !db.StudentProjectSubmissions.Any(s=>s.StudentId==userId&&s.AssignmentId==a.AssignmentId&&s.ReviewStatus!="NeedsRevision")&&
            !a.Submissions.Any(s=>s.StudentId==userId&&s.IsCurrent))
            .OrderBy(a=>a.DueAt).ThenBy(a=>a.AssignmentId).Select(a=>new {
                a.AssignmentId,a.Title,a.ClassId,a.Class.ClassCode,a.Class.CourseId,a.LessonId,a.DueAt,
                SessionId=db.ClassSessions.Where(s=>s.ClassId==a.ClassId&&s.LessonId==a.LessonId&&a.LessonId!=null&&s.Status!="Cancelled")
                    .OrderBy(s=>s.SessionDate).ThenBy(s=>s.SessionId).Select(s=>(int?)s.SessionId).FirstOrDefault(),
                NeedsRevision=db.StudentProjectSubmissions.Any(s=>s.StudentId==userId&&s.AssignmentId==a.AssignmentId&&s.ReviewStatus=="NeedsRevision")
            }).ToListAsync(ct);
        var next=active.SelectMany(c=>c.Sessions).Where(s=>s.Status=="Scheduled"&&s.EndsAt>now)
            .OrderBy(s=>s.StartsAt).ThenBy(s=>s.SessionId).Take(6).ToList();
        return new(identity,active,courses,courses.Sum(c=>c.TotalLessons),courses.Sum(c=>c.ReviewedLessons),projectCount,passed,
            due.Select(a=>new StudentDeadlineDto(a.AssignmentId,a.Title,a.ClassId,a.ClassCode,a.CourseId,a.LessonId,Utc(a.DueAt!.Value),a.SessionId,a.NeedsRevision)).ToList(),next,now);
    }
    public async Task<StudentClassDetailsDto?> ClassDetails(int userId,int classId,CancellationToken ct)
    {
        var e=await Access(userId).Where(e=>e.ClassId==classId).Select(e=>new {
            e.ClassId,e.Class.ClassCode,e.Class.Name,e.Class.CourseId,CourseName=e.Class.Course.Name,
            e.Class.Status,EnrollmentStatus=e.Status,e.Class.StartDate,e.Class.EndDate,e.Class.MaxStudents,e.EnrolledAt,
            TeacherName=e.Class.Teacher==null?null:e.Class.Teacher.User.FullName,
            TeacherEmail=e.Class.Teacher==null?null:e.Class.Teacher.User.Email
        }).SingleOrDefaultAsync(ct);
        if(e is null)return null;
        // Notifications are addressed to an individual. Never expose another recipient's class notice.
        var notices=db.Notifications.AsNoTracking().Where(n=>n.RecipientId==userId&&
            ((n.RefType=="Class"&&n.RefId==classId)||
             ((n.RefType=="ClassSession"||n.RefType=="Session")&&db.ClassSessions.Any(s=>s.ClassId==classId&&s.SessionId==n.RefId))||
             (n.RefType=="Assignment"&&db.Assignments.Any(a=>a.ClassId==classId&&a.AssignmentId==n.RefId))));
        var count=await notices.CountAsync(ct);
        var recent=await notices.OrderByDescending(n=>n.CreatedAt).ThenByDescending(n=>n.NotificationId).Take(50)
            .Select(n=>new {n.NotificationId,n.Title,n.Body,n.IsRead,n.CreatedAt}).ToListAsync(ct);
        // Shared lesson materials are deduplicated even if a lesson is taught in several sessions.
        var materials=await db.LessonMaterials.AsNoTracking().Where(m=>!m.Lesson.IsDeleted&&m.Lesson.CourseId==e.CourseId&&
            m.Lesson.ClassSessions.Any(s=>s.ClassId==classId&&s.Status!="Cancelled"))
            .OrderBy(m=>m.Lesson.OrderNo).ThenBy(m=>m.SortOrder).ThenBy(m=>m.MaterialId)
            .Select(m=>new StudentClassMaterialDto(m.MaterialId,m.LessonId,m.Lesson.Title,m.Title,m.MaterialType,m.FileUrl)).ToListAsync(ct);
        return new(e.ClassId,e.ClassCode,e.Name,e.CourseId,e.CourseName,e.Status,e.EnrollmentStatus,e.StartDate,e.EndDate,e.MaxStudents,
            e.TeacherName,e.TeacherEmail,Utc(e.EnrolledAt),recent.Select(n=>new StudentClassNoticeDto(n.NotificationId,n.Title,n.Body,n.IsRead,Utc(n.CreatedAt))).ToList(),materials,count);
    }
}
