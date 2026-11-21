INSERT dbo.Permissions(Code, Description) VALUES ('academic.manage', N'Tổ chức và vận hành đào tạo');
INSERT dbo.RolePermissions(RoleId, PermissionId)
SELECT 6, PermissionId FROM dbo.Permissions WHERE Code = 'academic.manage';

CREATE TABLE dbo.CourseApprovals(
    CourseId int PRIMARY KEY REFERENCES dbo.Courses(CourseId),
    ReviewStatus nvarchar(12) NOT NULL DEFAULT N'Draft'
        CHECK (ReviewStatus IN (N'Draft', N'Pending', N'Approved', N'Rejected', N'Revision')),
    Comment nvarchar(2000) NULL,
    ReviewedBy int NULL REFERENCES dbo.Users(UserId),
    UpdatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
    Version int NOT NULL DEFAULT 1
);
INSERT dbo.CourseApprovals(CourseId, ReviewStatus)
SELECT CourseId, CASE WHEN Status IN (N'Published', N'Active') THEN N'Approved' ELSE N'Draft' END FROM dbo.Courses;

CREATE TABLE dbo.TeacherAvailability(
    AvailabilityId int IDENTITY PRIMARY KEY,
    TeacherId int NOT NULL REFERENCES dbo.TeacherProfiles(UserId),
    Weekday int NOT NULL CHECK (Weekday BETWEEN 1 AND 7),
    StartsAt time NOT NULL,
    EndsAt time NOT NULL,
    CHECK (StartsAt < EndsAt),
    UNIQUE (TeacherId, Weekday, StartsAt, EndsAt)
);
CREATE TABLE dbo.AcademicClassVersions(
    ClassId int PRIMARY KEY REFERENCES dbo.Classes(ClassId),
    Version int NOT NULL DEFAULT 1
);
INSERT dbo.AcademicClassVersions(ClassId) SELECT ClassId FROM dbo.Classes;
ALTER TABLE dbo.ParentCourseRequests ADD ManagerNote nvarchar(2000) NULL, ProcessedBy int NULL REFERENCES dbo.Users(UserId),
    UpdatedAt datetime2 NULL, Version int NOT NULL DEFAULT 1;
ALTER TABLE dbo.MakeupRequests ADD ManagerNote nvarchar(2000) NULL, Version int NOT NULL DEFAULT 1;
CREATE TABLE dbo.MakeupSessionAssignments(
    MakeupId int PRIMARY KEY REFERENCES dbo.MakeupRequests(MakeupId),
    SessionId int NOT NULL REFERENCES dbo.ClassSessions(SessionId),
    StudentId int NOT NULL REFERENCES dbo.StudentProfiles(UserId)
);
CREATE UNIQUE INDEX UX_MakeupAssignments_StudentSession ON dbo.MakeupSessionAssignments(StudentId,SessionId);
CREATE TABLE dbo.AcademicSessionVersions(
    SessionId int PRIMARY KEY REFERENCES dbo.ClassSessions(SessionId),
    Version int NOT NULL DEFAULT 1,
    ChangeReason nvarchar(1000) NULL,
    ChangedAt datetime2 NULL
);
INSERT dbo.AcademicSessionVersions(SessionId) SELECT SessionId FROM dbo.ClassSessions;
ALTER TABLE dbo.Rooms ADD DepartmentId int NULL REFERENCES dbo.Departments(DepartmentId);
CREATE TABLE dbo.StemEquipment(
    EquipmentId int IDENTITY PRIMARY KEY,
    DepartmentId int NULL REFERENCES dbo.Departments(DepartmentId),
    Code nvarchar(40) NOT NULL UNIQUE,
    Name nvarchar(150) NOT NULL,
    RoomId int NULL REFERENCES dbo.Rooms(RoomId),
    Status nvarchar(12) NOT NULL CHECK (Status IN (N'Available', N'InUse', N'Damaged', N'Maintenance', N'Lost', N'Retired')),
    PurchaseDate date NOT NULL,
    CostVnd int NOT NULL CHECK (CostVnd >= 0),
    UsefulLifeMonths int NOT NULL CHECK (UsefulLifeMonths BETWEEN 1 AND 600),
    Note nvarchar(1000) NULL,
    Version int NOT NULL DEFAULT 1
);
GO
DECLARE @constraint sysname;
SELECT @constraint = name FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('dbo.Classes') AND definition LIKE '%Planned%' AND definition LIKE '%Completed%';
IF @constraint IS NOT NULL
BEGIN
    DECLARE @dropConstraint nvarchar(max)=N'ALTER TABLE dbo.Classes DROP CONSTRAINT '+QUOTENAME(@constraint);
    EXEC sys.sp_executesql @dropConstraint;
END;
ALTER TABLE dbo.Classes ADD CONSTRAINT CK_Classes_AcademicStatus
CHECK (Status IN (N'Planned', N'Open', N'Closed', N'Completed', N'Cancelled'));
GO
CREATE VIEW dbo.AcademicScheduledStudents AS
SELECT ClassId,StudentId FROM dbo.Enrollments WHERE Status=N'Active'
UNION
SELECT ClassId,StudentId FROM dbo.ParentCourseCheckouts WHERE IsOpen=1;
GO
CREATE PROCEDURE dbo.ValidateAcademicSession
    @ClassId int, @SessionId int, @Date date, @Start time, @End time, @RoomId int = NULL, @ExtraStudentId int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @TeacherId int = (SELECT TeacherId FROM dbo.Classes WHERE ClassId = @ClassId);
    DECLARE @Capacity int = (SELECT MaxStudents FROM dbo.Classes WHERE ClassId = @ClassId);
    IF @Start >= @End THROW 51000, N'Giờ kết thúc phải sau giờ bắt đầu.', 1;
    IF EXISTS (SELECT 1 FROM dbo.Classes WHERE ClassId = @ClassId AND
                (Status IN (N'Cancelled', N'Completed') OR StartDate > @Date OR EndDate < @Date))
        THROW 51000, N'Ngày học nằm ngoài thời gian tổ chức lớp.', 1;
    IF @RoomId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.Rooms WHERE RoomId = @RoomId AND Status = N'Active' AND Capacity >= @Capacity)
        THROW 51000, N'Phòng chưa sẵn sàng hoặc sức chứa nhỏ hơn sĩ số tối đa của lớp.', 1;
    IF EXISTS (SELECT 1 FROM dbo.ClassSessions s JOIN dbo.Classes c ON c.ClassId = s.ClassId
               WHERE s.SessionId <> @SessionId AND s.Status = N'Scheduled' AND s.SessionDate = @Date
                 AND s.StartTime < @End AND @Start < s.EndTime
                 AND (s.ClassId = @ClassId OR (@TeacherId IS NOT NULL AND c.TeacherId = @TeacherId)
                      OR (@RoomId IS NOT NULL AND s.RoomId = @RoomId)))
        THROW 51000, N'Trùng lịch lớp, giáo viên hoặc phòng học.', 1;
    IF EXISTS (SELECT 1 FROM dbo.TeacherAvailability WHERE TeacherId = @TeacherId)
       AND NOT EXISTS (SELECT 1 FROM dbo.TeacherAvailability WHERE TeacherId = @TeacherId
           AND Weekday = ((DATEDIFF(day, '19000101', @Date) % 7 + 7) % 7) + 1 AND StartsAt <= @Start AND EndsAt >= @End)
        THROW 51000, N'Buổi học nằm ngoài thời gian giảng viên có thể dạy.', 1;
    IF EXISTS (
        SELECT 1 FROM dbo.ClassSessions s
        JOIN dbo.AcademicScheduledStudents otherStudent ON otherStudent.ClassId = s.ClassId
        WHERE s.SessionId <> @SessionId AND s.Status = N'Scheduled' AND s.SessionDate = @Date
          AND s.StartTime < @End AND @Start < s.EndTime
          AND (otherStudent.StudentId = @ExtraStudentId OR EXISTS (
              SELECT 1 FROM dbo.MakeupSessionAssignments currentMakeup
              WHERE currentMakeup.SessionId=@SessionId AND currentMakeup.StudentId=otherStudent.StudentId)
              OR EXISTS (
              SELECT 1 FROM dbo.AcademicScheduledStudents e WHERE e.ClassId = @ClassId AND e.StudentId = otherStudent.StudentId))
    ) OR EXISTS (
        SELECT 1 FROM dbo.MakeupSessionAssignments m JOIN dbo.ClassSessions s ON s.SessionId = m.SessionId
        WHERE s.SessionId <> @SessionId AND s.Status = N'Scheduled' AND s.SessionDate = @Date
          AND s.StartTime < @End AND @Start < s.EndTime AND (m.StudentId = @ExtraStudentId OR EXISTS (
            SELECT 1 FROM dbo.MakeupSessionAssignments currentMakeup
            WHERE currentMakeup.SessionId=@SessionId AND currentMakeup.StudentId=m.StudentId)
            OR EXISTS (
            SELECT 1 FROM dbo.AcademicScheduledStudents e WHERE e.ClassId = @ClassId AND e.StudentId = m.StudentId))
    )
        THROW 51000, N'Học sinh đã có lịch học trùng thời gian.', 1;
END
GO
CREATE TRIGGER dbo.AcademicCourseLifecycle ON dbo.Courses AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF TRIGGER_NESTLEVEL() > 1 RETURN;
    IF EXISTS (SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.CourseId = i.CourseId
               WHERE i.Status IN (N'Published', N'Active') AND d.CourseId IS NOT NULL AND d.Status NOT IN (N'Published', N'Active')
               AND NOT EXISTS (SELECT 1 FROM dbo.CourseApprovals a WHERE a.CourseId = i.CourseId AND a.ReviewStatus = N'Approved'))
        THROW 51000, N'Khóa học cần được duyệt trước khi xuất bản.', 1;
    INSERT dbo.CourseApprovals(CourseId, ReviewStatus)
    SELECT i.CourseId, CASE WHEN i.Status IN (N'Published', N'Active') THEN N'Approved' ELSE N'Draft' END
    FROM inserted i WHERE NOT EXISTS (SELECT 1 FROM dbo.CourseApprovals a WHERE a.CourseId = i.CourseId);
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.CourseId = i.CourseId WHERE EXISTS (
        SELECT i.Name, i.Description, i.LevelCode, i.LearningObjectives, i.TuitionVnd
        EXCEPT SELECT d.Name, d.Description, d.LevelCode, d.LearningObjectives, d.TuitionVnd))
    BEGIN
        UPDATE a SET ReviewStatus = N'Revision', Comment = N'Nội dung khóa học đã thay đổi. Cần gửi duyệt lại.',
            Version = Version + 1, UpdatedAt = SYSUTCDATETIME()
        FROM dbo.CourseApprovals a JOIN inserted i ON i.CourseId = a.CourseId JOIN deleted d ON d.CourseId = i.CourseId
        WHERE (a.ReviewStatus = N'Pending' OR a.ReviewStatus = N'Approved' AND a.ReviewedBy IS NOT NULL) AND EXISTS (
            SELECT i.Name, i.Description, i.LevelCode, i.LearningObjectives, i.TuitionVnd
            EXCEPT SELECT d.Name, d.Description, d.LevelCode, d.LearningObjectives, d.TuitionVnd);
        UPDATE c SET Status = N'Draft' FROM dbo.Courses c JOIN dbo.CourseApprovals a ON a.CourseId = c.CourseId
        WHERE a.ReviewStatus = N'Revision' AND c.Status IN (N'Published', N'Active');
    END
END
GO
CREATE TRIGGER dbo.AcademicLessonReview ON dbo.Lessons AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE a SET ReviewStatus = N'Revision', Comment = N'Chương trình đã thay đổi. Cần gửi duyệt lại.',
        Version = Version + 1, UpdatedAt = SYSUTCDATETIME()
    FROM dbo.CourseApprovals a WHERE (a.ReviewStatus = N'Pending' OR a.ReviewStatus = N'Approved' AND a.ReviewedBy IS NOT NULL) AND
        a.CourseId IN (SELECT CourseId FROM inserted UNION SELECT CourseId FROM deleted);
    UPDATE c SET Status = N'Draft' FROM dbo.Courses c JOIN dbo.CourseApprovals a ON a.CourseId = c.CourseId
    WHERE a.ReviewStatus = N'Revision' AND c.Status IN (N'Published', N'Active');
END
GO
CREATE TRIGGER dbo.AcademicMaterialReview ON dbo.LessonMaterials AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE a SET ReviewStatus = N'Revision', Comment = N'Học liệu đã thay đổi. Cần gửi duyệt lại.',
        Version = Version + 1, UpdatedAt = SYSUTCDATETIME()
    FROM dbo.CourseApprovals a JOIN dbo.Lessons l ON l.CourseId = a.CourseId
    WHERE (a.ReviewStatus = N'Pending' OR a.ReviewStatus = N'Approved' AND a.ReviewedBy IS NOT NULL)
      AND l.LessonId IN (SELECT LessonId FROM inserted UNION SELECT LessonId FROM deleted);
    UPDATE c SET Status = N'Draft' FROM dbo.Courses c JOIN dbo.CourseApprovals a ON a.CourseId = c.CourseId
    WHERE a.ReviewStatus = N'Revision' AND c.Status IN (N'Published', N'Active');
END

GO
CREATE PROCEDURE dbo.ValidateAcademicPlacement @ClassId int,@StudentId int
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1 FROM dbo.ClassSessions s JOIN dbo.ClassSessions otherSession ON otherSession.SessionDate=s.SessionDate
        JOIN dbo.AcademicScheduledStudents otherStudent ON otherStudent.ClassId=otherSession.ClassId
        WHERE s.ClassId=@ClassId AND s.Status='Scheduled' AND otherSession.Status='Scheduled' AND otherSession.ClassId<>@ClassId
          AND otherStudent.StudentId=@StudentId AND s.StartTime<otherSession.EndTime AND otherSession.StartTime<s.EndTime
    ) OR EXISTS (
        SELECT 1 FROM dbo.ClassSessions s JOIN dbo.MakeupSessionAssignments m ON m.StudentId=@StudentId
        JOIN dbo.ClassSessions otherSession ON otherSession.SessionId=m.SessionId
        WHERE s.ClassId=@ClassId AND s.Status='Scheduled' AND otherSession.Status='Scheduled'
          AND s.SessionId<>otherSession.SessionId AND s.SessionDate=otherSession.SessionDate
          AND s.StartTime<otherSession.EndTime AND otherSession.StartTime<s.EndTime
    ) THROW 51000,N'Học sinh đã có lịch học hoặc đơn giữ chỗ trùng thời gian.',1;
END

GO
CREATE OR ALTER PROCEDURE dbo.ReserveParentCourseCheckout
    @ParentId int, @StudentId int, @ClassId int, @OrderCode bigint, @Provider nvarchar(8), @ExpiresAt datetime2
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;

    DECLARE @AcademicLock int;
    EXEC @AcademicLock=sys.sp_getapplock @Resource=N'Teky.AcademicOperations',@LockMode='Exclusive',@LockTimeout=10000;
    IF @AcademicLock<0 THROW 51000,N'Đang có cập nhật lịch học. Vui lòng thử lại.',1;
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
               AND COALESCE((SELECT TOP(1) CASE
                    WHEN r.Status=N'Declined' OR (r.Status=N'Pending' AND r.ProcessedBy IS NOT NULL) THEN 1 ELSE 0 END
                    FROM dbo.ParentCourseRequests r JOIN dbo.Classes requestedClass ON requestedClass.ClassId=r.ClassId
                    WHERE r.StudentId=@StudentId AND requestedClass.CourseId=@CourseId
                      AND (r.ProcessedBy IS NOT NULL OR r.Status IN (N'Accepted',N'Declined'))
                    ORDER BY COALESCE(r.UpdatedAt,r.RequestedAt) DESC,r.RequestId DESC),0)=0
               AND NOT EXISTS (SELECT 1 FROM dbo.ParentCourseCheckouts
                               WHERE IsOpen = 1 AND StudentId = @StudentId AND CourseId = @CourseId)
               AND NOT EXISTS (SELECT 1 FROM dbo.Enrollments e JOIN dbo.Classes cl ON cl.ClassId = e.ClassId
                               WHERE e.StudentId = @StudentId AND cl.CourseId = @CourseId AND e.Status IN (N'Active', N'Completed'))
               AND @Capacity > (SELECT COUNT(*) FROM dbo.Enrollments WHERE ClassId = @ClassId AND Status = N'Active')
                             + (SELECT COUNT(*) FROM dbo.ParentCourseCheckouts WHERE ClassId = @ClassId AND IsOpen = 1)
            BEGIN
                EXEC dbo.ValidateAcademicPlacement @ClassId,@StudentId;
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
CREATE OR ALTER PROCEDURE dbo.ResolveParentCourseCheckout
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

            UPDATE dbo.ParentCourseRequests SET Status=N'Accepted',UpdatedAt=SYSUTCDATETIME(),Version=Version+1
            WHERE StudentId=@StudentId AND ClassId=@ClassId AND Status<>N'Declined';
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
CREATE PROCEDURE dbo.SeedDemoAcademicOperations
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;
    DECLARE @dept int=(SELECT TOP(1) DepartmentId FROM dbo.Departments WHERE Code='ACADEMIC' AND IsActive=1),
        @teacher int=(SELECT TOP(1) UserId FROM dbo.Users WHERE Email='teacher@teky.edu.vn'),
        @student int=(SELECT TOP(1) UserId FROM dbo.Users WHERE Email='student@teky.edu.vn'),
        @parent int=(SELECT TOP(1) UserId FROM dbo.Users WHERE Email='parent@teky.edu.vn'),
        @today date=CONVERT(date,DATEADD(hour,7,SYSUTCDATETIME()));
    IF @dept IS NULL BEGIN COMMIT TRANSACTION; RETURN; END;
    IF NOT EXISTS (SELECT 1 FROM dbo.Courses WITH (UPDLOCK,HOLDLOCK) WHERE CourseCode='DEMO-AM-STEM')
    BEGIN
        INSERT dbo.Courses(CourseCode,Name,Description,DepartmentId,Status,LearningObjectives,TuitionVnd)
        VALUES('DEMO-AM-STEM',N'[Demo Academic] Khám phá robot',N'Khóa học minh họa quy trình kiểm duyệt và tổ chức đào tạo.',
            @dept,'Draft',N'Điều khiển robot di chuyển, đọc tín hiệu và hoàn thành thử thách.',0);
        DECLARE @course int=CONVERT(int,SCOPE_IDENTITY());
        INSERT dbo.Lessons(CourseId,OrderNo,Title,Content) VALUES
            (@course,1,N'Điều khiển robot',N'Thực hành lệnh tiến, lùi và quay.'),
            (@course,2,N'Cảm biến và tín hiệu',N'Đọc cảm biến để điều khiển robot.');
        IF @teacher IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.TeacherProfiles WHERE UserId=@teacher)
            INSERT dbo.TeacherProfiles(UserId,TeacherCode,Specialty) VALUES(@teacher,'DEMO-AM-T',N'Robotics, Scratch');
        INSERT dbo.Classes(ClassCode,CourseId,Name,TeacherId,MaxStudents,StartDate,EndDate,Status)
        VALUES('DEMO-AM-01',@course,N'[Demo] Robot · lớp A',@teacher,12,DATEADD(day,-7,@today),DATEADD(day,30,@today),'Open'),
              ('DEMO-AM-02',@course,N'[Demo] Robot · lớp B',NULL,12,DATEADD(day,-7,@today),DATEADD(day,30,@today),'Open');
        IF NOT EXISTS (SELECT 1 FROM dbo.Rooms WHERE RoomName=N'[Demo] STEM Lab')
            INSERT dbo.Rooms(RoomName,Capacity,Status,DepartmentId) VALUES(N'[Demo] STEM Lab',16,'Active',@dept);
        DECLARE @room int=(SELECT RoomId FROM dbo.Rooms WHERE RoomName=N'[Demo] STEM Lab'),
            @class int=(SELECT ClassId FROM dbo.Classes WHERE ClassCode='DEMO-AM-01'),
            @lesson int=(SELECT LessonId FROM dbo.Lessons WHERE CourseId=@course AND OrderNo=1);
        INSERT dbo.ClassSessions(ClassId,LessonId,SessionDate,StartTime,EndTime,Status)
        VALUES(@class,@lesson,DATEADD(day,2,@today),'17:00','18:00','Scheduled'),
              (@class,@lesson,DATEADD(day,-2,@today),'17:00','18:00','Done');
        DECLARE @absentSession int=CONVERT(int,SCOPE_IDENTITY());
        IF @student IS NOT NULL AND EXISTS (SELECT 1 FROM dbo.StudentProfiles WHERE UserId=@student)
        BEGIN
            INSERT dbo.AttendanceRecords(SessionId,StudentId,Status,MarkedBy,AbsenceReason)
            VALUES(@absentSession,@student,'Absent',COALESCE(@teacher,@student),N'[Demo] Vắng có phép');
            INSERT dbo.MakeupRequests(AttendanceId,RequestedBy,Reason)
            VALUES(CONVERT(bigint,SCOPE_IDENTITY()),COALESCE(@parent,@student),N'[Demo] Xin học bù bài điều khiển robot.');
            IF @parent IS NOT NULL AND EXISTS (SELECT 1 FROM dbo.ParentStudentLinks
                WHERE ParentId=@parent AND StudentId=@student AND Status='Active')
                INSERT dbo.ParentCourseRequests(ParentId,StudentId,ClassId) VALUES(@parent,@student,@class);
        END
        INSERT dbo.StemEquipment(Code,Name,RoomId,Status,PurchaseDate,CostVnd,UsefulLifeMonths,Note,DepartmentId)
        VALUES('DEMO-AM-ROBOT',N'[Demo] Robot STEM',@room,'Available',@today,2400000,36,N'Thiết bị minh họa.',@dept);
    END
    COMMIT TRANSACTION;
END

GO
CREATE OR ALTER PROCEDURE dbo.SeedDemoParentCheckout
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
        VALUES (@ClassId, @LessonId, DATEADD(day, 2, @today), '12:00', '13:30', N'Scheduled');
    COMMIT TRANSACTION;
END
