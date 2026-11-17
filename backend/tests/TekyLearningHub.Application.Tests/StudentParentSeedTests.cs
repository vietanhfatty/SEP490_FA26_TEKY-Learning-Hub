using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Infrastructure.Data;
using TekyLearningHub.Infrastructure.Security;
using Xunit;

namespace TekyLearningHub.Application.Tests;

public sealed class StudentParentSeedTests
{
    [SqlServerFact]
    public async Task DevelopmentSeedCreatesLearningDataAndPreservesExistingChanges()
    {
        await using var database = new DatabaseMigrationTests.TestDatabase();
        await database.Migrate();
        Assert.Equal(0, await database.Scalar("SELECT COUNT(*) FROM dbo.Users;"));
        using var db = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlServer(database.ConnectionString).Options);
        var hasher = new PasswordHasher();
        await DbInitializer.SeedAsync(db, hasher);

        var student = await database.Scalar("SELECT UserId FROM dbo.Users WHERE NormalizedEmail=N'student@teky.edu.vn';");
        var parent = await database.Scalar("SELECT UserId FROM dbo.Users WHERE NormalizedEmail=N'parent@teky.edu.vn';");
        Assert.Equal(1, await database.Scalar($"""
            SELECT COUNT(*) FROM dbo.ParentStudentLinks
            WHERE ParentId={parent} AND StudentId={student} AND Status=N'Active';
            """));
        Assert.Equal(2, await database.Scalar($"""
            SELECT COUNT(*) FROM dbo.Enrollments e JOIN dbo.Classes cl ON cl.ClassId=e.ClassId
            JOIN dbo.Courses c ON c.CourseId=cl.CourseId
            WHERE e.StudentId={student} AND e.Status=N'Active' AND c.Status=N'Published'
                AND c.CourseCode IN (N'DEMO-SEED-PY',N'DEMO-SEED-3D');
            """));
        Assert.Equal(4, await database.Scalar("""
            SELECT COUNT(*) FROM dbo.ClassSessions s JOIN dbo.Classes cl ON cl.ClassId=s.ClassId
                WHERE cl.ClassCode IN (N'DEMO-SEED-PY-01',N'DEMO-SEED-3D-01') AND s.Status=N'Scheduled';
            """));

        await database.Execute($"""
            UPDATE dbo.Users SET PasswordHash=N'changed-hash' WHERE UserId={student};
            UPDATE dbo.ParentStudentLinks SET Status=N'Revoked' WHERE ParentId={parent} AND StudentId={student};
            UPDATE dbo.Courses SET Name=N'Edited course' WHERE CourseCode=N'DEMO-SEED-PY';
            """);
        db.ChangeTracker.Clear();
        await DbInitializer.SeedAsync(db, hasher);
        Assert.Equal(1, await database.Scalar($"SELECT COUNT(*) FROM dbo.Users WHERE UserId={student} AND PasswordHash=N'changed-hash';"));
        Assert.Equal(1, await database.Scalar($"""
            SELECT COUNT(*) FROM dbo.ParentStudentLinks
            WHERE ParentId={parent} AND StudentId={student} AND Status=N'Revoked';
            """));
        Assert.Equal(1, await database.Scalar("SELECT COUNT(*) FROM dbo.Courses WHERE CourseCode=N'DEMO-SEED-PY' AND Name=N'Edited course';"));
        Assert.Equal(6, await database.Scalar("""
            SELECT COUNT(*) FROM dbo.Lessons l JOIN dbo.Courses c ON c.CourseId=l.CourseId
            WHERE c.CourseCode IN (N'DEMO-SEED-PY',N'DEMO-SEED-3D');
            """));
        Assert.Equal(6, await database.Scalar("""
            SELECT COUNT(*) FROM dbo.ClassSessions s JOIN dbo.Classes cl ON cl.ClassId=s.ClassId
            WHERE cl.ClassCode IN (N'DEMO-SEED-PY-01',N'DEMO-SEED-3D-01');
            """));
    }
}
