CREATE TABLE dbo.StudentProjectSubmissions
(
    AssignmentId INT NOT NULL REFERENCES dbo.Assignments(AssignmentId),
    StudentId INT NOT NULL REFERENCES dbo.StudentProfiles(UserId),
    FileName NVARCHAR(180) NOT NULL,
    Content VARBINARY(MAX) NOT NULL,
    SubmittedAt DATETIME2 NOT NULL,
    CONSTRAINT PK_StudentProjectSubmissions PRIMARY KEY (AssignmentId, StudentId),
    CONSTRAINT CK_StudentProjectSubmissions_ContentSize CHECK (DATALENGTH(Content) BETWEEN 1 AND 10485760)
);
