-- Frozen initial schema. Run ONLY for an empty database; existing databases are baselined.
/* ============ 1. XÁC THỰC & NGƯỜI DÙNG (UC01-10, 79-85) ============ */
CREATE TABLE Roles (
    RoleId   TINYINT      NOT NULL PRIMARY KEY,
    RoleName NVARCHAR(20) NOT NULL UNIQUE
);
-- Default roles are seeded by DbInitializer after migrations.

CREATE TABLE Users (
    UserId           INT IDENTITY(1,1) PRIMARY KEY,
    Email            NVARCHAR(150) NOT NULL UNIQUE,
    PasswordHash     NVARCHAR(255) NOT NULL,
    RoleId           TINYINT       NOT NULL REFERENCES Roles(RoleId),
    FullName         NVARCHAR(120) NOT NULL,
    Phone            NVARCHAR(20)  NULL,
    Address          NVARCHAR(255) NULL,
    AvatarUrl        NVARCHAR(500) NULL,
    ThemeMode        NVARCHAR(5)   NOT NULL DEFAULT N'Light' CHECK (ThemeMode IN (N'Light',N'Dark')),
    Status           NVARCHAR(10)  NOT NULL DEFAULT N'Active' CHECK (Status IN (N'Active',N'Locked')),
    MustChangePwd    BIT           NOT NULL DEFAULT 0,
    FailedLoginCount INT           NOT NULL DEFAULT 0,
    LastLoginAt      DATETIME2     NULL,
    CreatedAt        DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt        DATETIME2     NULL
);

CREATE TABLE UserSessions (
    SessionId    BIGINT IDENTITY(1,1) PRIMARY KEY,
    UserId       INT           NOT NULL REFERENCES Users(UserId),
    TokenHash    NVARCHAR(255) NOT NULL,
    IpAddress    NVARCHAR(45)  NULL,
    UserAgent    NVARCHAR(300) NULL,
    LoginAt      DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    LogoutAt     DATETIME2     NULL,
    IsActive     BIT           NOT NULL DEFAULT 1
);
CREATE INDEX IX_UserSessions_User ON UserSessions(UserId, LoginAt DESC);

CREATE TABLE PasswordResetOtps (
    OtpId     BIGINT IDENTITY(1,1) PRIMARY KEY,
    UserId    INT           NOT NULL REFERENCES Users(UserId),
    OtpHash   NVARCHAR(255) NOT NULL,
    ExpiresAt DATETIME2     NOT NULL,
    Attempts  INT           NOT NULL DEFAULT 0,
    UsedAt    DATETIME2     NULL,
    CreatedAt DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE StudentProfiles (
    UserId      INT PRIMARY KEY REFERENCES Users(UserId),
    StudentCode NVARCHAR(20) NOT NULL UNIQUE,
    DateOfBirth DATE         NULL,
    Gender      NVARCHAR(10) NULL,
    SchoolName  NVARCHAR(150) NULL,
    GradeLevel  NVARCHAR(20) NULL,
    TotalXp     INT          NOT NULL DEFAULT 0,
    StemPoints  INT          NOT NULL DEFAULT 0,
    Status      NVARCHAR(15) NOT NULL DEFAULT N'Active'
);
CREATE TABLE TeacherProfiles (
    UserId      INT PRIMARY KEY REFERENCES Users(UserId),
    TeacherCode NVARCHAR(20) NOT NULL UNIQUE,
    Specialty   NVARCHAR(150) NULL,
    Bio         NVARCHAR(1000) NULL,
    HireDate    DATE NULL
);
CREATE TABLE AdminProfiles (
    UserId          INT PRIMARY KEY REFERENCES Users(UserId),
    StaffCode       NVARCHAR(20) NOT NULL UNIQUE,
    Position        NVARCHAR(100) NULL,
    PermissionLevel TINYINT NOT NULL DEFAULT 1
);
CREATE TABLE ParentProfiles (
    UserId     INT PRIMARY KEY REFERENCES Users(UserId),
    Occupation NVARCHAR(100) NULL
);
CREATE TABLE ParentStudentLinks (               -- UC117, 118
    LinkId       INT IDENTITY(1,1) PRIMARY KEY,
    ParentId     INT NOT NULL REFERENCES ParentProfiles(UserId),
    StudentId    INT NOT NULL REFERENCES StudentProfiles(UserId),
    Relationship NVARCHAR(30) NULL,
    Status       NVARCHAR(10) NOT NULL DEFAULT N'Active' CHECK (Status IN (N'Pending',N'Active',N'Revoked')),
    LinkedAt     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_ParentStudent UNIQUE (ParentId, StudentId)
);

/* ============ 2. KHÓA HỌC, BÀI HỌC, LỚP (UC61-78) ============ */
CREATE TABLE Courses (
    CourseId    INT IDENTITY(1,1) PRIMARY KEY,
    CourseCode  NVARCHAR(20)  NOT NULL UNIQUE,
    Name        NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    LevelCode   NVARCHAR(30)  NULL,
    Status      NVARCHAR(10)  NOT NULL DEFAULT N'Active' CHECK (Status IN (N'Active',N'Archived')),
    CreatedBy   INT NULL REFERENCES Users(UserId),
    CreatedAt   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE TABLE Lessons (
    LessonId  INT IDENTITY(1,1) PRIMARY KEY,
    CourseId  INT NOT NULL REFERENCES Courses(CourseId),
    Title     NVARCHAR(200) NOT NULL,
    Content   NVARCHAR(MAX) NULL,
    OrderNo   INT NOT NULL,
    IsDeleted BIT NOT NULL DEFAULT 0
);
CREATE INDEX IX_Lessons_Course ON Lessons(CourseId, OrderNo);
CREATE TABLE LessonMaterials (                  -- UC16-18, 67
    MaterialId     INT IDENTITY(1,1) PRIMARY KEY,
    LessonId       INT NOT NULL REFERENCES Lessons(LessonId),
    MaterialType   NVARCHAR(15) NOT NULL CHECK (MaterialType IN (N'Slide',N'Document',N'AssemblyGuide',N'Video')),
    Title          NVARCHAR(200) NOT NULL,
    FileUrl        NVARCHAR(500) NOT NULL,
    IsDownloadable BIT NOT NULL DEFAULT 1,
    SortOrder      INT NOT NULL DEFAULT 0
);
CREATE TABLE Rooms (
    RoomId   INT IDENTITY(1,1) PRIMARY KEY,
    RoomName NVARCHAR(50) NOT NULL UNIQUE,
    Capacity INT NOT NULL,
    Status   NVARCHAR(10) NOT NULL DEFAULT N'Active'
);
CREATE TABLE Classes (
    ClassId     INT IDENTITY(1,1) PRIMARY KEY,
    ClassCode   NVARCHAR(30)  NOT NULL UNIQUE,
    CourseId    INT NOT NULL REFERENCES Courses(CourseId),
    TeacherId   INT NULL REFERENCES TeacherProfiles(UserId),
    Name        NVARCHAR(150) NOT NULL,
    StartDate   DATE NULL,
    EndDate     DATE NULL,
    MaxStudents INT NOT NULL DEFAULT 20,
    Status      NVARCHAR(12) NOT NULL DEFAULT N'Planned' CHECK (Status IN (N'Planned',N'Open',N'Closed',N'Completed'))
);
CREATE TABLE ClassSessions (                    -- thời khóa biểu
    SessionId   INT IDENTITY(1,1) PRIMARY KEY,
    ClassId     INT NOT NULL REFERENCES Classes(ClassId),
    LessonId    INT NULL REFERENCES Lessons(LessonId),
    RoomId      INT NULL REFERENCES Rooms(RoomId),
    SessionDate DATE NOT NULL,
    StartTime   TIME NOT NULL,
    EndTime     TIME NOT NULL,
    Status      NVARCHAR(12) NOT NULL DEFAULT N'Scheduled' CHECK (Status IN (N'Scheduled',N'Done',N'Cancelled'))
);
CREATE INDEX IX_Sessions_Date ON ClassSessions(SessionDate, ClassId);
-- UC72: chặn trùng phòng Lab cùng ngày/giờ bắt đầu
CREATE UNIQUE INDEX UX_Sessions_Room ON ClassSessions(RoomId, SessionDate, StartTime) WHERE RoomId IS NOT NULL AND Status <> N'Cancelled';
CREATE TABLE Enrollments (                      -- UC76-78
    EnrollmentId      INT IDENTITY(1,1) PRIMARY KEY,
    ClassId           INT NOT NULL REFERENCES Classes(ClassId),
    StudentId         INT NOT NULL REFERENCES StudentProfiles(UserId),
    Status            NVARCHAR(12) NOT NULL DEFAULT N'Active' CHECK (Status IN (N'Active',N'Transferred',N'Completed',N'Dropped')),
    ProgressPercent   DECIMAL(5,2) NOT NULL DEFAULT 0,
    TransferredFromId INT NULL REFERENCES Enrollments(EnrollmentId),
    EnrolledAt        DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CompletedAt       DATETIME2 NULL,
    CONSTRAINT UQ_Enroll UNIQUE (ClassId, StudentId)
);
CREATE TABLE LessonProgress (
    StudentId   INT NOT NULL REFERENCES StudentProfiles(UserId),
    LessonId    INT NOT NULL REFERENCES Lessons(LessonId),
    ViewedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CompletedAt DATETIME2 NULL,
    PRIMARY KEY (StudentId, LessonId)
);
CREATE TABLE Notifications (                    -- 1 dòng / người nhận
    NotificationId BIGINT IDENTITY(1,1) PRIMARY KEY,
    RecipientId    INT NOT NULL REFERENCES Users(UserId),
    Type           NVARCHAR(30) NOT NULL,
    Title          NVARCHAR(200) NOT NULL,
    Body           NVARCHAR(1000) NULL,
    RefType        NVARCHAR(30) NULL,
    RefId          BIGINT NULL,
    IsRead         BIT NOT NULL DEFAULT 0,
    CreatedAt      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    ReadAt         DATETIME2 NULL
);
CREATE INDEX IX_Notif_User ON Notifications(RecipientId, IsRead, CreatedAt DESC);

/* ============ 3. ĐIỂM DANH & HỌC BÙ (UC38-41, 119) ============ */
CREATE TABLE AttendanceRecords (
    AttendanceId  BIGINT IDENTITY(1,1) PRIMARY KEY,
    SessionId     INT NOT NULL REFERENCES ClassSessions(SessionId),
    StudentId     INT NOT NULL REFERENCES StudentProfiles(UserId),
    Status        NVARCHAR(10) NOT NULL DEFAULT N'Present' CHECK (Status IN (N'Present',N'Absent',N'Late',N'Excused')),
    AbsenceReason NVARCHAR(500) NULL,
    MarkedBy      INT NOT NULL REFERENCES Users(UserId),
    MarkedAt      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt     DATETIME2 NULL,
    CONSTRAINT UQ_Attendance UNIQUE (SessionId, StudentId)
);
CREATE TABLE MakeupRequests (
    MakeupId          INT IDENTITY(1,1) PRIMARY KEY,
    AttendanceId      BIGINT NOT NULL REFERENCES AttendanceRecords(AttendanceId),
    RequestedBy       INT NOT NULL REFERENCES Users(UserId),
    SuggestedLessonId INT NULL REFERENCES Lessons(LessonId),
    PreferredSessionId INT NULL REFERENCES ClassSessions(SessionId),
    Reason            NVARCHAR(500) NULL,
    Status            NVARCHAR(10) NOT NULL DEFAULT N'Pending' CHECK (Status IN (N'Pending',N'Approved',N'Rejected')),
    ProcessedBy       INT NULL REFERENCES Users(UserId),
    CreatedAt         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    ProcessedAt       DATETIME2 NULL
);

/* ============ 4. BẢN ĐỒ THỬ THÁCH, BÀI TẬP (UC42-48, 96-102) ============ */
CREATE TABLE ChallengeMaps (
    MapId       INT IDENTITY(1,1) PRIMARY KEY,
    Name        NVARCHAR(150) NOT NULL,
    Theme       NVARCHAR(50)  NULL,
    LayoutJson  NVARCHAR(MAX) NOT NULL CHECK (ISJSON(LayoutJson)=1),
    StartX      INT NOT NULL DEFAULT 0,
    StartY      INT NOT NULL DEFAULT 0,
    Status      NVARCHAR(10) NOT NULL DEFAULT N'Active',
    CreatedBy   INT NULL REFERENCES Users(UserId)
);
CREATE TABLE MapCheckpoints (
    CheckpointId  INT IDENTITY(1,1) PRIMARY KEY,
    MapId         INT NOT NULL REFERENCES ChallengeMaps(MapId),
    SeqNo         INT NOT NULL,
    X             INT NOT NULL,
    Y             INT NOT NULL,
    UnlockMessage NVARCHAR(500) NULL,
    IsFinish      BIT NOT NULL DEFAULT 0,
    CONSTRAINT UQ_Checkpoint UNIQUE (MapId, SeqNo)
);
CREATE TABLE Assignments (
    AssignmentId   INT IDENTITY(1,1) PRIMARY KEY,
    ClassId        INT NOT NULL REFERENCES Classes(ClassId),
    LessonId       INT NULL REFERENCES Lessons(LessonId),
    MapId          INT NULL REFERENCES ChallengeMaps(MapId),
    Title          NVARCHAR(200) NOT NULL,
    Instructions   NVARCHAR(MAX) NULL,
    DueAt          DATETIME2 NULL,
    Status         NVARCHAR(10) NOT NULL DEFAULT N'Draft' CHECK (Status IN (N'Draft',N'Published',N'Closed')),
    ClosedAt       DATETIME2 NULL,
    ClosedReason   NVARCHAR(15) NULL CHECK (ClosedReason IN (N'Manual',N'DeadlineAuto')),
    MasterAstJson  NVARCHAR(MAX) NULL CHECK (MasterAstJson IS NULL OR ISJSON(MasterAstJson)=1),
    MasterTested   BIT NOT NULL DEFAULT 0,
    AstWeight      DECIMAL(5,2) NOT NULL DEFAULT 70,
    HardwareWeight DECIMAL(5,2) NOT NULL DEFAULT 30,
    MaxScore       DECIMAL(5,2) NOT NULL DEFAULT 10,
    MaxAttempts    INT NULL,
    ParTimeMs      INT NULL,
    ParBlockCount  INT NULL,
    MaxXp          INT NOT NULL DEFAULT 100,
    CreatedBy      INT NOT NULL REFERENCES Users(UserId),
    CreatedAt      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_Weights CHECK (AstWeight + HardwareWeight = 100)
);
CREATE INDEX IX_Assign_Due ON Assignments(Status, DueAt);
CREATE TABLE HardwareRubricCriteria (           -- UC51, 114
    CriterionId  INT IDENTITY(1,1) PRIMARY KEY,
    AssignmentId INT NOT NULL REFERENCES Assignments(AssignmentId),
    Name         NVARCHAR(150) NOT NULL,
    MaxPoints    DECIMAL(5,2) NOT NULL,
    SortOrder    INT NOT NULL DEFAULT 0
);

/* ============ 5. LÀM BÀI, NỘP BÀI, CHẤM AST (UC19-32, 86-90, 107-108) ============ */
CREATE TABLE WorkspaceDrafts (
    DraftId      BIGINT IDENTITY(1,1) PRIMARY KEY,
    AssignmentId INT NOT NULL REFERENCES Assignments(AssignmentId),
    StudentId    INT NOT NULL REFERENCES StudentProfiles(UserId),
    BlocklyJson  NVARCHAR(MAX) NOT NULL,
    SavedAt      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_Draft UNIQUE (AssignmentId, StudentId)
);
CREATE TABLE Submissions (
    SubmissionId BIGINT IDENTITY(1,1) PRIMARY KEY,
    AssignmentId INT NOT NULL REFERENCES Assignments(AssignmentId),
    StudentId    INT NOT NULL REFERENCES StudentProfiles(UserId),
    AttemptNo    INT NOT NULL,
    BlocklyJson  NVARCHAR(MAX) NOT NULL,
    AstJson      NVARCHAR(MAX) NULL,
    Status       NVARCHAR(10) NOT NULL DEFAULT N'Pending' CHECK (Status IN (N'Pending',N'AutoGraded',N'Finalized')),
    IsCurrent    BIT NOT NULL DEFAULT 1,
    SubmittedAt  DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_Attempt UNIQUE (AssignmentId, StudentId, AttemptNo)
);
CREATE INDEX IX_Sub_Student ON Submissions(StudentId, AssignmentId, IsCurrent);
CREATE UNIQUE INDEX UX_Sub_Current ON Submissions(AssignmentId, StudentId) WHERE IsCurrent = 1;
CREATE TABLE AstEvaluations (
    EvaluationId   BIGINT IDENTITY(1,1) PRIMARY KEY,
    SubmissionId   BIGINT NOT NULL UNIQUE REFERENCES Submissions(SubmissionId),
    AutoAstScore   DECIMAL(5,2) NOT NULL,
    MatchPercent   DECIMAL(5,2) NOT NULL,
    EngineVersion  NVARCHAR(20) NULL,
    EvaluatedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE TABLE AstDeviations (                    -- khối sai + gợi ý sư phạm
    DeviationId   BIGINT IDENTITY(1,1) PRIMARY KEY,
    EvaluationId  BIGINT NOT NULL REFERENCES AstEvaluations(EvaluationId),
    NodePath      NVARCHAR(300) NOT NULL,
    DeviationType NVARCHAR(15) NOT NULL CHECK (DeviationType IN (N'Missing',N'Extra',N'WrongParam',N'WrongOrder')),
    ExpectedBlock NVARCHAR(100) NULL,
    ActualBlock   NVARCHAR(100) NULL,
    HintText      NVARCHAR(500) NULL
);
CREATE TABLE SimulationRuns (                   -- UC23, 97, 98, 105, 106
    RunId             BIGINT IDENTITY(1,1) PRIMARY KEY,
    AssignmentId      INT NOT NULL REFERENCES Assignments(AssignmentId),
    StudentId         INT NOT NULL REFERENCES StudentProfiles(UserId),
    SubmissionId      BIGINT NULL REFERENCES Submissions(SubmissionId),
    MapId             INT NOT NULL REFERENCES ChallengeMaps(MapId),
    ExecTimeMs        INT NOT NULL,
    BlockCount        INT NOT NULL,
    CheckpointsReached INT NOT NULL DEFAULT 0,
    ReachedFinish     BIT NOT NULL DEFAULT 0,
    TrajectoryJson    NVARCHAR(MAX) NULL,
    RunAt             DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_Run_Best ON SimulationRuns(MapId, ReachedFinish, ExecTimeMs, BlockCount);

/* ============ 6. CHẤM ĐIỂM HYBRID (UC49-55, 91, 113-114) ============ */
CREATE TABLE Grades (
    GradeId       BIGINT IDENTITY(1,1) PRIMARY KEY,
    SubmissionId  BIGINT NOT NULL UNIQUE REFERENCES Submissions(SubmissionId),
    AutoAstScore  DECIMAL(5,2) NULL,
    HardwareScore DECIMAL(5,2) NULL,
    FinalScore    DECIMAL(5,2) NULL,
    RemarkText    NVARCHAR(2000) NULL,
    RemarkSource  NVARCHAR(10) NULL CHECK (RemarkSource IN (N'Typed',N'Voice')),
    IsFinalized   BIT NOT NULL DEFAULT 0,
    FinalizedBy   INT NULL REFERENCES Users(UserId),
    FinalizedAt   DATETIME2 NULL
);
CREATE TABLE HardwareScores (
    GradeId     BIGINT NOT NULL REFERENCES Grades(GradeId),
    CriterionId INT    NOT NULL REFERENCES HardwareRubricCriteria(CriterionId),
    Points      DECIMAL(5,2) NOT NULL,
    ScoredBy    INT NOT NULL REFERENCES Users(UserId),
    ScoredAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    PRIMARY KEY (GradeId, CriterionId)
);
CREATE TABLE GradeHistory (
    HistoryId BIGINT IDENTITY(1,1) PRIMARY KEY,
    GradeId   BIGINT NOT NULL REFERENCES Grades(GradeId),
    OldFinal  DECIMAL(5,2) NULL,
    NewFinal  DECIMAL(5,2) NOT NULL,
    Reason    NVARCHAR(500) NOT NULL,
    ChangedBy INT NOT NULL REFERENCES Users(UserId),
    ChangedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

/* ============ 7. GAMIFICATION (UC92, 99-100, 103-104) ============ */
CREATE TABLE XpTransactions (
    XpId         BIGINT IDENTITY(1,1) PRIMARY KEY,
    StudentId    INT NOT NULL REFERENCES StudentProfiles(UserId),
    PointType    NVARCHAR(5) NOT NULL CHECK (PointType IN (N'XP',N'STEM')),
    Points       INT NOT NULL,
    Source       NVARCHAR(30) NOT NULL,
    SubmissionId BIGINT NULL REFERENCES Submissions(SubmissionId),
    RunId        BIGINT NULL REFERENCES SimulationRuns(RunId),
    Description  NVARCHAR(300) NULL,
    CreatedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE TABLE Badges (
    BadgeId     INT IDENTITY(1,1) PRIMARY KEY,
    Code        NVARCHAR(30) NOT NULL UNIQUE,
    Name        NVARCHAR(100) NOT NULL,
    Description NVARCHAR(300) NULL,
    IconUrl     NVARCHAR(500) NULL
);
CREATE TABLE StudentBadges (
    StudentId INT NOT NULL REFERENCES StudentProfiles(UserId),
    BadgeId   INT NOT NULL REFERENCES Badges(BadgeId),
    AwardedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    PRIMARY KEY (StudentId, BadgeId)
);
CREATE TABLE LeaderboardCycles (
    CycleId   INT IDENTITY(1,1) PRIMARY KEY,
    WeekStart DATE NOT NULL,
    WeekEnd   DATE NOT NULL,
    Status    NVARCHAR(8) NOT NULL DEFAULT N'Active' CHECK (Status IN (N'Active',N'Closed'))
);
CREATE TABLE LeaderboardEntries (
    EntryId        BIGINT IDENTITY(1,1) PRIMARY KEY,
    CycleId        INT NOT NULL REFERENCES LeaderboardCycles(CycleId),
    MapId          INT NOT NULL REFERENCES ChallengeMaps(MapId),
    StudentId      INT NOT NULL REFERENCES StudentProfiles(UserId),
    BestRunId      BIGINT NOT NULL REFERENCES SimulationRuns(RunId),
    BestTimeMs     INT NOT NULL,
    BestBlockCount INT NOT NULL,
    XpEarned       INT NOT NULL DEFAULT 0,
    RankNo         INT NULL,
    UpdatedAt      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_LB UNIQUE (CycleId, MapId, StudentId)
);

/* ============ 8. HỒ SƠ SÁNG TẠO, QR, CỔ VŨ (UC109-110, 115-116, 121-122) ============ */
CREATE TABLE PortfolioItems (
    ItemId       INT IDENTITY(1,1) PRIMARY KEY,
    StudentId    INT NOT NULL REFERENCES StudentProfiles(UserId),
    SubmissionId BIGINT NOT NULL UNIQUE REFERENCES Submissions(SubmissionId),
    Title        NVARCHAR(200) NOT NULL,
    Summary      NVARCHAR(1000) NULL,
    ThumbnailUrl NVARCHAR(500) NULL,
    FinalScore   DECIMAL(5,2) NULL,
    CompletedAt  DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE TABLE AchievementCards (
    CardId      INT IDENTITY(1,1) PRIMARY KEY,
    StudentId   INT NOT NULL REFERENCES StudentProfiles(UserId),
    ItemId      INT NULL REFERENCES PortfolioItems(ItemId),
    Title       NVARCHAR(200) NOT NULL,
    CardImageUrl NVARCHAR(500) NULL,
    QrToken     UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() UNIQUE,
    IsPublic    BIT NOT NULL DEFAULT 1,
    ExportedBy  INT NOT NULL REFERENCES Users(UserId),
    ViewCount   INT NOT NULL DEFAULT 0,
    CreatedAt   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE TABLE CheerStickers (
    StickerId INT IDENTITY(1,1) PRIMARY KEY,
    Code      NVARCHAR(30) NOT NULL UNIQUE,
    Name      NVARCHAR(80) NOT NULL,
    ImageUrl  NVARCHAR(500) NOT NULL
);
CREATE TABLE CheerMessages (
    CheerId   BIGINT IDENTITY(1,1) PRIMARY KEY,
    ParentId  INT NOT NULL REFERENCES ParentProfiles(UserId),
    StudentId INT NOT NULL REFERENCES StudentProfiles(UserId),
    StickerId INT NULL REFERENCES CheerStickers(StickerId),
    Message   NVARCHAR(500) NULL,
    SessionId INT NULL REFERENCES ClassSessions(SessionId),
    SentAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    SeenAt    DATETIME2 NULL
);

/* ============ 9. LỚP HỌC THỜI GIAN THỰC (UC111-112) ============ */
CREATE TABLE FocusModeSessions (
    FocusId   INT IDENTITY(1,1) PRIMARY KEY,
    SessionId INT NOT NULL REFERENCES ClassSessions(SessionId),
    TeacherId INT NOT NULL REFERENCES TeacherProfiles(UserId),
    Message   NVARCHAR(300) NULL,
    StartedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    EndedAt   DATETIME2 NULL
);
CREATE TABLE SpotlightBroadcasts (
    BroadcastId  INT IDENTITY(1,1) PRIMARY KEY,
    SessionId    INT NOT NULL REFERENCES ClassSessions(SessionId),
    SubmissionId BIGINT NOT NULL REFERENCES Submissions(SubmissionId),
    TeacherId    INT NOT NULL REFERENCES TeacherProfiles(UserId),
    StartedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    EndedAt      DATETIME2 NULL
);

/* ============ 10. AUDIT (UC95) ============ */
CREATE TABLE AuditLogs (
    AuditId     BIGINT IDENTITY(1,1) PRIMARY KEY,
    ActorUserId INT NULL REFERENCES Users(UserId),
    ActorType   NVARCHAR(6) NOT NULL DEFAULT N'User' CHECK (ActorType IN (N'User',N'System')),
    Action      NVARCHAR(60) NOT NULL,
    EntityType  NVARCHAR(40) NULL,
    EntityId    NVARCHAR(40) NULL,
    OldValue    NVARCHAR(MAX) NULL,
    NewValue    NVARCHAR(MAX) NULL,
    IpAddress   NVARCHAR(45) NULL,
    CreatedAt   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_Audit_Entity ON AuditLogs(EntityType, EntityId, CreatedAt DESC);
GO

/* Audit log bất biến */
CREATE TRIGGER trg_AuditLogs_NoChange ON AuditLogs INSTEAD OF UPDATE, DELETE AS
BEGIN
    RAISERROR(N'AuditLogs là bảng chỉ ghi thêm (append-only).',16,1);
    ROLLBACK TRANSACTION;
END;
GO

/* ============ VIEW PHỤC VỤ BÁO CÁO ============ */
CREATE VIEW vw_ClassGradebook AS            -- UC55, 120
SELECT e.ClassId, e.StudentId, u.FullName, a.AssignmentId, a.Title,
       g.AutoAstScore, g.HardwareScore, g.FinalScore, g.RemarkText
FROM Enrollments e
JOIN Users u            ON u.UserId = e.StudentId
JOIN Assignments a      ON a.ClassId = e.ClassId
LEFT JOIN Submissions s ON s.AssignmentId = a.AssignmentId AND s.StudentId = e.StudentId AND s.IsCurrent = 1
LEFT JOIN Grades g      ON g.SubmissionId = s.SubmissionId AND g.IsFinalized = 1
WHERE e.Status = N'Active';
GO

CREATE VIEW vw_StudentsNeedSupport AS       -- UC60 (ngưỡng: TB < 5 hoặc chuyên cần < 70%)
SELECT e.StudentId, u.FullName, e.ClassId,
       AVG(g.FinalScore) AS AvgScore,
       CAST(SUM(CASE WHEN ar.Status IN (N'Present',N'Late') THEN 1 ELSE 0 END) AS DECIMAL(9,2))
         / NULLIF(COUNT(ar.AttendanceId),0) AS AttendanceRate
FROM Enrollments e
JOIN Users u ON u.UserId = e.StudentId
LEFT JOIN Submissions s ON s.StudentId = e.StudentId AND s.IsCurrent = 1
LEFT JOIN Grades g ON g.SubmissionId = s.SubmissionId AND g.IsFinalized = 1
LEFT JOIN AttendanceRecords ar ON ar.StudentId = e.StudentId
WHERE e.Status = N'Active'
GROUP BY e.StudentId, u.FullName, e.ClassId
HAVING AVG(g.FinalScore) < 5
    OR CAST(SUM(CASE WHEN ar.Status IN (N'Present',N'Late') THEN 1 ELSE 0 END) AS DECIMAL(9,2))
         / NULLIF(COUNT(ar.AttendanceId),0) < 0.7;
GO

