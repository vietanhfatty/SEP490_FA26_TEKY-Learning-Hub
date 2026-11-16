using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.DTOs.Portal;
using TekyLearningHub.Infrastructure.Data;
using TekyLearningHub.Infrastructure.Services.Backoffice;
using TekyLearningHub.Infrastructure.Services.Portal;
using Xunit;

namespace TekyLearningHub.Application.Tests;
public class DatabaseLearningFlowTests {
 [SqlServerFact]
 public async Task EnrollmentAndTeacherScopeProtectTheReviewResubmissionLoop() {
  await using var fixture=new DatabaseMigrationTests.TestDatabase(); await fixture.Migrate();
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
    INSERT dbo.ClassSessions(ClassId,LessonId,SessionDate,StartTime,EndTime) SELECT c.ClassId,l.LessonId,'20261115','14:00','16:00' FROM dbo.Classes c JOIN dbo.Lessons l ON l.CourseId=c.CourseId WHERE c.ClassCode='FLOW-CLASS';
    INSERT dbo.Assignments(ClassId,LessonId,Title,Status,CreatedBy) SELECT c.ClassId,l.LessonId,'Practice','Published',c.TeacherId FROM dbo.Classes c JOIN dbo.Lessons l ON l.CourseId=c.CourseId WHERE c.ClassCode='FLOW-CLASS';
  """);
  var student=await fixture.Scalar("SELECT UserId FROM dbo.Users WHERE Email='student@flow.test'");
  var teacher=await fixture.Scalar("SELECT UserId FROM dbo.Users WHERE Email='teacher@flow.test'");
  var other=await fixture.Scalar("SELECT UserId FROM dbo.Users WHERE Email='other@flow.test'");
  var course=await fixture.Scalar("SELECT CourseId FROM dbo.Courses WHERE CourseCode='FLOW'");
  var lesson=await fixture.Scalar("SELECT LessonId FROM dbo.Lessons WHERE Title='Practice'");
  var session=await fixture.Scalar("SELECT SessionId FROM dbo.ClassSessions");
  var assignment=await fixture.Scalar("SELECT AssignmentId FROM dbo.Assignments");
  using var db=new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseSqlServer(fixture.ConnectionString).Options);
  var classes=new StudentClassesService(db); var learning=new StudentLearningService(db,classes);
  var reviews=new ProjectReviewService(db);
  Assert.Null(await learning.Course(other,course,default));
  Assert.NotNull(await learning.Course(student,course,default));
  Assert.False(await learning.ReviewLesson(other,course,lesson,default));
  Assert.True(await learning.ReviewLesson(student,course,lesson,default));
  Assert.Equal(StudentProjectResult.NotFound,(await classes.SubmitProjectAsync(other,session,assignment,"test.py",[1],default)).Result);
  Assert.Equal(StudentProjectResult.Submitted,(await classes.SubmitProjectAsync(student,session,assignment,"v1.py",[1],default)).Result);
  Assert.False(await reviews.SubmitReview(other,assignment,student,1,"Passed","unauthorized",default));
  Assert.Null(await reviews.ReviewFile(other,assignment,student,default));
  Assert.True(await reviews.SubmitReview(teacher,assignment,student,1,"NeedsRevision","Add a loop",default));
  db.ChangeTracker.Clear();
  var first=await classes.GetSessionAsync(student,session,default);
  Assert.True(first!.Assignments.Single().CanSubmit);
  Assert.Equal("NeedsRevision",first.Assignments.Single().Submission!.ReviewStatus);
  Assert.Equal(StudentProjectResult.Submitted,(await classes.SubmitProjectAsync(student,session,assignment,"v2.py",[2],default)).Result);
  Assert.Equal(1,await fixture.Scalar("SELECT COUNT(*) FROM dbo.StudentProjectVersions WHERE Feedback='Add a loop'"));
  Assert.False(await reviews.SubmitReview(teacher,assignment,student,1,"Passed","stale",default));
  Assert.True(await reviews.SubmitReview(teacher,assignment,student,2,"Passed","Meets requirements",default));
  db.ChangeTracker.Clear();
  var final=await classes.GetSessionAsync(student,session,default);
  Assert.Equal("Passed",final!.Assignments.Single().Submission!.ReviewStatus);
  Assert.False(final.Assignments.Single().CanSubmit);
  Assert.Equal(StudentProjectResult.AlreadySubmitted,(await classes.SubmitProjectAsync(student,session,assignment,"v3.py",[3],default)).Result);
  Assert.NotNull(await learning.Course(student,course,default));
 }
}
