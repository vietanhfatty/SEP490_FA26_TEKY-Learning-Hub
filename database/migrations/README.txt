DEVELOPMENT DATABASE UPDATES

TEAM PULL CHECKLIST (current schema)
  Pull the backend code AND every new SQL migration together. Run the http/https profile
  normally; it automatically applies missing migrations before API requests are accepted.
  Or apply migrations only (without HTTP server or demo seeding):
    dotnet run --project backend/src/TekyLearningHub.Api --launch-profile migrate
  Override the connection for your own machine without editing committed settings:
    $env:ConnectionStrings__DefaultConnection = 'Server=.\SQLEXPRESS;Database=Teky_Learning_Hub;Integrated Security=True;Encrypt=True;TrustServerCertificate=True;'

  Ordered scripts embedded in every backend build:
    00000000_baseline.sql (Infrastructure/Data/Migrations; empty DB or baseline existing DB)
    20261113_account_security.sql
    20261114_course_lifecycle_status.sql
    20261114_student_project_submissions.sql
    20261115_academic_governance.sql
    20261116_account_administration.sql
    20261117_student_learning_feedback.sql
    20261118_student_assessments.sql
    20261119_parent_portal.sql
    20261120_parent_teacher_messages.sql
    20261121_seed_demo_student_parent.sql
  Governance preserves existing role IDs and accounts, changes Users.RoleId to PrimaryRoleId,
  and adds scoped grants/content approval tables. Administration adds invitations, normalized
  email uniqueness, activation state, and administration concurrency version. Existing users
  are not converted to pending activation. Existing duplicate normalized emails stop migration
  with an explicit error; resolve those records rather than resetting the database.
  Each machine applies its own missing scripts using its own migration journal.
  No dotnet ef database update or hand-run SQL is required.

After pulling code, configure ConnectionStrings:DefaultConnection for your SQL Server instance,
then run from the repository root:
  dotnet run --project backend/src/TekyLearningHub.Api --launch-profile http

The http/https launch profiles select Development. Before listening for requests, the API:
  1. Creates the configured database if missing (requires CREATE DATABASE permission).
  2. Acquires a SQL Server application lock so two API processes cannot migrate simultaneously.
  3. Creates the initial schema ONLY if the database is empty.
  4. For an existing schema, checks all baseline tables and records a baseline without recreating them.
  5. Runs pending SQL scripts in filename order and records checksums in dbo.__TekySchemaMigrations.
  6. Seeds missing demo roles/accounts using DbInitializer, then adds the demo family link,
     two published courses, lessons, classes, timetables and enrollments. Existing records are
     preserved, including revoked links and changed passwords.

To apply migrations and demo seed without starting a second HTTP server:
  dotnet run --project backend/src/TekyLearningHub.Api --launch-profile seed-demo

Sign in at http://localhost:5173/login with student@teky.edu.vn or parent@teky.edu.vn.
New demo accounts use the existing Development demo password. The two course codes are
DEMO-SEED-PY and DEMO-SEED-3D. The migrate profile applies schema without demo data.

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

PARENT QR CHECKOUT
  Development defaults to Demo mode. Use Course Management to buy DEMO-QR-STEM for a linked
  student, then open the simulated payment page from Payment and confirm. The course appears in
  My Courses. The demo course is seeded without an enrollment and this mode only runs in Development.

  For live VietQR, use a dedicated payOS merchant channel. Set PaymentGateway__Mode=PayOS,
  PaymentGateway__ClientId, PaymentGateway__ApiKey and PaymentGateway__ChecksumKey through the
  API environment or secret store. Set Shells__PortalOrigin to the portal HTTPS origin.
  In payOS, register the public HTTPS API URL ending in /api/payments/payos/webhook.
  The API verifies callbacks and reads payOS status over an authenticated connection before
  recording the payment. The reconciliation worker also checks pending payOS orders.
  Apply migrations before enabling this mode outside Development, and use a database and
  merchant channel dedicated to that environment.

ACADEMIC MANAGER
  20261126_academic_operations.sql adds the approval workflow, availability, operation versions,
  makeup-session assignments and STEM equipment. Academic grants remain scoped to existing
  active role grants. GLOBAL academic.manage controls shared room/availability/equipment edits.
  Development seeds DEMO-AM-STEM and two classes with registration and makeup examples.
  See docs/architecture/academic-operations.md for lifecycle and payment integration.
