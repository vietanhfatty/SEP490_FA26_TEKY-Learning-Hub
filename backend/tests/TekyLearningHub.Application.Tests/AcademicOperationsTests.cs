using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.Common;
using TekyLearningHub.Application.DTOs.Backoffice;
using TekyLearningHub.Application.Interfaces.Backoffice;
using TekyLearningHub.Application.Services.Backoffice;
using TekyLearningHub.Infrastructure.Data;
using TekyLearningHub.Infrastructure.Security;
using TekyLearningHub.Infrastructure.Repositories.Backoffice;
using Xunit;

namespace TekyLearningHub.Application.Tests;

public sealed class AcademicOperationsTests
{
    private const string Seed = """
        INSERT dbo.Users(Email,PasswordHash,PrimaryRoleId,FullName) VALUES
            ('manager@academic.test','unused',6,N'Manager'),('teacher@academic.test','unused',2,N'Teacher'),
            ('teacher2@academic.test','unused',2,N'Teacher 2'),('student@academic.test','unused',1,N'Student'),
            ('student2@academic.test','unused',1,N'Student 2'),('parent@academic.test','unused',4,N'Parent');
        INSERT dbo.UserRoles(UserId,RoleId,ScopeType) SELECT UserId,PrimaryRoleId,'GLOBAL' FROM dbo.Users WHERE Email LIKE '%@academic.test';
        INSERT dbo.TeacherProfiles(UserId,TeacherCode)
            SELECT UserId,CASE WHEN Email='teacher@academic.test' THEN 'AM-T1' ELSE 'AM-T2' END
            FROM dbo.Users WHERE Email IN ('teacher@academic.test','teacher2@academic.test');
        INSERT dbo.StudentProfiles(UserId,StudentCode)
            SELECT UserId,CASE WHEN Email='student@academic.test' THEN 'AM-S1' ELSE 'AM-S2' END
            FROM dbo.Users WHERE Email IN ('student@academic.test','student2@academic.test');
        INSERT dbo.ParentProfiles(UserId) SELECT UserId FROM dbo.Users WHERE Email='parent@academic.test';
        INSERT dbo.ParentStudentLinks(ParentId,StudentId,Status)
            SELECT p.UserId,s.UserId,'Active' FROM dbo.Users p CROSS JOIN dbo.Users s
            WHERE p.Email='parent@academic.test' AND s.Email IN ('student@academic.test','student2@academic.test');
        INSERT dbo.Courses(CourseCode,Name,Status,LearningObjectives,TuitionVnd)
            VALUES('AM-FREE',N'STEM','Draft',N'Program a robot',0),('AM-OTHER',N'Robotics','Draft',N'Build a robot',0);
        INSERT dbo.Lessons(CourseId,Title,OrderNo) SELECT CourseId,N'Movement',1 FROM dbo.Courses WHERE CourseCode='AM-FREE';
        """;

    [SqlServerFact]
    public async Task CoursesRequireReviewAndCurriculumEditsInvalidateApproval()
    {
        await using var fixture = new DatabaseMigrationTests.TestDatabase();
        await fixture.Migrate();
        await fixture.Execute(Seed);
        var actor = await fixture.Scalar("SELECT UserId FROM dbo.Users WHERE Email='manager@academic.test'");
        var parent = await fixture.Scalar("SELECT UserId FROM dbo.Users WHERE Email='parent@academic.test'");
        var course = await fixture.Scalar("SELECT CourseId FROM dbo.Courses WHERE CourseCode='AM-FREE'");
        await using var db = Context(fixture.ConnectionString);
        var service = Service(db);
        var workspace = await service.Workspace(actor, new(2030, 1, 1), new(2030, 1, 31), default);
        Assert.Equal(2, workspace.Courses.Length);
        Assert.Equal(403, (await Assert.ThrowsAsync<UseCaseException>(() => service.Workspace(parent, new(2030, 1, 1), new(2030, 1, 31), default))).Status);
        var review = workspace.Courses.Single(c => c.CourseId == course);
        await Assert.ThrowsAsync<UseCaseException>(() => service.ReviewCourse(actor, new(course, "Publish", null, review.Version), default));
        await service.ReviewCourse(actor, new(course, "Submit", null, review.Version), default);
        await Assert.ThrowsAsync<UseCaseException>(() => service.ReviewCourse(actor, new(course, "Approve", null, review.Version), default));
        await service.ReviewCourse(actor, new(course, "Approve", "Good curriculum", review.Version + 1), default);
        await service.ReviewCourse(actor, new(course, "Publish", null, review.Version + 2), default);
        Assert.Equal(1, await fixture.Scalar("SELECT COUNT(*) FROM dbo.Courses WHERE CourseCode='AM-FREE' AND Status='Published'"));
        await fixture.Execute("UPDATE dbo.Lessons SET Content=N'New learning content' WHERE CourseId=(SELECT CourseId FROM dbo.Courses WHERE CourseCode='AM-FREE')");
        var changed = (await service.Workspace(actor, new(2030, 1, 1), new(2030, 1, 31), default)).Courses.Single(c => c.CourseId == course);
        Assert.Equal("Revision", changed.ReviewStatus);
        Assert.Equal("Draft", changed.Status);
        Assert.True(await fixture.Scalar("SELECT COUNT(*) FROM dbo.AuditLogs WHERE Action='ACADEMIC_COURSEREVIEW'") >= 3);
    }

    [SqlServerFact]
    public async Task SchedulingPlacementAndRegistrationEnforceConflictsAndCapacity()
    {
        await using var fixture = new DatabaseMigrationTests.TestDatabase();
        await fixture.Migrate();
        await fixture.Execute(Seed);
        var actor = await fixture.Scalar("SELECT UserId FROM dbo.Users WHERE Email='manager@academic.test'");
        var teacher = await fixture.Scalar("SELECT UserId FROM dbo.Users WHERE Email='teacher@academic.test'");
        var teacher2 = await fixture.Scalar("SELECT UserId FROM dbo.Users WHERE Email='teacher2@academic.test'");
        var student = await fixture.Scalar("SELECT UserId FROM dbo.Users WHERE Email='student@academic.test'");
        var student2 = await fixture.Scalar("SELECT UserId FROM dbo.Users WHERE Email='student2@academic.test'");
        var parent = await fixture.Scalar("SELECT UserId FROM dbo.Users WHERE Email='parent@academic.test'");
        var course = await fixture.Scalar("SELECT CourseId FROM dbo.Courses WHERE CourseCode='AM-FREE'");
        await using var db = Context(fixture.ConnectionString);
        var service = Service(db);
        var room = (await service.SaveRoom(actor, new(null, "Lab 1", 10, "Active"), default)).Id;
        var room2 = (await service.SaveRoom(actor, new(null, "Lab 2", 10, "Active"), default)).Id;
        var a = (await service.SaveClass(actor, new() { CourseId = course, ClassCode = "AM-01", Name = "A", TeacherId = teacher, MaxStudents = 1, Status = "Open" }, default)).Id;
        var b = (await service.SaveClass(actor, new() { CourseId = course, ClassCode = "AM-02", Name = "B", TeacherId = teacher, MaxStudents = 1, Status = "Open" }, default)).Id;
        var c = (await service.SaveClass(actor, new() { CourseId = course, ClassCode = "AM-03", Name = "C", TeacherId = teacher2, MaxStudents = 1, Status = "Open" }, default)).Id;
        var date = new DateOnly(2030, 1, 7);
        var session = (await service.SaveSession(actor, new() { ClassId = a, RoomId = room, Date = date, StartsAt = new(9, 0), EndsAt = new(10, 0) }, default)).Id;
        await Assert.ThrowsAsync<UseCaseException>(() => service.SaveSession(actor, new() { ClassId = b, RoomId = room2, Date = date, StartsAt = new(9, 30), EndsAt = new(10, 30) }, default));
        await Assert.ThrowsAsync<UseCaseException>(() => service.SaveSession(actor, new() { ClassId = c, RoomId = room, Date = date, StartsAt = new(9, 30), EndsAt = new(10, 30) }, default));
        await service.SaveSession(actor, new() { ClassId = c, RoomId = room2, Date = date, StartsAt = new(9, 30), EndsAt = new(10, 30) }, default);
        await service.PlaceStudent(actor, new(a, student, null, null), default);
        await Assert.ThrowsAsync<UseCaseException>(() => service.PlaceStudent(actor, new(a, student2, null, null), default));
        await Assert.ThrowsAsync<UseCaseException>(() => service.PlaceStudent(actor, new(c, student, null, null), default));
        Assert.Equal(1, await fixture.Scalar("SELECT COUNT(*) FROM dbo.Enrollments WHERE Status='Active'"));
        await service.PlaceStudent(actor, new(b, student, a, "Transfer"), default);
        Assert.Equal(1, await fixture.Scalar("SELECT COUNT(*) FROM dbo.Enrollments WHERE Status='Transferred'"));
        var view = await service.Workspace(actor, date, date.AddDays(6), default);
        var classRow = view.Classes.Single(row => row.ClassId == b);
        await Assert.ThrowsAsync<UseCaseException>(() => service.AssignTeacher(actor, new(b, teacher2, classRow.Version + 1), default));
        await fixture.Execute($"INSERT dbo.ParentCourseRequests(ParentId,StudentId,ClassId) VALUES({parent},{student2},{c})");
        var request = (await service.Workspace(actor, date, date.AddDays(6), default)).Registrations.Single();
        await service.ReviewRegistration(actor, new(request.RequestId, "Approve", c, "Eligible", request.Version), default);
        Assert.Equal(1, await fixture.Scalar($"SELECT COUNT(*) FROM dbo.Enrollments WHERE ClassId={c} AND StudentId={student2} AND Status='Active'"));
        var sessionRow = view.Sessions.Single(s => s.SessionId == session);
        await service.SaveSession(actor, new() { SessionId = session, ClassId = a, RoomId = room, Date = date, StartsAt = new(9, 0), EndsAt = new(10, 0), Version = sessionRow.Version, Cancel = true, Reason = "Teacher unavailable" }, default);
        Assert.Equal(1, await fixture.Scalar($"SELECT COUNT(*) FROM dbo.ClassSessions WHERE SessionId={session} AND Status='Cancelled'"));
        await service.PlaceStudent(actor, new(a, student, b, "Transfer back"), default);
        Assert.Equal(0, await fixture.Scalar($"SELECT COUNT(*) FROM dbo.Enrollments WHERE ClassId={a} AND StudentId={student} AND TransferredFromId IS NOT NULL"));
    }


    [SqlServerFact]
    public async Task MakeupEquipmentAndScopedPermissionsRemainConsistent()
    {
        await using var fixture = new DatabaseMigrationTests.TestDatabase();
        await fixture.Migrate();
        await fixture.Execute(Seed);
        var actor = await fixture.Scalar("SELECT UserId FROM dbo.Users WHERE Email='manager@academic.test'");
        var teacher = await fixture.Scalar("SELECT UserId FROM dbo.Users WHERE Email='teacher@academic.test'");
        var student = await fixture.Scalar("SELECT UserId FROM dbo.Users WHERE Email='student@academic.test'");
        var course = await fixture.Scalar("SELECT CourseId FROM dbo.Courses WHERE CourseCode='AM-FREE'");
        var lesson = await fixture.Scalar("SELECT LessonId FROM dbo.Lessons");
        await using var db = Context(fixture.ConnectionString);
        var service = Service(db);
        var date = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7)).AddDays(7);
        var room = (await service.SaveRoom(actor, new(null, "Makeup room", 4, "Active"), default)).Id;
        var target = (await service.SaveClass(actor, new() { CourseId = course, ClassCode = "AM-MAKEUP", Name = "Makeup", TeacherId = teacher, MaxStudents = 2, Status = "Open" }, default)).Id;
        var session = (await service.SaveSession(actor, new() { ClassId = target, LessonId = lesson, RoomId = room, Date = date, StartsAt = new(11, 0), EndsAt = new(12, 0) }, default)).Id;
        await fixture.Execute($"""
            INSERT dbo.ClassSessions(ClassId,LessonId,SessionDate,StartTime,EndTime,Status)
            VALUES({target},{lesson},DATEADD(day,-2,CONVERT(date,SYSUTCDATETIME())),'11:00','12:00','Done');
            DECLARE @absent int=CONVERT(int,SCOPE_IDENTITY());
            INSERT dbo.AttendanceRecords(SessionId,StudentId,Status,MarkedBy) VALUES(@absent,{student},'Absent',{teacher});
            INSERT dbo.MakeupRequests(AttendanceId,RequestedBy,Reason)
            VALUES(CONVERT(bigint,SCOPE_IDENTITY()),{student},N'Missed session');
            """);
        var makeup = (await service.Workspace(actor, date, date.AddDays(6), default)).MakeupRequests.Single();
        await service.ReviewMakeup(actor, new(makeup.MakeupId, "Approve", session, "Attend makeup", makeup.Version), default);
        Assert.Equal(1, await fixture.Scalar("SELECT COUNT(*) FROM dbo.MakeupSessionAssignments"));
        var studentReader = new TekyLearningHub.Infrastructure.Repositories.Portal.StudentClassesRepository(db);
        Assert.NotNull(await studentReader.Session(student, session, default));
        Assert.Single(await studentReader.MakeupSessions(student, default));
        Assert.Null(await studentReader.Session(teacher, session, default));
        await Assert.ThrowsAsync<UseCaseException>(() => service.ReviewMakeup(actor, new(makeup.MakeupId, "Approve", session, null, makeup.Version), default));
        await Assert.ThrowsAsync<UseCaseException>(() => service.SaveRoom(actor, new(room, "Makeup room", 1, "Active"), default));
        var asset = (await service.SaveEquipment(actor, new() { Code = "KIT-01", Name = "Robot", RoomId = room, PurchaseDate = date.AddDays(-7), CostVnd = 1200000, UsefulLifeMonths = 12 }, default)).Id;
        var report = await service.Workspace(actor, date, date.AddDays(6), default);
        Assert.Equal(1200000, report.Equipment.Single().BookValueVnd);
        var current = report.Equipment.Single();
        await service.SaveEquipment(actor, new()
        {
            EquipmentId = asset,
            Code = current.Code,
            Name = current.Name,
            RoomId = room,
            PurchaseDate = current.PurchaseDate,
            CostVnd = current.CostVnd,
            UsefulLifeMonths = 12,
            Status = "Maintenance",
            Version = current.Version
        }, default);
        await fixture.Execute($"UPDATE dbo.UserRoles SET ScopeType='DEPARTMENT',DepartmentId=(SELECT DepartmentId FROM dbo.Departments WHERE Code='ACADEMIC') WHERE UserId={actor}");
        var scoped = await service.Workspace(actor, date, date.AddDays(6), default);
        Assert.Empty(scoped.Courses);
        var department = Assert.Single(scoped.Departments).DepartmentId;
        var scopedRoom = (await service.SaveRoom(actor, new(null, "Department lab", 10, "Active", department), default)).Id;
        await service.SaveEquipment(actor, new(){Code="OWN-KIT",Name="Department robot",RoomId=scopedRoom,
            DepartmentId=department,PurchaseDate=date.AddDays(-7),CostVnd=100000,UsefulLifeMonths=12},default);
        Assert.Equal("OWN-KIT",Assert.Single((await service.Workspace(actor,date,date.AddDays(6),default)).Equipment).Code);
        await Assert.ThrowsAsync<UseCaseException>(() => service.SaveRoom(actor, new(null, "Forbidden", 10, "Active"), default));
        await Assert.ThrowsAsync<UseCaseException>(() => service.AssignTeacher(actor, new(target, teacher, 1), default));
    }

    private static ApplicationDbContext Context(string connection) =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>().UseSqlServer(connection, sql => sql.EnableRetryOnFailure()).Options);
    private static AcademicService Service(ApplicationDbContext db) =>
        new(new AcademicRepository(db), new AccountAccessReader(db));
}
