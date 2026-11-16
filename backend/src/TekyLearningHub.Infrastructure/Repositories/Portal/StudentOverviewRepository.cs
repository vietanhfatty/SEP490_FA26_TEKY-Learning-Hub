using TekyLearningHub.Application.DTOs.Portal;
using TekyLearningHub.Application.Interfaces.Portal;
using TekyLearningHub.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Infrastructure.Data;
namespace TekyLearningHub.Infrastructure.Repositories.Portal;
public sealed class StudentOverviewRepository(ApplicationDbContext db) : IStudentOverviewRepository {
    private IQueryable<Enrollment> Access(int userId) => db.Enrollments.AsNoTracking().Where(e => e.StudentId==userId &&
        (e.Status=="Active"||e.Status=="Completed") && e.Student.User.Status=="Active" &&
        e.Student.User.RoleAssignments.Any(r=>r.RoleId==1&&r.RevokedAt==null));

 public async Task<StudentIdentityDto?> Identity(int userId,CancellationToken ct)=>await db.StudentProfiles.AsNoTracking().Where(s=>s.UserId==userId&&s.User.Status=="Active"&&
            s.User.RoleAssignments.Any(r=>r.RoleId==1&&r.RevokedAt==null))
            .Select(s=>new StudentIdentityDto(s.UserId,s.StudentCode,s.User.FullName,s.User.Email,s.SchoolName,s.GradeLevel))
            .SingleOrDefaultAsync(ct);
 public async Task<StudentOverviewMetrics> Metrics(int userId,List<int> courseIds,List<int> activeIds,DateTime start,DateTime end,CancellationToken ct) {
        var courses=await db.Courses.AsNoTracking().Where(c=>courseIds.Contains(c.CourseId)).OrderBy(c=>c.Name)
            .Select(c=>new StudentCourseOverviewDto(c.CourseId,c.CourseCode,c.Name,
                c.Lessons.Count(l=>!l.IsDeleted),
                c.Lessons.Count(l=>!l.IsDeleted&&l.LessonProgresses.Any(p=>p.StudentId==userId&&p.CompletedAt!=null))))
            .ToListAsync(ct);
        var assignments=db.Assignments.AsNoTracking().Where(a=>activeIds.Contains(a.ClassId)&&
            (a.Status=="Published"||a.Status=="Closed")&&(a.LessonId==null||(!a.Lesson!.IsDeleted&&a.Lesson.CourseId==a.Class.CourseId)));
        var projectCount=await db.StudentProjectSubmissions.CountAsync(s=>s.StudentId==userId&&assignments.Any(a=>a.AssignmentId==s.AssignmentId),ct);
        var passed=await db.StudentProjectSubmissions.CountAsync(s=>s.StudentId==userId&&s.ReviewStatus=="Passed"&&assignments.Any(a=>a.AssignmentId==s.AssignmentId),ct);
        var due=await assignments.Where(a=>a.Status=="Published"&&a.DueAt>=start&&a.DueAt<=end&&
            !db.StudentProjectSubmissions.Any(s=>s.StudentId==userId&&s.AssignmentId==a.AssignmentId&&s.ReviewStatus!="NeedsRevision")&&
            !a.Submissions.Any(s=>s.StudentId==userId&&s.IsCurrent))
            .OrderBy(a=>a.DueAt).ThenBy(a=>a.AssignmentId).Select(a=>new OverviewDeadlineRow {
                AssignmentId=a.AssignmentId,Title=a.Title,ClassId=a.ClassId,ClassCode=a.Class.ClassCode,CourseId=a.Class.CourseId,LessonId=a.LessonId,DueAt=a.DueAt,
                SessionId=db.ClassSessions.Where(s=>s.ClassId==a.ClassId&&s.LessonId==a.LessonId&&a.LessonId!=null&&s.Status!="Cancelled")
                    .OrderBy(s=>s.SessionDate).ThenBy(s=>s.SessionId).Select(s=>(int?)s.SessionId).FirstOrDefault(),
                NeedsRevision=db.StudentProjectSubmissions.Any(s=>s.StudentId==userId&&s.AssignmentId==a.AssignmentId&&s.ReviewStatus=="NeedsRevision")
            }).ToListAsync(ct);
 return new(courses,projectCount,passed,due);
 }
 public async Task<ClassEnrollmentRow?> Enrollment(int userId,int classId,CancellationToken ct)=>await Access(userId).Where(e=>e.ClassId==classId).Select(e=>new ClassEnrollmentRow {
            ClassId=e.ClassId,ClassCode=e.Class.ClassCode,Name=e.Class.Name,CourseId=e.Class.CourseId,CourseName=e.Class.Course.Name,
            Status=e.Class.Status,EnrollmentStatus=e.Status,StartDate=e.Class.StartDate,EndDate=e.Class.EndDate,MaxStudents=e.Class.MaxStudents,EnrolledAt=e.EnrolledAt,
            TeacherName=e.Class.Teacher==null?null:e.Class.Teacher.User.FullName,
            TeacherEmail=e.Class.Teacher==null?null:e.Class.Teacher.User.Email
        }).SingleOrDefaultAsync(ct);
 public async Task<ClassNoticeData> Notices(int userId,int classId,CancellationToken ct) {
        var notices=db.Notifications.AsNoTracking().Where(n=>n.RecipientId==userId&&
            ((n.RefType=="Class"&&n.RefId==classId)||
             ((n.RefType=="ClassSession"||n.RefType=="Session")&&db.ClassSessions.Any(s=>s.ClassId==classId&&s.SessionId==n.RefId))||
             (n.RefType=="Assignment"&&db.Assignments.Any(a=>a.ClassId==classId&&a.AssignmentId==n.RefId))));
        var count=await notices.CountAsync(ct);
        var recent=await notices.OrderByDescending(n=>n.CreatedAt).ThenByDescending(n=>n.NotificationId).Take(50)
            .Select(n=>new ClassNoticeRow(n.NotificationId,n.Title,n.Body,n.IsRead,n.CreatedAt)).ToListAsync(ct);
 return new(count,recent);
 }
 public async Task<List<StudentClassMaterialDto>> Materials(int classId,int courseId,CancellationToken ct)=>await db.LessonMaterials.AsNoTracking().Where(m=>!m.Lesson.IsDeleted&&m.Lesson.CourseId==courseId&&
            m.Lesson.ClassSessions.Any(s=>s.ClassId==classId&&s.Status!="Cancelled"))
            .OrderBy(m=>m.Lesson.OrderNo).ThenBy(m=>m.SortOrder).ThenBy(m=>m.MaterialId)
            .Select(m=>new StudentClassMaterialDto(m.MaterialId,m.LessonId,m.Lesson.Title,m.Title,m.MaterialType,m.FileUrl)).ToListAsync(ct);
}
