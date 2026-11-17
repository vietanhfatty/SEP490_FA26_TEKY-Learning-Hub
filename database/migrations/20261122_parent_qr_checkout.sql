CREATE TABLE dbo.ParentCourseCheckouts (
    PaymentId int PRIMARY KEY REFERENCES dbo.ParentPayments(PaymentId),
    ClassId int NOT NULL REFERENCES dbo.Classes(ClassId),
    StudentId int NOT NULL REFERENCES dbo.StudentProfiles(UserId),
    CourseId int NOT NULL REFERENCES dbo.Courses(CourseId),
    Provider nvarchar(8) NOT NULL CHECK (Provider IN (N'Demo', N'PayOS')),
    OrderCode bigint NOT NULL UNIQUE,
    ExpiresAt datetime2 NOT NULL,
    IsOpen bit NOT NULL DEFAULT 1,
    ProviderLinkId nvarchar(64) NULL,
    CheckoutUrl nvarchar(512) NULL,
    QrCode nvarchar(1024) NULL,
    LastCheckedAt datetime2 NULL
);
CREATE UNIQUE INDEX UX_ParentCourseCheckouts_StudentCourse ON dbo.ParentCourseCheckouts(StudentId, CourseId) WHERE IsOpen = 1;
CREATE INDEX IX_ParentCourseCheckouts_Class ON dbo.ParentCourseCheckouts(ClassId) WHERE IsOpen = 1;
CREATE INDEX IX_ParentCourseCheckouts_Reconcile ON dbo.ParentCourseCheckouts(Provider, LastCheckedAt, PaymentId) WHERE IsOpen = 1;
GO
CREATE VIEW dbo.ParentCourseCheckoutDetails AS
SELECT p.PaymentId, p.ParentId, p.StudentId, p.CourseId, p.Reference, p.AmountVnd, p.Status,
       co.Name AS CourseName, cl.ClassCode, c.OrderCode, c.Provider, c.ExpiresAt,
       c.ProviderLinkId, c.CheckoutUrl, c.QrCode, c.IsOpen, c.LastCheckedAt
FROM dbo.ParentCourseCheckouts c
JOIN dbo.ParentPayments p ON p.PaymentId = c.PaymentId
JOIN dbo.Classes cl ON cl.ClassId = c.ClassId
JOIN dbo.Courses co ON co.CourseId = p.CourseId;
GO
CREATE PROCEDURE dbo.ReserveParentCourseCheckout
    @ParentId int, @StudentId int, @ClassId int, @OrderCode bigint, @Provider nvarchar(8), @ExpiresAt datetime2
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;

    DECLARE @PaymentId int, @CourseId int, @Amount int, @Capacity int, @LockResult int;
    DECLARE @ClassLock nvarchar(80) = CONCAT(N'ParentCheckout:Class:', @ClassId);
    EXEC @LockResult = sys.sp_getapplock @Resource = @ClassLock, @LockMode = 'Exclusive', @LockTimeout = 10000;
    IF @LockResult < 0 THROW 51000, 'Could not reserve the class.', 1;

    SELECT @CourseId = CourseId FROM dbo.Classes WHERE ClassId = @ClassId;
    DECLARE @CourseLock nvarchar(80) = CONCAT(N'ParentCheckout:StudentCourse:', @StudentId, N':', @CourseId);
    EXEC @LockResult = sys.sp_getapplock @Resource = @CourseLock, @LockMode = 'Exclusive', @LockTimeout = 10000;
    IF @LockResult < 0 THROW 51000, 'Could not reserve the course.', 1;

    IF EXISTS (SELECT 1 FROM dbo.ParentStudentLinks WITH (HOLDLOCK)
               WHERE ParentId = @ParentId AND StudentId = @StudentId AND Status = N'Active')
    BEGIN
        SELECT @PaymentId = p.PaymentId
        FROM dbo.ParentCourseCheckouts c JOIN dbo.ParentPayments p ON p.PaymentId = c.PaymentId
        WHERE c.IsOpen = 1 AND c.StudentId = @StudentId AND c.CourseId = @CourseId
              AND c.ClassId = @ClassId AND p.ParentId = @ParentId;

        IF @PaymentId IS NULL
        BEGIN
            SELECT @Amount = co.TuitionVnd, @Capacity = cl.MaxStudents
            FROM dbo.Classes cl JOIN dbo.Courses co ON co.CourseId = cl.CourseId
            WHERE cl.ClassId = @ClassId AND cl.Status = N'Open' AND co.Status IN (N'Published', N'Active');

            IF @Amount > 0
               AND NOT EXISTS (SELECT 1 FROM dbo.ParentCourseCheckouts
                               WHERE IsOpen = 1 AND StudentId = @StudentId AND CourseId = @CourseId)
               AND NOT EXISTS (SELECT 1 FROM dbo.Enrollments e JOIN dbo.Classes cl ON cl.ClassId = e.ClassId
                               WHERE e.StudentId = @StudentId AND cl.CourseId = @CourseId AND e.Status IN (N'Active', N'Completed'))
               AND @Capacity > (SELECT COUNT(*) FROM dbo.Enrollments WHERE ClassId = @ClassId AND Status = N'Active')
                             + (SELECT COUNT(*) FROM dbo.ParentCourseCheckouts WHERE ClassId = @ClassId AND IsOpen = 1)
            BEGIN
                INSERT dbo.ParentPayments(ParentId, StudentId, CourseId, Reference, AmountVnd, Status)
                VALUES (@ParentId, @StudentId, @CourseId, REPLACE(CONVERT(nvarchar(36), NEWID()), N'-', N''), @Amount, N'Pending');
                SET @PaymentId = CONVERT(int, SCOPE_IDENTITY());
                INSERT dbo.ParentCourseCheckouts(PaymentId, ClassId, StudentId, CourseId, Provider, OrderCode, ExpiresAt)
                VALUES (@PaymentId, @ClassId, @StudentId, @CourseId, @Provider, @OrderCode, @ExpiresAt);
            END
        END
    END
    COMMIT TRANSACTION;
    SELECT * FROM dbo.ParentCourseCheckoutDetails WHERE PaymentId = @PaymentId;
END
GO
CREATE PROCEDURE dbo.ResolveParentCourseCheckout
    @PaymentId int, @Provider nvarchar(8), @Paid bit, @LinkId nvarchar(64) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;
    DECLARE @ClassId int, @StudentId int, @LockResult int;
    SELECT @ClassId = ClassId FROM dbo.ParentCourseCheckouts WHERE PaymentId = @PaymentId;
    DECLARE @ClassLock nvarchar(80) = CONCAT(N'ParentCheckout:Class:', @ClassId);
    EXEC @LockResult = sys.sp_getapplock @Resource = @ClassLock, @LockMode = 'Exclusive', @LockTimeout = 10000;
    IF @LockResult < 0 THROW 51000, 'Could not update the reserved class.', 1;

    UPDATE dbo.ParentCourseCheckouts SET IsOpen = 0, ProviderLinkId = COALESCE(ProviderLinkId, @LinkId)
    WHERE PaymentId = @PaymentId AND Provider = @Provider AND IsOpen = 1
      AND (Provider = N'PayOS' AND (ProviderLinkId IS NULL OR ProviderLinkId = @LinkId)
           OR Provider = N'Demo' AND ((@Paid = 1 AND ExpiresAt > SYSUTCDATETIME())
                                    OR (@Paid = 0 AND ExpiresAt <= SYSUTCDATETIME())));

    IF @@ROWCOUNT = 1
    BEGIN
        IF @Paid = 1
        BEGIN
            SELECT @StudentId = StudentId FROM dbo.ParentCourseCheckouts WHERE PaymentId = @PaymentId;
            IF NOT EXISTS (SELECT 1 FROM dbo.Enrollments WITH (UPDLOCK, HOLDLOCK)
                           WHERE ClassId = @ClassId AND StudentId = @StudentId)
                INSERT dbo.Enrollments(ClassId, StudentId) VALUES (@ClassId, @StudentId);
            ELSE
                UPDATE dbo.Enrollments SET Status = N'Active', EnrolledAt = SYSUTCDATETIME(), CompletedAt = NULL
                WHERE ClassId = @ClassId AND StudentId = @StudentId AND Status IN (N'Transferred', N'Dropped');

            UPDATE dbo.ParentPayments
            SET Status = N'Paid', PaidAt = SYSUTCDATETIME(), InvoiceNumber = CONCAT(N'TEKY-QR-', PaymentId)
            WHERE PaymentId = @PaymentId;
        END
        ELSE
            UPDATE dbo.ParentPayments SET Status = N'Failed' WHERE PaymentId = @PaymentId;
    END
    COMMIT TRANSACTION;
END

GO
CREATE PROCEDURE dbo.SeedDemoParentCheckout
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;
    DECLARE @today date = CONVERT(date, DATEADD(hour, 7, SYSUTCDATETIME()));
    IF NOT EXISTS (SELECT 1 FROM dbo.Courses WITH (UPDLOCK, HOLDLOCK) WHERE CourseCode = N'DEMO-QR-STEM')
        INSERT dbo.Courses(CourseCode, Name, Description, LevelCode, Status, LearningObjectives, TuitionVnd)
        VALUES (N'DEMO-QR-STEM', N'[Demo QR] Lập trình robot STEM',
                N'Khóa học thực hành dùng để thử luồng thanh toán và ghi danh.', N'Beginner', N'Published',
                N'Lập trình robot di chuyển và xử lý tín hiệu đơn giản.', 99000);

    DECLARE @CourseId int = (SELECT CourseId FROM dbo.Courses WHERE CourseCode = N'DEMO-QR-STEM');
    IF NOT EXISTS (SELECT 1 FROM dbo.Classes WHERE ClassCode = N'DEMO-QR-STEM-01')
        INSERT dbo.Classes(ClassCode, CourseId, Name, StartDate, EndDate, Status)
        VALUES (N'DEMO-QR-STEM-01', @CourseId, N'Lập trình robot STEM', DATEADD(day, 2, @today), DATEADD(day, 16, @today), N'Open');

    IF NOT EXISTS (SELECT 1 FROM dbo.Lessons WHERE CourseId = @CourseId AND OrderNo = 1)
        INSERT dbo.Lessons(CourseId, OrderNo, Title, Content)
        VALUES (@CourseId, 1, N'Lệnh di chuyển', N'Thực hành cho robot tiến, lùi và quay theo góc cho trước.');

    DECLARE @ClassId int = (SELECT ClassId FROM dbo.Classes WHERE ClassCode = N'DEMO-QR-STEM-01');
    DECLARE @LessonId int = (SELECT TOP(1) LessonId FROM dbo.Lessons WHERE CourseId = @CourseId AND OrderNo = 1);
    IF NOT EXISTS (SELECT 1 FROM dbo.ClassSessions WHERE ClassId = @ClassId AND LessonId = @LessonId)
        INSERT dbo.ClassSessions(ClassId, LessonId, SessionDate, StartTime, EndTime, Status)
        VALUES (@ClassId, @LessonId, DATEADD(day, 2, @today), '09:00', '10:30', N'Scheduled');
    COMMIT TRANSACTION;
END
