using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Infrastructure.Data;
using TekyLearningHub.Application.Services.Portal;
using Xunit;
namespace TekyLearningHub.Application.Tests;
public class StudentOverviewTests {
 [SqlServerFact]
 public async Task OverviewDeduplicatesCoursesAndProtectsClassResources() {
  await using var fixture=new DatabaseMigrationTests.TestDatabase();await fixture.Migrate();
  await fixture.Execute("""

    INSERT dbo.Users(Email,PasswordHash,PrimaryRoleId,FullName) VALUES
      ('student@flow.test','unused',1,'Student'),('teacher@flow.test','unused',2,'Teacher'),('other@flow.test','unused',2,'Other');
    INSERT dbo.UserRoles(UserId,RoleId,ScopeType) SELECT UserId,PrimaryRoleId,'GLOBAL' FROM dbo.Users WHERE Email LIKE '%@flow.test';
    INSERT dbo.StudentProfiles(UserId,StudentCode) SELECT UserId,'FLOW-STUDENT' FROM dbo.Users WHERE Email='student@flow.test';
    INSERT dbo.TeacherProfiles(UserId,TeacherCode) SELECT UserId,'FLOW-TEACHER' FROM dbo.Users WHERE Email='teacher@flow.test';
    INSERT dbo.TeacherProfiles(UserId,TeacherCode) SELECT UserId,'FLOW-OTHER' FROM dbo.Users WHERE Email='other@flow.test';
    INSERT dbo.Courses(CourseCode,Name) VALUES('FLOW','Flow course');
    INSERT dbo.Lessons(CourseId,Title,OrderNo) SELECT CourseId,'Practice',1 FROM dbo.Courses WHERE CourseCode='FLOW';
    INSERT dbo.Classes(ClassCode,CourseId,TeacherId,Name) SELECT 'FLOW-CLASS',c.CourseId,u.UserId,'Flow class' FROM dbo.Courses c CROSS JOIN dbo.Users u WHERE c.CourseCode='FLOW' AND u.Email='teacher@flow.test';
    INSERT dbo.Enrollments(ClassId,StudentId) SELECT c.ClassId,u.UserId FROM dbo.Classes c CROSS JOIN dbo.Users u WHERE c.ClassCode='FLOW-CLASS' AND u.Email='student@flow.test';
    INSERT dbo.ClassSessions(ClassId,LessonId,SessionDate,StartTime,EndTime) SELECT c.ClassId,l.LessonId,CONVERT(date,DATEADD(day,1,SYSUTCDATETIME())),'23:00','23:59' FROM dbo.Classes c JOIN dbo.Lessons l ON l.CourseId=c.CourseId WHERE c.ClassCode='FLOW-CLASS';
    INSERT dbo.Assignments(ClassId,LessonId,Title,Status,CreatedBy) SELECT c.ClassId,l.LessonId,'Practice','Published',c.TeacherId FROM dbo.Classes c JOIN dbo.Lessons l ON l.CourseId=c.CourseId WHERE c.ClassCode='FLOW-CLASS';

  """);
  var student=await fixture.Scalar("SELECT UserId FROM dbo.Users WHERE Email='student@flow.test'");
  var other=await fixture.Scalar("SELECT UserId FROM dbo.Users WHERE Email='other@flow.test'");
  var cls=await fixture.Scalar("SELECT ClassId FROM dbo.Classes WHERE ClassCode='FLOW-CLASS'");
  await fixture.Execute($"""
    UPDATE dbo.Assignments SET DueAt=DATEADD(day,2,SYSUTCDATETIME());
    INSERT dbo.Classes(ClassCode,CourseId,TeacherId,Name) SELECT 'FLOW-SECOND',CourseId,TeacherId,'Second class' FROM dbo.Classes WHERE ClassId={cls};
    INSERT dbo.Enrollments(ClassId,StudentId) SELECT ClassId,{student} FROM dbo.Classes WHERE ClassCode='FLOW-SECOND';
    INSERT dbo.LessonProgress(StudentId,LessonId,CompletedAt) SELECT {student},LessonId,SYSUTCDATETIME() FROM dbo.Lessons;
    INSERT dbo.LessonMaterials(LessonId,Title,MaterialType,FileUrl) SELECT LessonId,'Shared PDF','Document','https://example.com/lesson.pdf' FROM dbo.Lessons;
    INSERT dbo.Notifications(RecipientId,Type,Title,Body,RefType,RefId) VALUES
      ({student},'Class','Class notice','For this student','Class',{cls}),
      ({other},'Class','Private notice','Not for this student','Class',{cls}),
      ({student},'Class','Other class notice','Not for this class','Class',999999);
  """);
  using var db=new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseSqlServer(fixture.ConnectionString).Options);
  var service=TestServices.Overview(db,TestServices.Classes(db));
  Assert.Null(await service.Overview(other,default));
  Assert.Null(await service.ClassDetails(other,cls,default));
  var overview=await service.Overview(student,default);
  Assert.NotNull(overview);Assert.Equal(2,overview.ActiveClasses.Count);Assert.Single(overview.Courses);
  Assert.Single(overview.UpcomingSessions);
  Assert.Equal(1,overview.TotalLessons);Assert.Equal(1,overview.ReviewedLessons);Assert.Single(overview.UpcomingAssignments);
  var details=await service.ClassDetails(student,cls,default);
  Assert.NotNull(details);Assert.Single(details.Materials);Assert.Single(details.Notices);
  Assert.Equal("Class notice",details.Notices[0].Title);
  await fixture.Execute($"""
    INSERT dbo.StudentProjectSubmissions(AssignmentId,StudentId,FileName,Content,SubmittedAt) SELECT AssignmentId,{student},'work.py',0x01,SYSUTCDATETIME() FROM dbo.Assignments;
  """);
  overview=await service.Overview(student,default);Assert.Empty(overview!.UpcomingAssignments);Assert.Equal(1,overview.ProjectCount);
  await fixture.Execute("UPDATE dbo.StudentProjectSubmissions SET ReviewStatus='NeedsRevision';");
  overview=await service.Overview(student,default);Assert.True(overview!.UpcomingAssignments.Single().NeedsRevision);
  await fixture.Execute("UPDATE dbo.Assignments SET DueAt=DATEADD(day,-1,SYSUTCDATETIME());");
  overview=await service.Overview(student,default);Assert.Empty(overview!.UpcomingAssignments);
  await fixture.Execute("UPDATE dbo.Enrollments SET Status='Completed';");
  overview=await service.Overview(student,default);Assert.Empty(overview!.ActiveClasses);Assert.Empty(overview.Courses);
  Assert.NotNull(await service.ClassDetails(student,cls,default));
  Assert.Empty(overview.UpcomingSessions);
 }
}
