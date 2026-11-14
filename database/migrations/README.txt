DEVELOPMENT DATABASE UPDATES

After pulling code, configure ConnectionStrings:DefaultConnection for your SQL Server instance,
then run from the repository root:
  dotnet run --project backend/src/TekyLearningHub.Api --launch-profile http

The http/https launch profiles select Development. Before listening for requests, the API:
  1. Creates the configured database if missing (requires CREATE DATABASE permission).
  2. Acquires a SQL Server application lock so two API processes cannot migrate simultaneously.
  3. Creates the initial schema ONLY if the database is empty.
  4. For an existing schema, checks all baseline tables and records a baseline without recreating them.
  5. Runs pending SQL scripts in filename order and records checksums in dbo.__TekySchemaMigrations.
  6. Seeds only missing demo roles/accounts using the existing DbInitializer. Existing users,
     password hashes, account status, role assignments, sessions and learning data are not overwritten.

An already manually applied 20261113_account_security.sql is safe to adopt: it adds only missing
columns/table. Subsequent startups skip it. No legacy full-data MERGE seed script is replayed.
Missing/incompatible baseline tables or a migration error stop startup with a clear error.
Schema changes and migration history are committed together, or rolled back together.
Production/Staging do not automatically migrate or seed. No EnsureDeleted, database reset,
full-script replay, or automatic EF schema synchronization is used.

ADDING A CHANGE
  Add a new YYYYMMDD_description.sql file in this directory, then commit it with the code.
  Files are embedded in the Infrastructure assembly and work from build/publish output.
  Never edit/delete an applied script or Data/Migrations/00000000_baseline.sql: checksum validation
  will reject it. Create a later script for corrections. Do not include USE, CREATE DATABASE,
  DROP DATABASE, or database-reset/full-seed scripts. Prefer scripts without their own transaction;
  the runner provides one transaction and supports GO on a line of its own.
  Automatic migration does NOT infer changes from C# entity edits; a SQL script is still required.
  Review every new SQL script for data preservation. The runner cannot make destructive SQL safe.

EXISTING DATABASES
  Existing complete schemas are adopted as-is; custom indexes and data are preserved.
  The baseline validates table presence, not every historical type, column, trigger or view.
  A partial or incompatible custom schema needs manual reconciliation; it is never reset.
  Do not combine this journal with Database.Migrate/EnsureCreated without a planned conversion.

SQL SERVER INTEGRATION TESTS (temporary databases created and removed by tests only)
  $env:TEKY_MIGRATION_TEST_CONNECTION = 'Server=.\SQLEXPRESS;Database=master;Integrated Security=True;Encrypt=True;TrustServerCertificate=True;'
  dotnet test backend/tests/TekyLearningHub.Application.Tests/TekyLearningHub.Application.Tests.csproj --filter FullyQualifiedName~DatabaseMigrationTests
  Remove-Item Env:TEKY_MIGRATION_TEST_CONNECTION

The test SQL login needs permission to create/drop disposable Teky_MigrationTests_<guid> databases.
Without the environment variable, integration tests are explicitly skipped; catalog tests still run.
