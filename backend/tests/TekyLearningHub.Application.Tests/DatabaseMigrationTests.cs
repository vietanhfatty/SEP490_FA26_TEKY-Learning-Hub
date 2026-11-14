using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging.Abstractions;
using TekyLearningHub.Infrastructure.Data.Migrations;
using Xunit;

namespace TekyLearningHub.Application.Tests;

public sealed class SqlServerFactAttribute : FactAttribute
{
    public SqlServerFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("TEKY_MIGRATION_TEST_CONNECTION")))
            Skip = "Set TEKY_MIGRATION_TEST_CONNECTION to run against disposable SQL Server databases.";
    }
}

public class DatabaseMigrationTests
{
    [Fact]
    public void CatalogIncludesFrozenSchemaAndOrderedVersionedScripts()
    {
        var catalog = SqlMigrationCatalog.Load();
        Assert.Equal(SqlMigrationCatalog.BaselineName, catalog[0].Name);
        Assert.Contains(catalog, x => x.Name == "20261113_account_security.sql");
        Assert.Equal(44, SqlMigrationCatalog.BaselineTables(catalog[0].Script).Count);
        Assert.DoesNotContain("MERGE INTO", catalog[0].Script);
        Assert.DoesNotContain("CREATE DATABASE", catalog[0].Script);
    }

    [Fact]
    public void ChecksumSurvivesGitLineEndingConversionAndDetectsEdits()
    {
        Assert.Equal(new SqlMigration("x", "SELECT 1;\r\n").Checksum, new SqlMigration("x", "SELECT 1;\n").Checksum);
        Assert.NotEqual(new SqlMigration("x", "SELECT 1;").Checksum, new SqlMigration("x", "SELECT 2;").Checksum);
    }

    [SqlServerFact]
    public async Task FreshDatabaseIsCreatedAndSecondStartupDoesNotReplayScripts()
    {
        await using var db = new TestDatabase();
        await db.Migrate();
        var history = await db.Scalar("SELECT COUNT(*) FROM dbo.__TekySchemaMigrations");
        Assert.Equal(2, history);
        Assert.Equal(1, await db.Scalar("SELECT COUNT(*) FROM sys.views WHERE name='vw_ClassGradebook'"));
        Assert.Equal(1, await db.Scalar("SELECT COUNT(*) FROM sys.triggers WHERE name='trg_AuditLogs_NoChange'"));
        await db.Execute("INSERT dbo.Roles VALUES(1,'Student'); INSERT dbo.Users(Email,PasswordHash,RoleId,FullName) VALUES('keep@example.com','original-hash',1,N'Giữ nguyên');");
        await db.Migrate();
        Assert.Equal(history, await db.Scalar("SELECT COUNT(*) FROM dbo.__TekySchemaMigrations"));
        Assert.Equal(1, await db.Scalar("SELECT COUNT(*) FROM dbo.Users WHERE Email='keep@example.com' AND PasswordHash='original-hash' AND FullName=N'Giữ nguyên'"));
    }

    [SqlServerFact]
    public async Task LegacySchemaIsBaselinedWithoutChangingExistingRows()
    {
        await using var db = new TestDatabase();
        await db.Create();
        foreach (var batch in SqlMigrationCatalog.Batches(SqlMigrationCatalog.Load()[0].Script)) await db.Execute(batch);
        await db.Execute("INSERT dbo.Roles VALUES(1,'Student'); INSERT dbo.Users(Email,PasswordHash,RoleId,FullName,Status,FailedLoginCount) VALUES('keep@example.com','keep-hash',1,N'Tên cũ','Locked',4); INSERT dbo.UserSessions(UserId,TokenHash) SELECT UserId,'keep-session' FROM dbo.Users; INSERT dbo.PasswordResetOtps(UserId,OtpHash,ExpiresAt) SELECT UserId,'keep-otp',DATEADD(minute,5,SYSUTCDATETIME()) FROM dbo.Users; INSERT dbo.AuditLogs(ActorType,Action) VALUES('System','KEEP');");
        await db.Migrate();
        Assert.Equal(1, await db.Scalar("SELECT COUNT(*) FROM dbo.__TekySchemaMigrations WHERE AppliedAs='Baselined'"));
        Assert.Equal(1, await db.Scalar("SELECT COUNT(*) FROM dbo.Users WHERE Email='keep@example.com' AND PasswordHash='keep-hash' AND FullName=N'Tên cũ' AND Status='Locked' AND FailedLoginCount=4 AND SecurityVersion=0 AND LockoutEndAt IS NULL AND Bio IS NULL"));
        Assert.Equal(1, await db.Scalar("SELECT COUNT(*) FROM dbo.UserSessions WHERE TokenHash='keep-session'"));
        Assert.Equal(1, await db.Scalar("SELECT COUNT(*) FROM dbo.PasswordResetOtps WHERE OtpHash='keep-otp'"));
        Assert.Equal(1, await db.Scalar("SELECT COUNT(*) FROM dbo.AuditLogs WHERE Action='KEEP'"));
    }

    [SqlServerFact]
    public async Task ManuallyAppliedAccountScriptCanBeAdopted()
    {
        await using var db = new TestDatabase(); await db.Create();
        foreach (var script in SqlMigrationCatalog.Load())
            foreach (var batch in SqlMigrationCatalog.Batches(script.Script)) await db.Execute(batch);
        await db.Execute("INSERT dbo.Roles VALUES(1,'Student'); INSERT dbo.Users(Email,PasswordHash,RoleId,FullName,Bio,SecurityVersion) VALUES('keep@example.com','hash',1,'Existing','Keep bio',7);");
        await db.Migrate();
        Assert.Equal(2, await db.Scalar("SELECT COUNT(*) FROM dbo.__TekySchemaMigrations"));
        Assert.Equal(1, await db.Scalar("SELECT COUNT(*) FROM dbo.Users WHERE Bio='Keep bio' AND SecurityVersion=7"));
    }

    [SqlServerFact]
    public async Task ConcurrentStartupsApplyEachScriptOnce()
    {
        await using var db = new TestDatabase();
        await Task.WhenAll(db.Migrate(), db.Migrate());
        Assert.Equal(2, await db.Scalar("SELECT COUNT(*) FROM dbo.__TekySchemaMigrations"));
    }

    [SqlServerFact]
    public async Task FailedScriptRollsBackDdlAndHistory()
    {
        await using var db = new TestDatabase(); await db.Migrate();
        var scripts = SqlMigrationCatalog.Load().Append(new SqlMigration("20990101_failure.sql",
            "CREATE TABLE dbo.RollbackProbe(Id int); THROW 51000, 'Expected migration test failure', 1;")).ToList();
        await Assert.ThrowsAsync<SqlException>(() => DevelopmentDatabaseMigrator.ApplyAsync(db.ConnectionString, scripts, NullLogger.Instance));
        Assert.Equal(0, await db.Scalar("SELECT COUNT(*) FROM sys.tables WHERE name='RollbackProbe'"));
        Assert.Equal(2, await db.Scalar("SELECT COUNT(*) FROM dbo.__TekySchemaMigrations"));
    }

    [SqlServerFact]
    public async Task ModifiedMigrationAndPartialSchemaAreRejected()
    {
        await using var db = new TestDatabase(); await db.Migrate();
        var scripts = SqlMigrationCatalog.Load().Select(x => x.Name==SqlMigrationCatalog.BaselineName ? x with { Script=x.Script+"\n-- changed" } : x).ToList();
        await Assert.ThrowsAsync<InvalidOperationException>(() => DevelopmentDatabaseMigrator.ApplyAsync(db.ConnectionString, scripts, NullLogger.Instance));
        Assert.Equal(2, await db.Scalar("SELECT COUNT(*) FROM dbo.__TekySchemaMigrations"));
        await using var partial = new TestDatabase(); await partial.Create();
        await partial.Execute("CREATE TABLE dbo.Users(Id int); INSERT dbo.Users VALUES(123);");
        await Assert.ThrowsAsync<InvalidOperationException>(() => partial.Migrate());
        Assert.Equal(123, await partial.Scalar("SELECT Id FROM dbo.Users"));
        Assert.Equal(0, await partial.Scalar("SELECT COUNT(*) FROM sys.tables WHERE name='__TekySchemaMigrations'"));
    }

    [SqlServerFact]
    public async Task EveryRoleCanLogoutAgainstSqlServerAuditConstraints()
    {
        await using var database = new TestDatabase(); await database.Migrate();
        using var db = new TekyLearningHub.Infrastructure.Data.ApplicationDbContext(
            Microsoft.EntityFrameworkCore.SqlServerDbContextOptionsExtensions.UseSqlServer(
                new Microsoft.EntityFrameworkCore.DbContextOptionsBuilder<TekyLearningHub.Infrastructure.Data.ApplicationDbContext>(), database.ConnectionString).Options);
        var config = new Microsoft.Extensions.Configuration.ConfigurationBuilder().Build();
        var service = new TekyLearningHub.Infrastructure.Services.AuthService(db,
            new TekyLearningHub.Infrastructure.Security.PasswordHasher(),
            new TekyLearningHub.Infrastructure.Security.JwtTokenGenerator(config));
        string[] roles = ["Student", "Teacher", "Admin", "Parent", "Staff", "AcademicManager"];
        for (byte id=1; id<=6; id++) {
            var role = new TekyLearningHub.Domain.Entities.Role {RoleId=id,RoleName=roles[id-1]};
            var user = new TekyLearningHub.Domain.Entities.User {Email=$"role{id}@example.com",FullName="Test",PasswordHash="hash",RoleId=id,Role=role,Status="Active",ThemeMode="Light"};
            db.Users.Add(user); await db.SaveChangesAsync();
            Assert.True((await service.LogoutAsync(null,user.UserId,"127.0.0.1",true)).Success);
        }
        Assert.Equal(6, await database.Scalar("SELECT COUNT(*) FROM dbo.AuditLogs WHERE ActorType='User' AND Action='USER_LOGOUT_ALL_DEVICES'"));
        db.AuditLogs.Add(new TekyLearningHub.Domain.Entities.AuditLog {ActorType="System",Action="SYSTEM_TEST"});
        await db.SaveChangesAsync();
        Assert.Equal(1, await database.Scalar("SELECT COUNT(*) FROM dbo.AuditLogs WHERE ActorType='System'"));
    }

    private sealed class TestDatabase : IAsyncDisposable
    {
        private readonly string name = "Teky_MigrationTests_" + Guid.NewGuid().ToString("N");
        private readonly SqlConnectionStringBuilder settings = new(Environment.GetEnvironmentVariable("TEKY_MIGRATION_TEST_CONNECTION")!);
        public string ConnectionString { get { var copy=new SqlConnectionStringBuilder(settings.ConnectionString) { InitialCatalog=name, Pooling=false }; return copy.ConnectionString; } }
        public Task Migrate() => DevelopmentDatabaseMigrator.ApplyAsync(ConnectionString, NullLogger.Instance);
        public async Task Create() { await using var master = Master(); await master.OpenAsync(); await using var command=master.CreateCommand();command.CommandText=$"CREATE DATABASE [{name}]";await command.ExecuteNonQueryAsync(); }
        private SqlConnection Master() => new(new SqlConnectionStringBuilder(settings.ConnectionString) { InitialCatalog="master", Pooling=false }.ConnectionString);
        public async Task Execute(string sql) { await using var connection=new SqlConnection(ConnectionString);await connection.OpenAsync();await using var command=connection.CreateCommand();command.CommandText=sql;await command.ExecuteNonQueryAsync(); }
        public async Task<int> Scalar(string sql) { await using var connection=new SqlConnection(ConnectionString);await connection.OpenAsync();await using var command=connection.CreateCommand();command.CommandText=sql;return Convert.ToInt32(await command.ExecuteScalarAsync()); }
        public async ValueTask DisposeAsync()
        {
            // Only drop the uniquely generated database belonging to this test, never a configured app DB.
            if (!System.Text.RegularExpressions.Regex.IsMatch(name,@"^Teky_MigrationTests_[a-f0-9]{32}$")) throw new InvalidOperationException();
            await using var master=Master();await master.OpenAsync();await using var command=master.CreateCommand();
            command.CommandText=$"IF DB_ID(N'{name}') IS NOT NULL BEGIN ALTER DATABASE [{name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [{name}]; END";
            await command.ExecuteNonQueryAsync();
        }
    }
}
