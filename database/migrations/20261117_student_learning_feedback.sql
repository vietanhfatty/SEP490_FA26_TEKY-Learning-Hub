SET XACT_ABORT ON;
ALTER TABLE dbo.StudentProjectSubmissions ADD
 AttemptNo int NOT NULL CONSTRAINT DF_Project_Attempt DEFAULT 1,
 ReviewStatus varchar(20) NOT NULL CONSTRAINT DF_Project_Review DEFAULT 'Pending',
 Feedback nvarchar(2000) NULL, ReviewedBy int NULL, ReviewedAt datetime2 NULL;
ALTER TABLE dbo.StudentProjectSubmissions ADD CONSTRAINT CK_Project_Review CHECK(ReviewStatus IN ('Pending','NeedsRevision','Passed')),
 CONSTRAINT FK_Project_Reviewer FOREIGN KEY(ReviewedBy) REFERENCES dbo.Users(UserId);
CREATE TABLE dbo.StudentProjectVersions (
 AssignmentId int NOT NULL, StudentId int NOT NULL, AttemptNo int NOT NULL,
 FileName nvarchar(180) NOT NULL, Content varbinary(max) NOT NULL, SubmittedAt datetime2 NOT NULL,
 ReviewStatus varchar(20) NOT NULL, Feedback nvarchar(2000) NULL, ReviewedBy int NULL, ReviewedAt datetime2 NULL,
 CONSTRAINT PK_StudentProjectVersions PRIMARY KEY(AssignmentId,StudentId,AttemptNo),
 CONSTRAINT FK_ProjectVersions_Current FOREIGN KEY(AssignmentId,StudentId) REFERENCES dbo.StudentProjectSubmissions(AssignmentId,StudentId)
);
