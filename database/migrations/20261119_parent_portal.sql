ALTER TABLE dbo.Courses ADD
    LearningObjectives nvarchar(2000) NULL,
    TuitionVnd int NULL CHECK (TuitionVnd >= 0);

CREATE TABLE dbo.ParentCourseRequests (
    RequestId bigint IDENTITY PRIMARY KEY,
    ParentId int NOT NULL REFERENCES dbo.ParentProfiles(UserId),
    StudentId int NOT NULL REFERENCES dbo.StudentProfiles(UserId),
    ClassId int NOT NULL REFERENCES dbo.Classes(ClassId),
    Status nvarchar(12) NOT NULL DEFAULT N'Pending' CHECK (Status IN (N'Pending', N'Accepted', N'Declined')),
    RequestedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_ParentCourseRequests_StudentClass UNIQUE(StudentId, ClassId)
);
CREATE INDEX IX_ParentCourseRequests_Parent ON dbo.ParentCourseRequests(ParentId, StudentId);

CREATE TABLE dbo.ParentPayments (
    PaymentId int IDENTITY PRIMARY KEY,
    ParentId int NOT NULL REFERENCES dbo.ParentProfiles(UserId),
    StudentId int NOT NULL REFERENCES dbo.StudentProfiles(UserId),
    CourseId int NOT NULL REFERENCES dbo.Courses(CourseId),
    Reference nvarchar(40) NOT NULL UNIQUE,
    InvoiceNumber nvarchar(40) NULL,
    AmountVnd int NOT NULL CHECK (AmountVnd >= 0),
    Status nvarchar(12) NOT NULL CHECK (Status IN (N'Pending', N'Paid', N'Failed', N'Refunded')),
    CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
    PaidAt datetime2 NULL
);
CREATE INDEX IX_ParentPayments_Parent ON dbo.ParentPayments(ParentId, StudentId, CreatedAt);

CREATE TABLE dbo.ParentRefundRequests (
    PaymentId int NOT NULL PRIMARY KEY REFERENCES dbo.ParentPayments(PaymentId),
    Reason nvarchar(500) NOT NULL,
    Status nvarchar(12) NOT NULL DEFAULT N'Pending' CHECK (Status IN (N'Pending', N'Approved', N'Declined')),
    RequestedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME()
);
