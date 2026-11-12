using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;

namespace TekyLearningHub.Infrastructure.Data.Migrations;

/// <summary>
/// Applies the repository's versioned SQL to development databases. Existing schemas are
/// baselined without replaying CREATE TABLE or the legacy demo-data MERGE scripts.
/// </summary>
public static class DevelopmentDatabaseMigrator
{
    public static Task ApplyAsync(string connectionString, ILogger logger, CancellationToken cancellationToken = default) =>
        ApplyAsync(connectionString, SqlMigrationCatalog.Load(), logger, cancellationToken);

    internal static async Task ApplyAsync(string connectionString, IReadOnlyList<SqlMigration> migrations,
        ILogger logger, CancellationToken cancellationToken = default)
    {
        if (migrations.Count == 0 || migrations[0].Name != SqlMigrationCatalog.BaselineName)
            throw new InvalidOperationException("The embedded database baseline is missing.");
        if (migrations.Select(m => m.Name).Distinct(StringComparer.Ordinal).Count() != migrations.Count)
            throw new InvalidOperationException("Migration filenames must be unique.");

        var settings = new SqlConnectionStringBuilder(connectionString);
        if (string.IsNullOrWhiteSpace(settings.InitialCatalog) ||
            new[] { "master", "model", "msdb", "tempdb" }.Contains(settings.InitialCatalog, StringComparer.OrdinalIgnoreCase))
            throw new InvalidOperationException("Configure a non-system database in ConnectionStrings:DefaultConnection.");

        await EnsureDatabaseAsync(settings, cancellationToken);
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync(cancellationToken);
        try
        {
            // Transaction-owned lock serializes Portal/Backoffice API startup against the same DB.
            await ExecuteAsync(connection, transaction, """
                DECLARE @result int;
                EXEC @result = sys.sp_getapplock @Resource=N'Teky.SchemaMigrations',
                    @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=60000;
                IF @result < 0 THROW 51000, 'Could not acquire the database migration lock.', 1;
                IF OBJECT_ID(N'dbo.__TekySchemaMigrations', N'U') IS NULL
                    CREATE TABLE dbo.__TekySchemaMigrations (
                        ScriptName nvarchar(200) NOT NULL PRIMARY KEY,
                        Checksum char(64) NOT NULL,
                        AppliedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
                        AppliedAs nvarchar(20) NOT NULL);
                """, cancellationToken);

            var history = new Dictionary<string, string>(StringComparer.Ordinal);
            await using (var command = Command(connection, transaction,
                "SELECT ScriptName, Checksum FROM dbo.__TekySchemaMigrations;"))
            await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
                while (await reader.ReadAsync(cancellationToken)) history.Add(reader.GetString(0), reader.GetString(1));

            foreach (var applied in history)
            {
                var script = migrations.SingleOrDefault(m => m.Name == applied.Key);
                if (script == null || script.Checksum != applied.Value)
                    throw new InvalidOperationException($"Applied migration {applied.Key} was changed or removed. Restore it and add a new migration instead.");
            }

            foreach (var migration in migrations)
            {
                if (history.ContainsKey(migration.Name)) continue;
                var baselined = false;
                if (migration.Name == SqlMigrationCatalog.BaselineName)
                {
                    var tables = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                    await using var command = Command(connection, transaction,
                        "SELECT t.name FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id WHERE s.name=N'dbo' AND t.name<>N'__TekySchemaMigrations';");
                    await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
                        while (await reader.ReadAsync(cancellationToken)) tables.Add(reader.GetString(0));
                    if (tables.Count > 0)
                    {
                        var missing = SqlMigrationCatalog.BaselineTables(migration.Script).Where(name => !tables.Contains(name)).ToArray();
                        if (missing.Length > 0)
                            throw new InvalidOperationException($"Database schema is incomplete. No tables were recreated. Missing baseline tables: {string.Join(", ", missing)}.");
                        baselined = true;
                    }
                }

                if (!baselined)
                    foreach (var batch in SqlMigrationCatalog.Batches(migration.Script))
                        await ExecuteAsync(connection, transaction, batch, cancellationToken);

                await using var insert = Command(connection, transaction,
                    "INSERT dbo.__TekySchemaMigrations(ScriptName,Checksum,AppliedAs) VALUES(@name,@checksum,@mode);");
                insert.Parameters.Add("@name", SqlDbType.NVarChar, 200).Value = migration.Name;
                insert.Parameters.Add("@checksum", SqlDbType.Char, 64).Value = migration.Checksum;
                insert.Parameters.Add("@mode", SqlDbType.NVarChar, 20).Value = baselined ? "Baselined" : "Applied";
                await insert.ExecuteNonQueryAsync(cancellationToken);
                logger.LogInformation("Database migration {Migration}: {Mode}", migration.Name, baselined ? "baselined existing tables" : "applied");
            }
            await transaction.CommitAsync(cancellationToken);
            logger.LogInformation("Development database schema is up to date.");
        }
        catch
        {
            // XACT_ABORT inside a SQL script can already have rolled the transaction back.
            if (transaction.Connection != null) await transaction.RollbackAsync(CancellationToken.None);
            throw;
        }
    }

    private static async Task EnsureDatabaseAsync(SqlConnectionStringBuilder settings, CancellationToken cancellationToken)
    {
        // Existing DB users do not need CREATE DATABASE or access to master just to apply updates.
        try
        {
            await using var existing = new SqlConnection(settings.ConnectionString);
            await existing.OpenAsync(cancellationToken);
            return;
        }
        catch (SqlException ex) when (ex.Number == 4060) { }

        var database = settings.InitialCatalog;
        var master = new SqlConnectionStringBuilder(settings.ConnectionString) { InitialCatalog = "master" };
        await using var connection = new SqlConnection(master.ConnectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandTimeout = 90;
        command.CommandText = """
            DECLARE @result int;
            EXEC @result=sys.sp_getapplock @Resource=@lock, @LockMode='Exclusive', @LockOwner='Session', @LockTimeout=60000;
            IF @result<0 THROW 51000, 'Could not acquire database creation lock.', 1;
            BEGIN TRY
                IF DB_ID(@database) IS NULL BEGIN
                    DECLARE @sql nvarchar(max)=N'CREATE DATABASE '+QUOTENAME(@database);
                    EXEC(@sql);
                END;
                EXEC sys.sp_releaseapplock @Resource=@lock, @LockOwner='Session';
            END TRY
            BEGIN CATCH
                EXEC sys.sp_releaseapplock @Resource=@lock, @LockOwner='Session';
                THROW;
            END CATCH;
            """;
        command.Parameters.AddWithValue("@database", database);
        command.Parameters.AddWithValue("@lock", "Teky.CreateDatabase." + database);
        await command.ExecuteNonQueryAsync(cancellationToken);
        SqlConnection.ClearPool(new SqlConnection(settings.ConnectionString));
    }

    private static SqlCommand Command(SqlConnection connection, SqlTransaction transaction, string sql) =>
        new(sql, connection, transaction) { CommandTimeout = 90 };

    private static async Task ExecuteAsync(SqlConnection connection, SqlTransaction transaction, string sql, CancellationToken cancellationToken)
    {
        await using var command = Command(connection, transaction, sql);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}
