using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Infrastructure.Data;
using TekyLearningHub.Infrastructure.Services;
using Xunit;

namespace TekyLearningHub.Application.Tests;

public class StudentAssessmentsTests
{
    [SqlServerFact]
    public async Task StudentsCanOnlyTakeTheirOwnPublishedTestAndSeePermittedResults()
    {
        await using var fixture = new DatabaseMigrationTests.TestDatabase();
        await fixture.Migrate();
        await fixture.Execute("""
            INSERT dbo.Users(Email,PasswordHash,PrimaryRoleId,FullName) VALUES
              ('quiz@flow.test','unused',1,'Student'),('other@flow.test','unused',1,'Other');
            INSERT dbo.UserRoles(UserId,RoleId,ScopeType)
              SELECT UserId,1,'GLOBAL' FROM dbo.Users WHERE Email LIKE '%@flow.test';
            INSERT dbo.StudentProfiles(UserId,StudentCode)
              SELECT UserId,LEFT(Email,CHARINDEX('@',Email)-1) FROM dbo.Users WHERE Email LIKE '%@flow.test';
            INSERT dbo.Courses(CourseCode,Name) VALUES('QUIZ','Quiz course');
            INSERT dbo.Classes(ClassCode,CourseId,Name) SELECT 'QUIZ-01',CourseId,'Quiz class' FROM dbo.Courses WHERE CourseCode='QUIZ';
            INSERT dbo.Enrollments(ClassId,StudentId)
              SELECT c.ClassId,u.UserId FROM dbo.Classes c CROSS JOIN dbo.Users u WHERE c.ClassCode='QUIZ-01' AND u.Email='quiz@flow.test';
            INSERT dbo.Assessments(ClassId,Code,Title,IsPublished,AllowAnswerReview,ClosesAt,QuestionsJson)
              SELECT ClassId,seed.Code,seed.Code,seed.Published,seed.Review,seed.ClosesAt,
                '[{"prompt":"Choose B","options":["A","B"],"correct":1,"explanation":"B is correct"}]'
              FROM dbo.Classes CROSS JOIN (VALUES
                ('QUIZ',1,1,DATEADD(day,1,SYSUTCDATETIME())),('LOCKED',1,0,NULL),('DRAFT',0,0,NULL),
                ('EXPIRED',1,0,DATEADD(day,-1,SYSUTCDATETIME()))
              ) seed(Code,Published,Review,ClosesAt) WHERE ClassCode='QUIZ-01';
            """);
        var student = await fixture.Scalar("SELECT UserId FROM dbo.Users WHERE Email='quiz@flow.test'");
        var other = await fixture.Scalar("SELECT UserId FROM dbo.Users WHERE Email='other@flow.test'");
        var id = await fixture.Scalar("SELECT AssessmentId FROM dbo.Assessments WHERE Code='QUIZ'");
        var locked = await fixture.Scalar("SELECT AssessmentId FROM dbo.Assessments WHERE Code='LOCKED'");
        var expired = await fixture.Scalar("SELECT AssessmentId FROM dbo.Assessments WHERE Code='EXPIRED'");
        using var db = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseSqlServer(fixture.ConnectionString).Options);
        var service = new StudentAssessmentsService(db);
        Assert.Empty(await service.List(other, default));
        Assert.Null((await service.Start(other, id, default)).Detail);
        Assert.Null((await service.Submit(other, id, [1], default)).Detail);
        Assert.Equal(3, (await service.List(student, default)).Length);
        Assert.Null((await service.Detail(student, id, default))!.Work);
        Assert.NotNull((await service.Start(student, expired, default)).Error);
        Assert.NotNull((await service.Submit(student, id, [1], default)).Error);
        var started = (await service.Start(student, id, default)).Detail!;
        var serialized = JsonSerializer.Serialize(started);
        Assert.DoesNotContain("Correct", serialized);
        Assert.DoesNotContain("Correct", serialized);
        Assert.Equal(started.Work!.AttemptId, (await service.Start(student, id, default)).Detail!.Work!.AttemptId);
        Assert.True((await service.Submit(student, id, [99], default)).Invalid);
        await fixture.Execute("UPDATE dbo.Assessments SET QuestionsJson=JSON_MODIFY(QuestionsJson,'$[0].correct',0) WHERE Code='QUIZ';");
        var result = (await service.Submit(student, id, [1], default)).Detail!.Result!;
        Assert.Equal(10m, result.Score);
        Assert.Equal(1, Assert.Single(result.Review!).Correct);
        Assert.Equal(10m, (await service.Submit(student, id, [0], default)).Detail!.Result!.Score);
        await service.Start(student, locked, default);
        var hidden = (await service.Submit(student, locked, [0], default)).Detail!.Result!;
        Assert.Equal(0m, hidden.Score);
        Assert.Null(hidden.Review);
        Assert.Null((await service.Detail(other, locked, default))?.Result);
    }
}
