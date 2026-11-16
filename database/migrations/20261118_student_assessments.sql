CREATE TABLE dbo.Assessments (
    AssessmentId int IDENTITY PRIMARY KEY,
    ClassId int NOT NULL REFERENCES dbo.Classes(ClassId),
    Code nvarchar(80) NOT NULL,
    Title nvarchar(200) NOT NULL,
    Instructions nvarchar(2000) NULL,
    IsPublished bit NOT NULL DEFAULT 0,
    AllowAnswerReview bit NOT NULL DEFAULT 0,
    OpensAt datetime2 NULL,
    ClosesAt datetime2 NULL,
    QuestionsJson nvarchar(max) NOT NULL CHECK (ISJSON(QuestionsJson)=1),
    CONSTRAINT UQ_Assessments_Class_Code UNIQUE(ClassId, Code),
    CONSTRAINT CK_Assessments_Window CHECK (OpensAt IS NULL OR ClosesAt IS NULL OR ClosesAt > OpensAt)
);

CREATE TABLE dbo.AssessmentAttempts (
    AttemptId uniqueidentifier NOT NULL PRIMARY KEY,
    AssessmentId int NOT NULL REFERENCES dbo.Assessments(AssessmentId),
    StudentId int NOT NULL REFERENCES dbo.StudentProfiles(UserId),
    StartedAt datetime2 NOT NULL,
    QuestionsSnapshot nvarchar(max) NOT NULL CHECK (ISJSON(QuestionsSnapshot)=1),
    SubmittedAt datetime2 NULL,
    AnswersJson nvarchar(max) NULL CHECK (AnswersJson IS NULL OR ISJSON(AnswersJson)=1),
    CorrectCount int NULL,
    CONSTRAINT UQ_AssessmentAttempts_Student UNIQUE (AssessmentId, StudentId),
    CONSTRAINT CK_AssessmentAttempts_Result CHECK (
        (SubmittedAt IS NULL AND AnswersJson IS NULL AND CorrectCount IS NULL)
        OR (SubmittedAt IS NOT NULL AND AnswersJson IS NOT NULL AND CorrectCount IS NOT NULL AND CorrectCount >= 0)
    )
);
