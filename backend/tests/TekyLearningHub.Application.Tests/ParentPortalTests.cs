using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.DTOs.Portal;
using TekyLearningHub.Application.Services.Portal;
using TekyLearningHub.Infrastructure.Data;
using TekyLearningHub.Infrastructure.Repositories.Portal;
using Xunit;

namespace TekyLearningHub.Application.Tests;

public class ParentPortalTests
{
    [SqlServerFact]
    public async Task LinkedChildScopeProtectsLearningRegistrationPaymentsAndMessages()
    {
        await using var fixture = new DatabaseMigrationTests.TestDatabase();
        await fixture.Migrate();
        await fixture.Execute("""
            INSERT dbo.Users(Email,PasswordHash,PrimaryRoleId,FullName) VALUES
                ('child@parent.test','unused',1,'Child'),('parent@parent.test','unused',4,'Parent'),
                ('other@parent.test','unused',4,'Other parent'),('teacher@parent.test','unused',2,'Teacher');
            INSERT dbo.UserRoles(UserId,RoleId,ScopeType)
                SELECT UserId,PrimaryRoleId,'GLOBAL' FROM dbo.Users WHERE Email LIKE '%@parent.test';
            DECLARE @student int=(SELECT UserId FROM dbo.Users WHERE Email='child@parent.test'),
                    @parent int=(SELECT UserId FROM dbo.Users WHERE Email='parent@parent.test'),
                    @other int=(SELECT UserId FROM dbo.Users WHERE Email='other@parent.test'),
                    @teacher int=(SELECT UserId FROM dbo.Users WHERE Email='teacher@parent.test');
            INSERT dbo.StudentProfiles(UserId,StudentCode) VALUES(@student,'PARENT-TEST');
            INSERT dbo.ParentProfiles(UserId) VALUES(@parent),(@other);
            INSERT dbo.TeacherProfiles(UserId,TeacherCode) VALUES(@teacher,'PARENT-TEACHER');
            INSERT dbo.ParentStudentLinks(ParentId,StudentId,Status)
                VALUES(@parent,@student,'Active'),(@other,@student,'Pending');
            INSERT dbo.Courses(CourseCode,Name,Status,TuitionVnd,LearningObjectives)
                VALUES('PARENT','Python','Published',1200000,'Write a program');
            DECLARE @course int=SCOPE_IDENTITY();
            INSERT dbo.Lessons(CourseId,Title,OrderNo) VALUES(@course,'Loops',1);
            DECLARE @lesson int=SCOPE_IDENTITY();
            INSERT dbo.Classes(ClassCode,CourseId,TeacherId,Name,Status)
                VALUES('PARENT-01',@course,@teacher,'Python 1','Open'),('PARENT-02',@course,@teacher,'Python 2','Open');
            DECLARE @class int=(SELECT ClassId FROM dbo.Classes WHERE ClassCode='PARENT-01');
            INSERT dbo.Enrollments(ClassId,StudentId) VALUES(@class,@student);
            INSERT dbo.ClassSessions(ClassId,LessonId,SessionDate,StartTime,EndTime,Status)
                VALUES(@class,@lesson,CONVERT(date,SYSUTCDATETIME()),'09:00','10:30','Done');
            INSERT dbo.AttendanceRecords(SessionId,StudentId,Status,MarkedBy)
                VALUES(SCOPE_IDENTITY(),@student,'Present',@teacher);
            INSERT dbo.LessonProgress(StudentId,LessonId,CompletedAt) VALUES(@student,@lesson,SYSUTCDATETIME());
            INSERT dbo.Assessments(ClassId,Code,Title,IsPublished,QuestionsJson)
                VALUES(@class,'QUIZ','Quiz',1,'[{"prompt":"AB","options":["A","B"],"correct":1}]');
            INSERT dbo.AssessmentAttempts(AttemptId,AssessmentId,StudentId,StartedAt,QuestionsSnapshot,SubmittedAt,AnswersJson,CorrectCount)
                SELECT NEWID(),AssessmentId,@student,SYSUTCDATETIME(),QuestionsJson,SYSUTCDATETIME(),'[1]',1 FROM dbo.Assessments;
            INSERT dbo.ParentPayments(ParentId,StudentId,CourseId,Reference,InvoiceNumber,AmountVnd,Status,PaidAt)
                VALUES(@parent,@student,@course,'PAY-1','INV-1',1200000,'Paid',SYSUTCDATETIME());
            """);
        var student = await fixture.Scalar("SELECT UserId FROM dbo.Users WHERE Email='child@parent.test'");
        var parent = await fixture.Scalar("SELECT UserId FROM dbo.Users WHERE Email='parent@parent.test'");
        var other = await fixture.Scalar("SELECT UserId FROM dbo.Users WHERE Email='other@parent.test'");
        var teacher = await fixture.Scalar("SELECT UserId FROM dbo.Users WHERE Email='teacher@parent.test'");
        var course = await fixture.Scalar("SELECT CourseId FROM dbo.Courses WHERE CourseCode='PARENT'");
        var openClass = await fixture.Scalar("SELECT ClassId FROM dbo.Classes WHERE ClassCode='PARENT-02'");
        var payment = await fixture.Scalar("SELECT PaymentId FROM dbo.ParentPayments WHERE Reference='PAY-1'");
        using var db = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseSqlServer(fixture.ConnectionString).Options);
        var classes = new StudentClassesService(new StudentClassesRepository(db), new UnitOfWork(db));
        var overview = new StudentOverviewService(new StudentOverviewRepository(db), classes);
        var learning = new ParentLearningService(new ParentLearningRepository(db), classes, overview);
        var commerce = new ParentCommerceService(new ParentCommerceRepository(db), learning);
        var messages = new LearningMessageService(new LearningMessageRepository(db));

        Assert.Empty(await learning.Children(other, default));
        Assert.Null(await learning.Learning(other, student, default));
        var report = await learning.Learning(parent, student, default);
        Assert.NotNull(report);
        Assert.Equal(90, report.ScheduledAttendanceMinutes);
        Assert.Equal(1, Assert.Single(report.Courses).ReviewedLessons);
        Assert.Equal(10m, Assert.Single(report.Results).Score);

        Assert.Equal(1200000, (await commerce.Course(course, default))!.Course.TuitionVnd);
        Assert.Single(await commerce.Catalogue(default));
        Assert.Equal(ParentChange.NotFound, await commerce.Register(other, student, openClass, default));
        Assert.Equal(ParentChange.Saved, await commerce.Register(parent, student, openClass, default));
        Assert.Equal(ParentChange.Unavailable, await commerce.Register(parent, student, openClass, default));
        Assert.Equal("Pending", Assert.Single((await commerce.Requests(parent, student, default))!).Status);
        Assert.Null(await commerce.Invoice(other, student, payment, default));
        Assert.Equal("INV-1", (await commerce.Invoice(parent, student, payment, default))!.InvoiceNumber);
        Assert.Equal(ParentChange.Saved, await commerce.Refund(parent, student, payment, "Schedule change", default));
        Assert.Equal(ParentChange.Unavailable, await commerce.Refund(parent, student, payment, "Duplicate request", default));
        Assert.Equal("Pending", Assert.Single((await commerce.Payments(parent, student, default))!).RefundStatus);

        var thread = new LearningThread(parent, student, teacher);
        var draft = new LearningMessageDraft(Guid.NewGuid(), "Question", new("demo.pdf", [1,2,3]));
        Assert.Single(await messages.Inbox(parent, false, default));
        Assert.Empty(await messages.Inbox(teacher, true, default));
        Assert.Equal(ParentChange.NotFound, await messages.Send(other, thread, draft, default));
        Assert.Equal(ParentChange.Saved, await messages.Send(parent, thread, draft, default));
        Assert.Equal(ParentChange.Saved, await messages.Send(parent, thread, draft, default));
        Assert.Equal(1, Assert.Single(await messages.Inbox(teacher, true, default)).Unread);
        var incoming = Assert.Single((await messages.History(teacher, thread, null, default))!.Messages);
        Assert.False(incoming.Mine);
        Assert.Null(await messages.Attachment(other, thread, incoming.MessageId, default));
        Assert.Equal("demo.pdf", (await messages.Attachment(teacher, thread, incoming.MessageId, default))!.FileName);
        Assert.True(await messages.Read(teacher, thread, incoming.MessageId, default));
        Assert.Equal(0, Assert.Single(await messages.Inbox(teacher, true, default)).Unread);
        Assert.Equal(ParentChange.Saved, await messages.Send(teacher, thread, new(Guid.NewGuid(), "Reply", null), default));
        Assert.Equal(1, Assert.Single(await messages.Inbox(parent, false, default)).Unread);

        await fixture.Execute("UPDATE dbo.ParentStudentLinks SET Status='Revoked' WHERE Status='Active'");
        Assert.Null(await messages.History(parent, thread, null, default));
        Assert.Null(await messages.History(teacher, thread, null, default));
        Assert.Null(await learning.Learning(parent, student, default));
        Assert.Null(await commerce.Payments(parent, student, default));
    }
}
