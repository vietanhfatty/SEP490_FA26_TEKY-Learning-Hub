SET XACT_ABORT ON;
-- Keep activation independent from administrative locking.
ALTER TABLE dbo.Users ADD ActivationPending bit NOT NULL CONSTRAINT DF_Users_ActivationPending DEFAULT 0,
 AdministrationVersion int NOT NULL CONSTRAINT DF_Users_AdministrationVersion DEFAULT 0;
DECLARE @constraint sysname;
SELECT @constraint=cc.name FROM sys.check_constraints cc
WHERE cc.parent_object_id=OBJECT_ID('dbo.Users') AND cc.definition LIKE '%Status%';
IF @constraint IS NOT NULL
BEGIN
 DECLARE @drop nvarchar(500)=N'ALTER TABLE dbo.Users DROP CONSTRAINT '+QUOTENAME(@constraint);
 EXEC(@drop);
END;
ALTER TABLE dbo.Users ADD CONSTRAINT CK_Users_Status CHECK(Status IN (N'Active',N'Locked',N'Pending'));
IF EXISTS(SELECT LOWER(LTRIM(RTRIM(Email))) FROM dbo.Users GROUP BY LOWER(LTRIM(RTRIM(Email))) HAVING COUNT(*)>1)
 THROW 51200,'Resolve duplicate normalized emails before migrating.',1;
ALTER TABLE dbo.Users ADD NormalizedEmail AS LOWER(LTRIM(RTRIM(Email))) PERSISTED;
CREATE UNIQUE INDEX UX_Users_NormalizedEmail ON dbo.Users(NormalizedEmail);
CREATE TABLE dbo.AccountInvitations (
 Id bigint IDENTITY PRIMARY KEY,
 UserId int NOT NULL REFERENCES dbo.Users(UserId),
 TokenHash nvarchar(255) NOT NULL,
 ExpiresAt datetime2 NOT NULL,
 UsedAt datetime2 NULL,
 RevokedAt datetime2 NULL,
 CreatedBy int NOT NULL REFERENCES dbo.Users(UserId),
 CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE UNIQUE INDEX UX_AccountInvitations_Active ON dbo.AccountInvitations(UserId) WHERE UsedAt IS NULL AND RevokedAt IS NULL;
CREATE INDEX IX_AccountInvitations_Token ON dbo.AccountInvitations(TokenHash);
