-- Chạy riêng trên database Development đã có schema và hồ sơ demo Student/Teacher.
-- Tham chiếu: https://schoollms.teky.vn/dashboard/timetable/20507782
-- Mục tiêu dựa trên trang tham chiếu. Hướng dẫn, câu tự kiểm tra và bài thực hành do nhóm demo biên soạn.
-- Chạy lại chỉ bổ sung bản ghi còn thiếu. ID do SQL Server cấp.
SET NOCOUNT ON;
SET XACT_ABORT ON;
-- SQL Server yêu cầu các tùy chọn này khi ghi bảng có filtered index.
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;

IF DB_NAME() <> N'Teky_Learning_Hub'
    THROW 51001, N'Hãy chọn database Development Teky_Learning_Hub trước khi chạy.', 1;

DECLARE @CourseCode NVARCHAR(20) = N'DEMO-SNLT-HP3';
DECLARE @ClassCode NVARCHAR(30) = N'DEMO-SNLT-HP3-01';
DECLARE @LessonTitle NVARCHAR(200) = N'Thiên nhiên huyền ảo';
DECLARE @AssignmentTitle NVARCHAR(200) = N'Dự án demo: Thung lũng lúc hoàng hôn';
-- Ngày giờ theo lịch mẫu Việt Nam (UTC+07).
DECLARE @SessionDate DATE = '20261114';
DECLARE @StartTime TIME = '14:00';
DECLARE @EndTime TIME = '16:00';
DECLARE @StudentId INT, @TeacherId INT, @CourseId INT, @ClassId INT, @LessonId INT, @SessionId INT;
DECLARE @LockResult INT;

BEGIN TRY
    BEGIN TRANSACTION;

    EXEC @LockResult = sys.sp_getapplock
        @Resource = N'Teky.Demo.ThienNhienHuyenAo',
        @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;
    IF @LockResult < 0
        THROW 51002, N'Không lấy được khóa nạp dữ liệu demo.', 1;

    SELECT @StudentId = p.UserId
    FROM dbo.StudentProfiles AS p
    JOIN dbo.Users AS u ON u.UserId = p.UserId
    JOIN dbo.Roles AS r ON r.RoleId = u.RoleId
    WHERE u.Email = N'student@teky.edu.vn' AND u.Status = N'Active' AND r.RoleName = N'Student';

    SELECT @TeacherId = p.UserId
    FROM dbo.TeacherProfiles AS p
    JOIN dbo.Users AS u ON u.UserId = p.UserId
    JOIN dbo.Roles AS r ON r.RoleId = u.RoleId
    WHERE u.Email = N'teacher@teky.edu.vn' AND u.Status = N'Active' AND r.RoleName = N'Teacher';

    IF @StudentId IS NULL OR @TeacherId IS NULL
        THROW 51003, N'Cần hồ sơ Student và Teacher demo từ bộ seed chính trước khi chạy script này.', 1;

    SELECT @CourseId = CourseId FROM dbo.Courses WHERE CourseCode = @CourseCode;
    IF @CourseId IS NULL
    BEGIN
        INSERT dbo.Courses (CourseCode, Name, Description, CreatedBy)
        VALUES (@CourseCode, N'Siêu nhân lập trình — Học phần 3 (Demo)',
                N'Thiết kế môi trường trò chơi 3D với địa hình, ánh sáng và hiệu ứng hậu kỳ.', @TeacherId);
        SET @CourseId = CONVERT(INT, SCOPE_IDENTITY());
    END;

    SELECT @ClassId = ClassId FROM dbo.Classes WHERE ClassCode = @ClassCode;
    IF @ClassId IS NULL
    BEGIN
        INSERT dbo.Classes (ClassCode, CourseId, TeacherId, Name, StartDate, EndDate, Status)
        VALUES (@ClassCode, @CourseId, @TeacherId, N'Lớp demo thiết kế môi trường 3D',
                @SessionDate, @SessionDate, N'Open');
        SET @ClassId = CONVERT(INT, SCOPE_IDENTITY());
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Classes WHERE ClassId = @ClassId AND CourseId = @CourseId)
        THROW 51004, N'Mã lớp demo đã được dùng cho khóa học khác.', 1;

    SELECT @LessonId = LessonId
    FROM dbo.Lessons WHERE CourseId = @CourseId AND Title = @LessonTitle AND IsDeleted = 0;
    IF @LessonId IS NULL
    BEGIN
        INSERT dbo.Lessons (CourseId, Title, Content, OrderNo)
        VALUES (@CourseId, @LessonTitle, N'Thiết kế một thung lũng 3D vào lúc hoàng hôn. Trong buổi này, em sẽ tạo địa hình, chọn bầu trời và thử các hiệu ứng giúp cảnh có chiều sâu.

MỤC TIÊU BUỔI HỌC
1. Dựng một bối cảnh trò chơi có đồi, mặt nước và lối đi bằng công cụ địa hình.
2. Điều chỉnh Lighting, Atmosphere và Sky để tạo ánh sáng và bầu trời phù hợp với bối cảnh.
3. So sánh cảnh khi bật và tắt BlurEffect, rồi chọn mức làm mờ vẫn giữ cảnh dễ quan sát.

THỰC HÀNH
• Dùng Terrain Editor tạo hai ngọn đồi và một hồ nước. Đặt điểm xuất phát cạnh lối đi.
• Chỉnh ClockTime để tạo cảnh hoàng hôn. Dùng Sky và Atmosphere để điều chỉnh bầu trời và lớp mờ phía chân trời.
• Thêm BlurEffect vào Lighting, thay đổi Size và so sánh cảnh khi tắt hiệu ứng.
• Chạy thử cảnh, kiểm tra lối đi từ điểm xuất phát đến hồ, rồi lưu dự án.

TỰ KIỂM TRA
1. Thuộc tính nào đổi giờ trong cảnh? A. ClockTime  B. Density  C. Size
2. Đối tượng nào điều chỉnh lớp mờ của khí quyển? A. Terrain  B. Atmosphere  C. SpawnLocation
3. Thuộc tính nào điều chỉnh độ mạnh của BlurEffect? A. Size  B. ClockTime  C. Brightness

SẢN PHẨM THỰC HÀNH
Lưu tệp Roblox Studio và hai ảnh chụp cùng một góc nhìn trước và sau khi thêm hiệu ứng. Giải thích em đã chỉnh gì để cảnh vẫn rõ lối đi.', 1);
        SET @LessonId = CONVERT(INT, SCOPE_IDENTITY());
    END;

    INSERT dbo.LessonMaterials (LessonId, MaterialType, Title, FileUrl, IsDownloadable, SortOrder)
    SELECT @LessonId, N'Document', m.Title, m.Url, 0, m.SortOrder
    FROM (VALUES
        (1, N'Tạo và chỉnh sửa địa hình', N'https://create.roblox.com/docs/studio/terrain-editor'),
        (2, N'Ánh sáng và hiệu ứng môi trường', N'https://create.roblox.com/docs/environment'),
        (3, N'Tùy chỉnh bầu trời với Skybox', N'https://create.roblox.com/docs/environment/skybox'),
        (4, N'Thuộc tính BlurEffect', N'https://create.roblox.com/docs/reference/engine/classes/BlurEffect')
    ) AS m(SortOrder, Title, Url)
    WHERE NOT EXISTS (
        SELECT 1 FROM dbo.LessonMaterials AS lm WHERE lm.LessonId = @LessonId AND lm.FileUrl = m.Url
    );

    SELECT @SessionId = SessionId
    FROM dbo.ClassSessions WHERE ClassId = @ClassId AND LessonId = @LessonId;
    IF @SessionId IS NULL
    BEGIN
        INSERT dbo.ClassSessions (ClassId, LessonId, SessionDate, StartTime, EndTime, Status)
        VALUES (@ClassId, @LessonId, @SessionDate, @StartTime, @EndTime, N'Scheduled');
        SET @SessionId = CONVERT(INT, SCOPE_IDENTITY());
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Enrollments WHERE ClassId = @ClassId AND StudentId = @StudentId)
        INSERT dbo.Enrollments (ClassId, StudentId) VALUES (@ClassId, @StudentId);

    IF NOT EXISTS (SELECT 1 FROM dbo.Assignments WHERE ClassId = @ClassId AND LessonId = @LessonId AND Title = @AssignmentTitle)
        INSERT dbo.Assignments (ClassId, LessonId, Title, Instructions, Status, CreatedBy)
        VALUES (@ClassId, @LessonId, @AssignmentTitle,
                N'Dựng thung lũng 3D có hồ, đường đi và ánh sáng hoàng hôn. Lưu tệp Roblox Studio, chụp hai ảnh trước và sau hiệu ứng, rồi mô tả cách em chỉnh ánh sáng và độ mờ.',
                N'Published', @TeacherId);

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

SELECT @CourseId AS CourseId, @ClassId AS ClassId, @LessonId AS LessonId, @SessionId AS SessionId,
       CONCAT(N'/dashboard/timetable/', @SessionId) AS LocalSessionPath;
