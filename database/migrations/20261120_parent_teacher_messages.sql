CREATE TABLE dbo.ParentTeacherMessages (
    MessageId bigint IDENTITY PRIMARY KEY,
    ClientId uniqueidentifier NOT NULL UNIQUE,
    ParentId int NOT NULL REFERENCES dbo.ParentProfiles(UserId),
    StudentId int NOT NULL REFERENCES dbo.StudentProfiles(UserId),
    TeacherId int NOT NULL REFERENCES dbo.TeacherProfiles(UserId),
    SenderId int NOT NULL REFERENCES dbo.Users(UserId),
    Body nvarchar(2000) NULL,
    AttachmentName nvarchar(180) NULL,
    AttachmentContent varbinary(max) NULL,
    SentAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
    ReadAt datetime2 NULL,
    CONSTRAINT CK_ParentTeacherMessages_Sender CHECK(SenderId = ParentId OR SenderId = TeacherId),
    CONSTRAINT CK_ParentTeacherMessages_Payload CHECK(
        (Body IS NOT NULL OR AttachmentName IS NOT NULL) AND
        ((AttachmentName IS NULL AND AttachmentContent IS NULL) OR
         (AttachmentName IS NOT NULL AND AttachmentContent IS NOT NULL AND DATALENGTH(AttachmentContent) BETWEEN 1 AND 5242880))
    )
);
CREATE INDEX IX_ParentTeacherMessages_Thread ON dbo.ParentTeacherMessages(ParentId, StudentId, TeacherId, MessageId DESC);
CREATE INDEX IX_ParentTeacherMessages_Teacher ON dbo.ParentTeacherMessages(TeacherId, StudentId, ParentId);
