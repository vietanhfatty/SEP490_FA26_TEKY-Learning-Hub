using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Infrastructure.Data;
using TekyLearningHub.Infrastructure.Security;
using Xunit;

namespace TekyLearningHub.Application.Tests;

public class AcademicGovernanceTests
{
    private const string Setup = """
        INSERT dbo.Users(Email,PasswordHash,PrimaryRoleId,FullName) VALUES
        ('editor@test.local','hash',5,N'Editor'),('commenter@test.local','hash',5,N'Commenter'),
        ('manager@test.local','hash',6,N'Manager'),('admin@test.local','hash',3,N'Admin');
        INSERT dbo.UserRoles(UserId,RoleId,ScopeType,DepartmentId) VALUES
        (1,5,'DEPARTMENT',1),(2,5,'DEPARTMENT',1),(3,6,'DEPARTMENT',1),(4,3,'GLOBAL',NULL);
        INSERT dbo.StaffAppointments(UserId,DepartmentId,PositionId,EmploymentType)
        SELECT x.UserId,1,p.PositionId,x.EmploymentType FROM (VALUES
        (1,'ACADEMIC_SPECIALIST','FULL_TIME'),(2,'TRAINING_QA','PART_TIME'),(3,'PD_ACADEMIC','FULL_TIME')) x(UserId,Code,EmploymentType)
        JOIN dbo.Positions p ON p.Code=x.Code AND p.DepartmentId=1;
        INSERT dbo.Contents(DepartmentId,ContentType,CreatedBy) VALUES(1,'DOCUMENT',3);
        INSERT dbo.ContentVersions(ContentId,VersionNo,Title,Payload,CreatedBy) VALUES(1,1,N'Robotics',N'{"lesson":"v1"}',1);
        UPDATE dbo.Contents SET CandidateVersionId=1 WHERE ContentId=1;
        INSERT dbo.ContentAssignments(ContentId,UserId,AssignmentType,AssignedBy) VALUES(1,1,'EDITOR',3),(1,2,'COMMENTER',3);
        """;

    [SqlServerFact]
    public async Task SameRoleRequiresAssignmentAndDepartmentAndDraftToEdit()
    {
        await using var database = new DatabaseMigrationTests.TestDatabase();
        await database.Migrate(); await database.Execute(Setup);
        await using var db = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseSqlServer(database.ConnectionString).Options);
        var permission = new AcademicPermissionReader(db);
        Assert.True(await permission.CanEditAsync(1, 1));
        Assert.False(await permission.CanEditAsync(2, 1));
        Assert.False(await permission.CanEditAsync(3, 1));
        Assert.False(await permission.CanEditAsync(4, 1));
        await database.Execute("UPDATE dbo.UserRoles SET RevokedAt=SYSUTCDATETIME() WHERE UserId=1;");
        Assert.False(await permission.CanEditAsync(1, 1));
        await database.Execute("INSERT dbo.Departments(Code,Name) VALUES('OTHER',N'Other'); INSERT dbo.UserRoles(UserId,RoleId,ScopeType,DepartmentId) VALUES(1,5,'DEPARTMENT',2);");
        Assert.False(await permission.CanEditAsync(1, 1));
    }

    [SqlServerFact]
    public async Task AllMembersApproveExactVersionBeforePublication()
    {
        await using var db = new DatabaseMigrationTests.TestDatabase();
        await db.Migrate(); await db.Execute(Setup);
        await db.Execute("EXEC dbo.OpenContentApproval @ContentId=1,@ActorId=3;");
        Assert.Equal(3, await db.Scalar("SELECT COUNT(*) FROM dbo.ApprovalParticipants WHERE RoundId=1"));
        await Reject(db, "UPDATE dbo.ContentVersions SET Payload=N'{}' WHERE VersionId=1;");
        await Reject(db, "DELETE dbo.ApprovalParticipants WHERE RoundId=1 AND UserId=2;");
        await Reject(db, "EXEC dbo.SubmitContentDecision 1,4,'APPROVE';");
        await Reject(db, "EXEC dbo.PublishAcademicContent 1,3;");
        await db.Execute("EXEC dbo.SubmitContentDecision 1,1,'APPROVE';");
        await Reject(db, "EXEC dbo.SubmitContentDecision 1,1,'APPROVE';");
        await Reject(db, "UPDATE dbo.ApprovalDecisions SET Decision='REQUEST_CHANGES',Comment=N'Changed' WHERE RoundId=1 AND UserId=1;");
        await db.Execute("EXEC dbo.SubmitContentDecision 1,2,'REQUEST_CHANGES',N'Please revise';");
        Assert.Equal(1, await db.Scalar("SELECT COUNT(*) FROM dbo.ApprovalRounds WHERE RoundId=1 AND Status='CHANGES_REQUESTED'"));
        await Reject(db, "EXEC dbo.SubmitContentDecision 1,3,'APPROVE';");
        await db.Execute("INSERT dbo.ContentVersions(ContentId,VersionNo,BaseVersionId,Title,Payload,CreatedBy) VALUES(1,2,1,N'Revised',N'{}',1); UPDATE dbo.Contents SET CandidateVersionId=2 WHERE ContentId=1; EXEC dbo.OpenContentApproval 1,3;");
        Assert.Equal(0, await db.Scalar("SELECT COUNT(*) FROM dbo.ApprovalDecisions WHERE RoundId=2"));
        await db.Execute("EXEC dbo.SubmitContentDecision 2,1,'APPROVE';");
        await Task.WhenAll(db.Execute("EXEC dbo.SubmitContentDecision 2,2,'APPROVE';"), db.Execute("EXEC dbo.SubmitContentDecision 2,3,'APPROVE';"));
        await Reject(db, "EXEC dbo.PublishAcademicContent 2,4;");
        await db.Execute("EXEC dbo.PublishAcademicContent 2,3;");
        Assert.Equal(2, await db.Scalar("SELECT PublishedVersionId FROM dbo.Contents WHERE ContentId=1"));
        Assert.Equal(1, await db.Scalar("SELECT COUNT(*) FROM dbo.ContentPublications"));
        await Reject(db, "EXEC dbo.PublishAcademicContent 2,3;");
        await Reject(db, "DELETE dbo.ContentPublications;");
    }

    [SqlServerFact]
    public async Task CompositeKeysAndActiveGrantUniquenessPreventInvalidLinks()
    {
        await using var db = new DatabaseMigrationTests.TestDatabase();
        await db.Migrate(); await db.Execute(Setup);
        await Reject(db, "INSERT dbo.UserRoles(UserId,RoleId,ScopeType,DepartmentId) VALUES(1,5,'DEPARTMENT',1);");
        await Reject(db, "INSERT dbo.UserRoles(UserId,RoleId,ScopeType) VALUES(1,5,'DEPARTMENT');");
        await Reject(db, "INSERT dbo.UserRoles(UserId,RoleId,ScopeType,DepartmentId) VALUES(1,3,'DEPARTMENT',1);");
        await db.Execute("INSERT dbo.Contents(DepartmentId,ContentType,CreatedBy) VALUES(1,'DOCUMENT',3);");
        await Reject(db, "UPDATE dbo.Contents SET CandidateVersionId=1 WHERE ContentId=2;");
        await Reject(db, "INSERT dbo.ContentVersions(ContentId,VersionNo,BaseVersionId,Title,Payload,CreatedBy) VALUES(2,1,1,N'Wrong base',N'{}',1);");
        await Reject(db, "UPDATE dbo.Contents SET PublishedVersionId=1 WHERE ContentId=1;");
    }

    [SqlServerFact]
    public async Task MissingRosterAndIncompleteRosterCannotBeApproved()
    {
        await using var db = new DatabaseMigrationTests.TestDatabase();
        await db.Migrate(); await db.Execute(Setup);
        await db.Execute("UPDATE dbo.StaffAppointments SET ValidTo=DATEADD(second,1,ValidFrom);");
        // Use a past membership interval, so the department has no current members.
        await db.Execute("UPDATE dbo.StaffAppointments SET ValidFrom='2000-01-01',ValidTo='2001-01-01';");
        await Reject(db, "EXEC dbo.OpenContentApproval 1,3;");
        await db.Execute("UPDATE dbo.StaffAppointments SET ValidTo=NULL; UPDATE dbo.ContentVersions SET Status='FROZEN',FrozenAt=SYSUTCDATETIME() WHERE VersionId=1; INSERT dbo.ApprovalRounds(ContentId,VersionId,DepartmentId,RoundNo,OpenedBy) VALUES(1,1,1,1,3); INSERT dbo.ApprovalParticipants(RoundId,UserId,ParticipantSnapshot) VALUES(1,1,N'{}');");
        await Reject(db, "UPDATE dbo.ApprovalRounds SET Status='OPEN',OpenedAt=SYSUTCDATETIME() WHERE RoundId=1;");
    }

    private static Task<SqlException> Reject(DatabaseMigrationTests.TestDatabase db, string sql) => Assert.ThrowsAsync<SqlException>(() => db.Execute(sql));
}
