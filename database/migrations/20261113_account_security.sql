SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF COL_LENGTH('Users','LockoutEndAt') IS NULL ALTER TABLE Users ADD LockoutEndAt datetime2 NULL;
IF COL_LENGTH('Users','SecurityVersion') IS NULL ALTER TABLE Users ADD SecurityVersion int NOT NULL CONSTRAINT DF_Users_SecurityVersion DEFAULT 0;
IF COL_LENGTH('Users','Bio') IS NULL ALTER TABLE Users ADD Bio nvarchar(1000) NULL;
IF OBJECT_ID('AccountEmails') IS NULL CREATE TABLE AccountEmails (
 Id bigint IDENTITY PRIMARY KEY, Recipient nvarchar(max) NOT NULL, Subject nvarchar(max) NOT NULL,
 ProtectedBody nvarchar(max) NOT NULL, CreatedAt datetime2 NOT NULL, SentAt datetime2 NULL,
 Attempts int NOT NULL, NextAttemptAt datetime2 NOT NULL);
COMMIT;
-- Existing administrative Locked statuses are intentionally not changed.
