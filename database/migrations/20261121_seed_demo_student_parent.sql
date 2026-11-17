-- Installed by schema migration. Only Development demo startup invokes this procedure.
CREATE OR ALTER PROCEDURE dbo.SeedDemoStudentParent
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;

    DECLARE @lock int;
    EXEC @lock = sys.sp_getapplock @Resource=N'Teky.SeedDemoStudentParent',
        @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=15000;
    IF @lock < 0 THROW 51000, 'Could not acquire the demo data seed lock.', 1;

    DECLARE @student int = (
        SELECT u.UserId FROM dbo.Users u WHERE u.NormalizedEmail=N'student@teky.edu.vn'
            AND u.PrimaryRoleId=1 AND u.Status=N'Active' AND u.ActivationPending=0
            AND EXISTS (SELECT 1 FROM dbo.UserRoles r WHERE r.UserId=u.UserId AND r.RoleId=1 AND r.RevokedAt IS NULL)
    );
    DECLARE @parent int = (
        SELECT u.UserId FROM dbo.Users u WHERE u.NormalizedEmail=N'parent@teky.edu.vn'
            AND u.PrimaryRoleId=4 AND u.Status=N'Active' AND u.ActivationPending=0
            AND EXISTS (SELECT 1 FROM dbo.UserRoles r WHERE r.UserId=u.UserId AND r.RoleId=4 AND r.RevokedAt IS NULL)
    );
    IF @student IS NULL OR @parent IS NULL
    BEGIN
        COMMIT;
        RETURN;
    END;

    INSERT dbo.StudentProfiles(UserId, StudentCode, GradeLevel)
    SELECT @student, CONCAT(N'DEMO-HS-', @student), N'Lớp 4'
    WHERE NOT EXISTS (SELECT 1 FROM dbo.StudentProfiles WHERE UserId=@student)
        AND NOT EXISTS (SELECT 1 FROM dbo.StudentProfiles WHERE StudentCode=CONCAT(N'DEMO-HS-', @student));
    IF NOT EXISTS (SELECT 1 FROM dbo.StudentProfiles WHERE UserId=@student)
    BEGIN
        COMMIT;
        RETURN;
    END;

    INSERT dbo.ParentProfiles(UserId)
    SELECT @parent WHERE NOT EXISTS (SELECT 1 FROM dbo.ParentProfiles WHERE UserId=@parent);
    INSERT dbo.ParentStudentLinks(ParentId, StudentId, Relationship, Status)
    SELECT @parent, @student, N'Mẹ', N'Active'
    WHERE NOT EXISTS (SELECT 1 FROM dbo.ParentStudentLinks WHERE ParentId=@parent AND StudentId=@student);

    DECLARE @today date = CONVERT(date, DATEADD(hour, 7, SYSUTCDATETIME()));
    DECLARE @courses TABLE (
        CourseCode nvarchar(20) PRIMARY KEY, Name nvarchar(200), Objectives nvarchar(2000),
        TuitionVnd int, ClassCode nvarchar(30), StartHour time, EndHour time
    );
    INSERT @courses VALUES
        (N'DEMO-SEED-PY', N'[Demo] Lập trình Python nhập môn',
            N'Viết chương trình dùng biến, điều kiện và vòng lặp.', 2400000, N'DEMO-SEED-PY-01', '09:00', '10:30'),
        (N'DEMO-SEED-3D', N'[Demo] Thiết kế thế giới 3D',
            N'Bố trí vật thể, xây dựng địa hình và điều chỉnh ánh sáng.', 2800000, N'DEMO-SEED-3D-01', '14:00', '15:30');

    INSERT dbo.Courses(CourseCode, Name, Description, LevelCode, Status, LearningObjectives, TuitionVnd)
    SELECT s.CourseCode, s.Name, N'Khóa học minh họa cho cổng học sinh và phụ huynh.',
        N'Beginner', N'Published', s.Objectives, s.TuitionVnd
    FROM @courses s WHERE NOT EXISTS (SELECT 1 FROM dbo.Courses c WHERE c.CourseCode=s.CourseCode);

    INSERT dbo.Classes(ClassCode, CourseId, Name, StartDate, EndDate, Status)
    SELECT s.ClassCode, c.CourseId, s.Name, DATEADD(day, -7, @today), DATEADD(day, 21, @today), N'Open'
    FROM @courses s JOIN dbo.Courses c ON c.CourseCode=s.CourseCode
    WHERE NOT EXISTS (SELECT 1 FROM dbo.Classes cl WHERE cl.ClassCode=s.ClassCode);

    DECLARE @lessons TABLE(CourseCode nvarchar(20), OrderNo int, Title nvarchar(200), Content nvarchar(1000));
    INSERT @lessons VALUES
        (N'DEMO-SEED-PY', 1, N'Biến và dữ liệu', N'Tạo biến và in giá trị với print().'),
        (N'DEMO-SEED-PY', 2, N'Điều kiện if và else', N'Viết điều kiện kiểm tra câu trả lời đúng hay sai.'),
        (N'DEMO-SEED-PY', 3, N'Vòng lặp và trò chơi', N'Dùng vòng lặp để cho phép người chơi thử nhiều lần.'),
        (N'DEMO-SEED-3D', 1, N'Tọa độ và vật thể', N'Tạo vật thể và di chuyển theo ba trục.'),
        (N'DEMO-SEED-3D', 2, N'Địa hình 3D', N'Thiết kế địa hình và sắp xếp vật thể.'),
        (N'DEMO-SEED-3D', 3, N'Ánh sáng và bối cảnh', N'Điều chỉnh ánh sáng để làm rõ chủ đề của bối cảnh.');

    INSERT dbo.Lessons(CourseId, OrderNo, Title, Content)
    SELECT c.CourseId, s.OrderNo, s.Title, s.Content
    FROM @lessons s JOIN dbo.Courses c ON c.CourseCode=s.CourseCode
    WHERE NOT EXISTS (SELECT 1 FROM dbo.Lessons l WHERE l.CourseId=c.CourseId AND l.OrderNo=s.OrderNo);

    INSERT dbo.Enrollments(ClassId, StudentId, Status, ProgressPercent)
    SELECT cl.ClassId, @student, N'Active', 33.33
    FROM @courses s JOIN dbo.Courses c ON c.CourseCode=s.CourseCode
    JOIN dbo.Classes cl ON cl.ClassCode=s.ClassCode AND cl.CourseId=c.CourseId
    WHERE NOT EXISTS (SELECT 1 FROM dbo.Enrollments e WHERE e.ClassId=cl.ClassId AND e.StudentId=@student);

    INSERT dbo.ClassSessions(ClassId, LessonId, SessionDate, StartTime, EndTime, Status)
    SELECT cl.ClassId, l.LessonId,
        DATEADD(day, CASE l.OrderNo WHEN 1 THEN -7 WHEN 2 THEN 2 ELSE 9 END, @today),
        s.StartHour, s.EndHour, CASE WHEN l.OrderNo=1 THEN N'Done' ELSE N'Scheduled' END
    FROM @courses s JOIN dbo.Courses c ON c.CourseCode=s.CourseCode
    JOIN dbo.Classes cl ON cl.ClassCode=s.ClassCode AND cl.CourseId=c.CourseId
    JOIN dbo.Lessons l ON l.CourseId=c.CourseId AND l.OrderNo BETWEEN 1 AND 3 AND l.IsDeleted=0
    WHERE NOT EXISTS (SELECT 1 FROM dbo.ClassSessions cs WHERE cs.ClassId=cl.ClassId AND cs.LessonId=l.LessonId);

    INSERT dbo.LessonProgress(StudentId, LessonId, ViewedAt, CompletedAt)
    SELECT @student, l.LessonId, DATEADD(day, -7, SYSUTCDATETIME()), DATEADD(day, -7, SYSUTCDATETIME())
    FROM @courses s JOIN dbo.Courses c ON c.CourseCode=s.CourseCode
    JOIN dbo.Lessons l ON l.CourseId=c.CourseId AND l.OrderNo=1 AND l.IsDeleted=0
    WHERE NOT EXISTS (SELECT 1 FROM dbo.LessonProgress p WHERE p.StudentId=@student AND p.LessonId=l.LessonId);

    COMMIT;
END;
