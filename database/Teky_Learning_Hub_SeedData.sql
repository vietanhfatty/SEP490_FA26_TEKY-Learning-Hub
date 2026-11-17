/* =====================================================================
   Teky_Learning_Hub - Seed Data Script
   Dữ liệu mẫu chuẩn nghiệp vụ cho toàn bộ hệ thống TEKY Learning Hub
   Mật khẩu mặc định của mọi tài khoản: Teky@2026!
   Mã băm BCrypt: $2a$11$ybVnGRaOImZMOJ0hwBKdPu/Q6pDlGIG5wr4UPNuaDYb4kWdXY500O
   ===================================================================== */
USE Teky_Learning_Hub;
GO

SET NOCOUNT ON;

PRINT N'>>> Đang khởi tạo dữ liệu mẫu (Seed Data) cho Teky_Learning_Hub...';

/* 1. VAI TRÒ HỆ THỐNG (Roles) */
MERGE INTO Roles AS target
USING (VALUES 
    (1, N'Student'),
    (2, N'Teacher'),
    (3, N'Admin'),
    (4, N'Parent'),
    (5, N'Staff')
) AS source (RoleId, RoleName)
ON target.RoleId = source.RoleId
WHEN MATCHED THEN 
    UPDATE SET target.RoleName = source.RoleName
WHEN NOT MATCHED THEN 
    INSERT (RoleId, RoleName) VALUES (source.RoleId, source.RoleName);

/* 2. TÀI KHOẢN NGƯỜI DÙNG (Users) */
DECLARE @DefaultPwdHash NVARCHAR(255) = N'$2a$11$ybVnGRaOImZMOJ0hwBKdPu/Q6pDlGIG5wr4UPNuaDYb4kWdXY500O'; -- Teky@2026!

SET IDENTITY_INSERT Users ON;

MERGE INTO Users AS target
USING (VALUES
    -- Quản trị hệ thống & Quản lý học thuật (RoleId = 3)
    (1, N'admin@teky.edu.vn', @DefaultPwdHash, 3, N'Admin Kỹ Thuật Hệ Thống', N'0901234500', N'Cơ sở TEKY Cầu Giấy, Hà Nội', N'/avatars/admin.png', N'Dark', N'Active', 0, 0),
    (2, N'manager@teky.edu.vn', @DefaultPwdHash, 3, N'Đỗ Thị Hồng', N'0901234504', N'Trụ sở Học viện TEKY, Hà Nội', N'/avatars/manager.png', N'Light', N'Active', 0, 0),

    -- Giảng viên / Tutors (RoleId = 2)
    (3, N'teacher@teky.edu.vn', @DefaultPwdHash, 2, N'Thầy Hoàng Văn Nam', N'0901234503', N'Quận Cầu Giấy, Hà Nội', N'/avatars/teacher_nam.png', N'Light', N'Active', 0, 0),
    (4, N'teacher.hoa@teky.edu.vn', @DefaultPwdHash, 2, N'Cô Lê Thị Mai Hoa', N'0901234510', N'Quận Thanh Xuân, Hà Nội', N'/avatars/teacher_hoa.png', N'Light', N'Active', 0, 0),
    (5, N'teacher.duc@teky.edu.vn', @DefaultPwdHash, 2, N'Thầy Nguyễn Trọng Đức', N'0901234511', N'Quận Ba Đình, Hà Nội', N'/avatars/teacher_duc.png', N'Light', N'Active', 0, 0),

    -- Học sinh / Students (RoleId = 1)
    (6, N'student@teky.edu.vn', @DefaultPwdHash, 1, N'Nguyễn Minh Quân', N'0901234501', N'Khu đô thị Trung Hòa, Cầu Giấy, Hà Nội', N'/avatars/student_quan.png', N'Light', N'Active', 0, 0),
    (7, N'student.ha@teky.edu.vn', @DefaultPwdHash, 1, N'Trần Đức Hà', N'0901234506', N'Phường Dịch Vọng Hậu, Cầu Giấy, Hà Nội', N'/avatars/student_ha.png', N'Light', N'Active', 0, 0),
    (8, N'student.chi@teky.edu.vn', @DefaultPwdHash, 1, N'Phạm Mai Chi', N'0901234507', N'Vinhomes Times City, Hai Bà Trưng, Hà Nội', N'/avatars/student_chi.png', N'Light', N'Active', 0, 0),
    (9, N'student.khoi@teky.edu.vn', @DefaultPwdHash, 1, N'Vũ Đăng Khôi', N'0901234508', N'Phường Láng Hạ, Đống Đa, Hà Nội', N'/avatars/student_khoi.png', N'Light', N'Active', 0, 0),
    (10, N'student.an@teky.edu.vn', @DefaultPwdHash, 1, N'Lê Bảo An', N'0901234509', N'Khu đô thị Mỹ Đình 2, Nam Từ Liêm, Hà Nội', N'/avatars/student_an.png', N'Light', N'Active', 0, 0),

    -- Phụ huynh / Parents (RoleId = 4)
    (11, N'parent@teky.edu.vn', @DefaultPwdHash, 4, N'Trần Thu Trang', N'0901234502', N'Khu đô thị Trung Hòa, Cầu Giấy, Hà Nội', N'/avatars/parent_trang.png', N'Light', N'Active', 0, 0),
    (12, N'parent.tuan@teky.edu.vn', @DefaultPwdHash, 4, N'Nguyễn Văn Tuấn', N'0901234512', N'Phường Dịch Vọng Hậu, Cầu Giấy, Hà Nội', N'/avatars/parent_tuan.png', N'Light', N'Active', 0, 0),
    (13, N'parent.lan@teky.edu.vn', @DefaultPwdHash, 4, N'Vũ Hương Lan', N'0901234513', N'Phường Láng Hạ, Đống Đa, Hà Nội', N'/avatars/parent_lan.png', N'Light', N'Active', 0, 0),

    -- Nhân viên giáo vụ & Hỗ trợ vận hành cơ sở (RoleId = 5 - Staff)
    (14, N'staff@teky.edu.vn', @DefaultPwdHash, 5, N'Nguyễn Thu Nga', N'0901234514', N'Cơ sở TEKY Cầu Giấy, Hà Nội', N'/avatars/staff_nga.png', N'Light', N'Active', 0, 0),
    (15, N'staff.hoa@teky.edu.vn', @DefaultPwdHash, 5, N'Lê Văn Hòa', N'0901234515', N'Cơ sở TEKY Thanh Xuân, Hà Nội', N'/avatars/staff_hoa.png', N'Light', N'Active', 0, 0)
) AS source (UserId, Email, PasswordHash, RoleId, FullName, Phone, Address, AvatarUrl, ThemeMode, Status, MustChangePwd, FailedLoginCount)
ON target.UserId = source.UserId
WHEN MATCHED THEN
    UPDATE SET target.Email = source.Email,
               target.PasswordHash = source.PasswordHash,
               target.RoleId = source.RoleId,
               target.FullName = source.FullName,
               target.Phone = source.Phone,
               target.Address = source.Address,
               target.AvatarUrl = source.AvatarUrl,
               target.Status = source.Status
WHEN NOT MATCHED THEN
    INSERT (UserId, Email, PasswordHash, RoleId, FullName, Phone, Address, AvatarUrl, ThemeMode, Status, MustChangePwd, FailedLoginCount)
    VALUES (source.UserId, source.Email, source.PasswordHash, source.RoleId, source.FullName, source.Phone, source.Address, source.AvatarUrl, source.ThemeMode, source.Status, source.MustChangePwd, source.FailedLoginCount);

SET IDENTITY_INSERT Users OFF;

/* 3. HỒ SƠ PHÂN QUYỀN NGHIỆP VỤ (Profiles) */

-- Admin & Staff Profiles
MERGE INTO AdminProfiles AS target
USING (VALUES
    (1, N'TK-AD-001', N'System Administrator', 1),
    (2, N'TK-QL-001', N'Trưởng ban Đào tạo & Quản lý Học thuật', 2),
    (14, N'TK-NV-001', N'Chuyên viên Giáo vụ & Quản lý Lớp học', 3),
    (15, N'TK-NV-002', N'Chuyên viên Chăm sóc Phụ huynh & Điều phối Ca trực', 3)
) AS source (UserId, StaffCode, Position, PermissionLevel)
ON target.UserId = source.UserId
WHEN MATCHED THEN 
    UPDATE SET target.StaffCode = source.StaffCode, target.Position = source.Position, target.PermissionLevel = source.PermissionLevel
WHEN NOT MATCHED THEN
    INSERT (UserId, StaffCode, Position, PermissionLevel) VALUES (source.UserId, source.StaffCode, source.Position, source.PermissionLevel);

-- Teacher Profiles
MERGE INTO TeacherProfiles AS target
USING (VALUES
    (3, N'TK-GV-001', N'Robotics, IoT & Lập trình Scratch', N'Kỹ sư Cơ điện tử ĐH Bách Khoa, 5 năm kinh nghiệm huấn luyện học sinh thi đấu WRO & Robothon quốc tế.', '2022-01-15'),
    (4, N'TK-GV-002', N'Thiết kế 3D, Web Front-End & Mỹ thuật số', N'Cử nhân Thiết kế Đồ họa & CNTT, chuyên trách mảng Multimedia STEAM cho thiếu nhi.', '2023-03-01'),
    (5, N'TK-GV-003', N'Python, Machine Learning & Khoa học Dữ liệu', N'Thạc sĩ Khoa học Máy tính, dẫn dắt đội tuyển Tin học trẻ và sân chơi AI Contest.', '2022-08-20')
) AS source (UserId, TeacherCode, Specialty, Bio, HireDate)
ON target.UserId = source.UserId
WHEN MATCHED THEN
    UPDATE SET target.TeacherCode = source.TeacherCode, target.Specialty = source.Specialty, target.Bio = source.Bio, target.HireDate = source.HireDate
WHEN NOT MATCHED THEN
    INSERT (UserId, TeacherCode, Specialty, Bio, HireDate) VALUES (source.UserId, source.TeacherCode, source.Specialty, source.Bio, source.HireDate);

-- Student Profiles
MERGE INTO StudentProfiles AS target
USING (VALUES
    (6,  N'TK-HS-001', '2017-05-12', N'Nam', N'Tiểu học Archimedes Academy', N'Lớp 4', 1450, 380, N'Active'),
    (7,  N'TK-HS-002', '2015-09-24', N'Nam', N'THCS Đoàn Thị Điểm', N'Lớp 6', 1120, 260, N'Active'),
    (8,  N'TK-HS-003', '2018-02-18', N'Nữ',  N'Tiểu học Vinschool Times City', N'Lớp 3', 1850, 510, N'Active'),
    (9,  N'TK-HS-004', '2013-11-05', N'Nam', N'THCS Hà Nội - Amsterdam', N'Lớp 8', 2300, 640, N'Active'),
    (10, N'TK-HS-005', '2016-08-30', N'Nam', N'Tiểu học Lê Quý Đôn', N'Lớp 5', 720,  140, N'Active')
) AS source (UserId, StudentCode, DateOfBirth, Gender, SchoolName, GradeLevel, TotalXp, StemPoints, Status)
ON target.UserId = source.UserId
WHEN MATCHED THEN
    UPDATE SET target.StudentCode = source.StudentCode, target.GradeLevel = source.GradeLevel, target.TotalXp = source.TotalXp, target.StemPoints = source.StemPoints
WHEN NOT MATCHED THEN
    INSERT (UserId, StudentCode, DateOfBirth, Gender, SchoolName, GradeLevel, TotalXp, StemPoints, Status)
    VALUES (source.UserId, source.StudentCode, source.DateOfBirth, source.Gender, source.SchoolName, source.GradeLevel, source.TotalXp, source.StemPoints, source.Status);

-- Parent Profiles
MERGE INTO ParentProfiles AS target
USING (VALUES
    (11, N'Kỹ sư Phần mềm Senior'),
    (12, N'Bác sĩ Đa khoa'),
    (13, N'Giám đốc Tài chính')
) AS source (UserId, Occupation)
ON target.UserId = source.UserId
WHEN MATCHED THEN
    UPDATE SET target.Occupation = source.Occupation
WHEN NOT MATCHED THEN
    INSERT (UserId, Occupation) VALUES (source.UserId, source.Occupation);

-- Parent-Student Links
MERGE INTO ParentStudentLinks AS target
USING (VALUES
    (11, 6, N'Mẹ', N'Active'),
    (11, 8, N'Mẹ', N'Active'),
    (12, 7, N'Bố', N'Active'),
    (13, 9, N'Mẹ', N'Active')
) AS source (ParentId, StudentId, Relationship, Status)
ON target.ParentId = source.ParentId AND target.StudentId = source.StudentId
WHEN MATCHED THEN
    UPDATE SET target.Relationship = source.Relationship, target.Status = source.Status
WHEN NOT MATCHED THEN
    INSERT (ParentId, StudentId, Relationship, Status) VALUES (source.ParentId, source.StudentId, source.Relationship, source.Status);

/* 4. PHÒNG HỌC & KHÓA HỌC (Rooms & Courses) */
SET IDENTITY_INSERT Rooms ON;
MERGE INTO Rooms AS target
USING (VALUES
    (1, N'Lab STEAM 01', 20, N'Active'),
    (2, N'Lab Robotics 02', 20, N'Active'),
    (3, N'Phòng AI Studio & Data Lab', 16, N'Active'),
    (4, N'Phòng Thiết kế 3D & VR Lab', 18, N'Active')
) AS source (RoomId, RoomName, Capacity, Status)
ON target.RoomId = source.RoomId
WHEN MATCHED THEN
    UPDATE SET target.RoomName = source.RoomName, target.Capacity = source.Capacity, target.Status = source.Status
WHEN NOT MATCHED THEN
    INSERT (RoomId, RoomName, Capacity, Status) VALUES (source.RoomId, source.RoomName, source.Capacity, source.Status);
SET IDENTITY_INSERT Rooms OFF;

SET IDENTITY_INSERT Courses ON;
MERGE INTO Courses AS target
USING (VALUES
    (1, N'SCRATCH-PRO', N'Lập trình Sáng tạo Scratch & Game Design', N'Khóa học nền tảng tư duy thuật toán, giúp học viên 7-9 tuổi rèn luyện tư duy logic và xây dựng game 2D chuẩn CSTA Hoa Kỳ.', N'Sơ cấp', N'Active', 2),
    (2, N'PYTHON-AI', N'Python & Trí tuệ Nhân tạo Cho Thiếu Nhi', N'Nhập môn ngôn ngữ Python, giải thuật xử lý dữ liệu và tiếp cận các mô hình học máy thị giác máy tính nhận diện hình ảnh.', N'Trung cấp', N'Active', 2),
    (3, N'ROBO-IOT', N'Robotics & Chế tạo Xe Thông minh IoT', N'Thực hành lắp ráp phần cứng, kết nối cảm biến và lập trình điều khiển vi mạch ESP32 tự hành vượt mê cung.', N'Nâng cao', N'Active', 2),
    (4, N'WEB-CREATOR', N'Thiết kế Website & Mỹ thuật Số Front-End', N'Khám phá thế giới web với HTML5, Tailwind CSS, JavaScript và tự xây dựng trang portfolio cá nhân trên internet.', N'Trung cấp', N'Active', 2)
) AS source (CourseId, CourseCode, Name, Description, LevelCode, Status, CreatedBy)
ON target.CourseId = source.CourseId
WHEN MATCHED THEN
    UPDATE SET target.CourseCode = source.CourseCode, target.Name = source.Name, target.Description = source.Description
WHEN NOT MATCHED THEN
    INSERT (CourseId, CourseCode, Name, Description, LevelCode, Status, CreatedBy)
    VALUES (source.CourseId, source.CourseCode, source.Name, source.Description, source.LevelCode, source.Status, source.CreatedBy);
SET IDENTITY_INSERT Courses OFF;

/* 5. BÀI HỌC & HỌC LIỆU (Lessons & Materials) */
SET IDENTITY_INSERT Lessons ON;
MERGE INTO Lessons AS target
USING (VALUES
    -- Scratch Pro Lessons
    (1, 1, N'Bài 1: Khám phá Thế giới Scratch & Chuyển động Nhân vật', N'Làm quen giao diện sân khấu, khối lệnh Move, Glide và tạo hình nhân vật Sprite đầu tiên.', 1, 0),
    (2, 1, N'Bài 2: Vòng lặp & Sự kiện Tương tác Bàn phím', N'Sử dụng khối Repeat, Forever và lắng nghe sự kiện nhấn phím mũi tên điều khiển nhân vật.', 2, 0),
    (3, 1, N'Bài 3: Biến số, Điểm số & Xử lý Va chạm Sprites', N'Tạo biến Score, kiểm tra điều kiện Touching Sprite và hiệu ứng âm thanh cổ động.', 3, 0),
    (4, 1, N'Bài 4: Dự án Cuối khóa: Mê Cung Vượt Chướng Ngại Vật', N'Xây dựng trọn vẹn game mê cung tương tác, có tính giờ và màn hình chúc mừng chiến thắng.', 4, 0),

    -- Python AI Lessons
    (5, 2, N'Bài 1: Khởi động với Python: Biến, Kiểu Dữ liệu & Tính toán', N'Cú pháp Print, Input, các phép toán số học và kiểu dữ liệu cơ bản.', 1, 0),
    (6, 2, N'Bài 2: Cấu trúc Rẽ nhánh If-Else & Vòng lặp For', N'Kiểm tra logic điều kiện và tự động hóa tác vụ lặp trong Python.', 2, 0),
    (7, 2, N'Bài 3: Hàm (Functions) & Đồ họa Trực quan Turtle', N'Định nghĩa hàm def, truyền tham số và vẽ hình học phân dạng phong cách STEAM.', 3, 0),
    (8, 2, N'Bài 4: Ứng dụng AI: Trợ lý Ảo Nhận diện Giọng nói', N'Tích hợp thư viện SpeechRecognition và xây dựng chatbot tương tác hỏi đáp cơ bản.', 4, 0),

    -- Robo IoT Lessons
    (9,  3, N'Bài 1: Giới thiệu Vi điều khiển & Lắp ráp Khung xe Cơ bản', N'Nhận diện các linh kiện: Arduino/ESP32, cầu H điều khiển động cơ L298N, pin nguồn.', 1, 0),
    (10, 3, N'Bài 2: Điều khiển Động cơ DC & Lập trình Đổi hướng', N'Lập trình điều xung PWM điều khiển tốc độ và hướng rẽ của bánh xe robot.', 2, 0),
    (11, 3, N'Bài 3: Cảm biến Siêu âm Tránh Vật cản & Dò đường Line Tracker', N'Tính toán khoảng cách từ cảm biến siêu âm HC-SR04 và lập trình thuật toán né vật cản.', 3, 0),
    (12, 3, N'Bài 4: Kết nối Wi-Fi IoT & Điều khiển Xe từ xa', N'Thiết lập Web Server trên ESP32 và điều khiển xe robot qua giao diện điện thoại thông minh.', 4, 0)
) AS source (LessonId, CourseId, Title, Content, OrderNo, IsDeleted)
ON target.LessonId = source.LessonId
WHEN MATCHED THEN
    UPDATE SET target.Title = source.Title, target.Content = source.Content, target.OrderNo = source.OrderNo
WHEN NOT MATCHED THEN
    INSERT (LessonId, CourseId, Title, Content, OrderNo, IsDeleted)
    VALUES (source.LessonId, source.CourseId, source.Title, source.Content, source.OrderNo, source.IsDeleted);
SET IDENTITY_INSERT Lessons OFF;

SET IDENTITY_INSERT LessonMaterials ON;
MERGE INTO LessonMaterials AS target
USING (VALUES
    (1, 1,  N'Slide', N'Slide Bài 1: Làm quen sân khấu Scratch', N'/materials/scratch/slide_b1.pdf', 1, 1),
    (2, 4,  N'Document', N'Tài liệu hướng dẫn Code Game Mê Cung', N'/materials/scratch/huong_dan_me_cung.pdf', 1, 1),
    (3, 9,  N'AssemblyGuide', N'Sơ đồ lắp ráp khung xe thông minh 4 bánh', N'/materials/robo/so_do_lap_rap_xe.pdf', 1, 1),
    (4, 11, N'Video', N'Video mô phỏng thuật toán tránh vật cản', N'https://teky.edu.vn/videos/robo_obstacle_avoidance.mp4', 0, 1),
    (5, 5,  N'Slide', N'Slide Bài 1: Nhập môn ngôn ngữ Python', N'/materials/python/slide_py_b1.pdf', 1, 1)
) AS source (MaterialId, LessonId, MaterialType, Title, FileUrl, IsDownloadable, SortOrder)
ON target.MaterialId = source.MaterialId
WHEN MATCHED THEN
    UPDATE SET target.Title = source.Title, target.FileUrl = source.FileUrl
WHEN NOT MATCHED THEN
    INSERT (MaterialId, LessonId, MaterialType, Title, FileUrl, IsDownloadable, SortOrder)
    VALUES (source.MaterialId, source.LessonId, source.MaterialType, source.Title, source.FileUrl, source.IsDownloadable, source.SortOrder);
SET IDENTITY_INSERT LessonMaterials OFF;

/* 6. LỚP HỌC & LỊCH HỌC (Classes & Sessions) */
SET IDENTITY_INSERT Classes ON;
MERGE INTO Classes AS target
USING (VALUES
    (1, N'TEKY-SCR-2026-01', 1, 3, N'Lớp Scratch Khám Phá K01 (Sáng Thứ 7)', '2026-10-01', '2026-12-20', 16, N'Open'),
    (2, N'TEKY-PYT-2026-01', 2, 5, N'Lớp Python AI Thiếu Nhi K02 (Chiều Chủ Nhật)', '2026-10-05', '2026-12-25', 14, N'Open'),
    (3, N'TEKY-ROB-2026-01', 3, 3, N'Lớp Robotics & IoT Thông Minh K03 (Chiều Thứ 7)', '2026-10-01', '2026-12-20', 12, N'Open')
) AS source (ClassId, ClassCode, CourseId, TeacherId, Name, StartDate, EndDate, MaxStudents, Status)
ON target.ClassId = source.ClassId
WHEN MATCHED THEN
    UPDATE SET target.ClassCode = source.ClassCode, target.Name = source.Name, target.Status = source.Status
WHEN NOT MATCHED THEN
    INSERT (ClassId, ClassCode, CourseId, TeacherId, Name, StartDate, EndDate, MaxStudents, Status)
    VALUES (source.ClassId, source.ClassCode, source.CourseId, source.TeacherId, source.Name, source.StartDate, source.EndDate, source.MaxStudents, source.Status);
SET IDENTITY_INSERT Classes OFF;

SET IDENTITY_INSERT ClassSessions ON;
MERGE INTO ClassSessions AS target
USING (VALUES
    -- Class 1 (Scratch - Sáng T7: 08:30 - 10:30)
    (1, 1, 1, 1, '2026-10-10', '08:30:00', '10:30:00', N'Done'),
    (2, 1, 2, 1, '2026-10-17', '08:30:00', '10:30:00', N'Done'),
    (3, 1, 3, 1, '2026-10-24', '08:30:00', '10:30:00', N'Done'),
    (4, 1, 4, 1, '2026-11-14', '08:30:00', '10:30:00', N'Scheduled'),

    -- Class 2 (Python - Chiều CN: 14:00 - 16:00)
    (5, 2, 5, 3, '2026-10-11', '14:00:00', '16:00:00', N'Done'),
    (6, 2, 6, 3, '2026-10-18', '14:00:00', '16:00:00', N'Done'),
    (7, 2, 7, 3, '2026-11-15', '14:00:00', '16:00:00', N'Scheduled'),

    -- Class 3 (Robo - Chiều T7: 14:00 - 16:30)
    (8,  3, 9,  2, '2026-10-10', '14:00:00', '16:30:00', N'Done'),
    (9,  3, 10, 2, '2026-10-17', '14:00:00', '16:30:00', N'Done'),
    (10, 3, 11, 2, '2026-10-24', '14:00:00', '16:30:00', N'Done'),
    (11, 3, 12, 2, '2026-11-14', '14:00:00', '16:30:00', N'Scheduled')
) AS source (SessionId, ClassId, LessonId, RoomId, SessionDate, StartTime, EndTime, Status)
ON target.SessionId = source.SessionId
WHEN MATCHED THEN
    UPDATE SET target.SessionDate = source.SessionDate, target.Status = source.Status
WHEN NOT MATCHED THEN
    INSERT (SessionId, ClassId, LessonId, RoomId, SessionDate, StartTime, EndTime, Status)
    VALUES (source.SessionId, source.ClassId, source.LessonId, source.RoomId, source.SessionDate, source.StartTime, source.EndTime, source.Status);
SET IDENTITY_INSERT ClassSessions OFF;

/* 7. GHI DANH & ĐIỂM DANH (Enrollments & Attendance) */
SET IDENTITY_INSERT Enrollments ON;
MERGE INTO Enrollments AS target
USING (VALUES
    -- Class 1: Scratch
    (1, 1, 6,  N'Active', 75.00), -- Minh Quân
    (2, 1, 8,  N'Active', 75.00), -- Mai Chi
    (3, 1, 10, N'Active', 50.00), -- Bảo An

    -- Class 2: Python
    (4, 2, 7,  N'Active', 60.00), -- Đức Hà
    (5, 2, 9,  N'Active', 60.00), -- Đăng Khôi

    -- Class 3: Robotics
    (6, 3, 6,  N'Active', 80.00), -- Minh Quân
    (7, 3, 9,  N'Active', 85.00)  -- Đăng Khôi
) AS source (EnrollmentId, ClassId, StudentId, Status, ProgressPercent)
ON target.EnrollmentId = source.EnrollmentId
WHEN MATCHED THEN
    UPDATE SET target.Status = source.Status, target.ProgressPercent = source.ProgressPercent
WHEN NOT MATCHED THEN
    INSERT (EnrollmentId, ClassId, StudentId, Status, ProgressPercent)
    VALUES (source.EnrollmentId, source.ClassId, source.StudentId, source.Status, source.ProgressPercent);
SET IDENTITY_INSERT Enrollments OFF;

SET IDENTITY_INSERT AttendanceRecords ON;
MERGE INTO AttendanceRecords AS target
USING (VALUES
    -- Session 1 (Class 1 Scratch)
    (1, 1, 6,  N'Present', NULL, 3),
    (2, 1, 8,  N'Present', NULL, 3),
    (3, 1, 10, N'Late', N'Đến muộn 10 phút do kẹt xe', 3),

    -- Session 8 (Class 3 Robo)
    (4, 8, 6, N'Present', NULL, 3),
    (5, 8, 9, N'Present', NULL, 3),

    -- Session 10 (Class 3 Robo - Ngày 24/10)
    (6, 10, 6, N'Present', NULL, 3),
    (7, 10, 9, N'Present', NULL, 3)
) AS source (AttendanceId, SessionId, StudentId, Status, AbsenceReason, MarkedBy)
ON target.AttendanceId = source.AttendanceId
WHEN MATCHED THEN
    UPDATE SET target.Status = source.Status, target.AbsenceReason = source.AbsenceReason
WHEN NOT MATCHED THEN
    INSERT (AttendanceId, SessionId, StudentId, Status, AbsenceReason, MarkedBy)
    VALUES (source.AttendanceId, source.SessionId, source.StudentId, source.Status, source.AbsenceReason, source.MarkedBy);
SET IDENTITY_INSERT AttendanceRecords OFF;

/* 8. BẢN ĐỒ THỬ THÁCH & BÀI TẬP (ChallengeMaps & Assignments) */
SET IDENTITY_INSERT ChallengeMaps ON;
MERGE INTO ChallengeMaps AS target
USING (VALUES
    (1, N'Đường đua Mê Cung Sao Hỏa', N'Space Mars', N'{"gridSize":16,"theme":"mars_base","obstacles":[{"x":2,"y":3},{"x":4,"y":5},{"x":7,"y":8}],"checkpoints":[{"id":1,"x":3,"y":2},{"id":2,"x":6,"y":4},{"id":3,"x":10,"y":8},{"id":4,"x":14,"y":12}]}', 0, 0, N'Active', 3),
    (2, N'Thành phố Thông minh Smart City', N'Cyberpunk City', N'{"gridSize":20,"theme":"smart_city","obstacles":[{"x":5,"y":5},{"x":8,"y":9}],"checkpoints":[{"id":1,"x":4,"y":4},{"id":2,"x":9,"y":8},{"id":3,"x":15,"y":14}]}', 0, 0, N'Active', 3)
) AS source (MapId, Name, Theme, LayoutJson, StartX, StartY, Status, CreatedBy)
ON target.MapId = source.MapId
WHEN MATCHED THEN
    UPDATE SET target.Name = source.Name, target.LayoutJson = source.LayoutJson
WHEN NOT MATCHED THEN
    INSERT (MapId, Name, Theme, LayoutJson, StartX, StartY, Status, CreatedBy)
    VALUES (source.MapId, source.Name, source.Theme, source.LayoutJson, source.StartX, source.StartY, source.Status, source.CreatedBy);
SET IDENTITY_INSERT ChallengeMaps OFF;

MERGE INTO MapCheckpoints AS target
USING (VALUES
    (1, 1, 3, 2, N'Vượt trạm kiểm soát Alpha', 0),
    (1, 2, 6, 4, N'Thu thập năng lượng Tinh thể Beta', 0),
    (1, 3, 10, 8, N'Kích hoạt ăng-ten truyền tín hiệu', 0),
    (1, 4, 14, 12, N'Về đích Trạm Không Gian Vĩnh Hằng!', 1),

    (2, 1, 4, 4, N'Bật đèn chiếu sáng thông minh phố 1', 0),
    (2, 2, 9, 8, N'Điều tiết giao thông ngã tư trung tâm', 0),
    (2, 3, 15, 14, N'Đến trung tâm điều hành Smart City', 1)
) AS source (MapId, SeqNo, X, Y, UnlockMessage, IsFinish)
ON target.MapId = source.MapId AND target.SeqNo = source.SeqNo
WHEN MATCHED THEN
    UPDATE SET target.UnlockMessage = source.UnlockMessage, target.IsFinish = source.IsFinish
WHEN NOT MATCHED THEN
    INSERT (MapId, SeqNo, X, Y, UnlockMessage, IsFinish)
    VALUES (source.MapId, source.SeqNo, source.X, source.Y, source.UnlockMessage, source.IsFinish);

SET IDENTITY_INSERT Assignments ON;
MERGE INTO Assignments AS target
USING (VALUES
    (1, 3, 11, 1, N'Lập trình Xe Tự Hành Vượt Mê Cung Sao Hỏa', N'Sử dụng cảm biến siêu âm kết hợp khối rẽ hướng để xe robot tự tìm đường và thu thập đủ 4 trạm năng lượng.', '2026-11-20 23:59:59', N'Published', NULL, NULL, N'{"type":"program","blocks":["start","loop_forever","sensor_read","if_obstacle_turn","forward"]}', 1, 70.00, 30.00, 10.00, 5, 12000, 25, 100, 3),
    (2, 1, 4,  2, N'Xây dựng Game Mê Cung Thu Thập Tinh Thể Scratch', N'Lập trình điều khiển nhân vật mèo Scratch vượt bẫy, ăn 3 viên ngọc và cán đích an toàn.', '2026-11-22 23:59:59', N'Published', NULL, NULL, N'{"type":"scratch","blocks":["when_flag_clicked","forever","key_pressed","touching_color"]}', 1, 80.00, 20.00, 10.00, 10, 15000, 30, 120, 3),
    (3, 2, 8,  NULL, N'Lập trình Trợ Lý Ảo Chatbot STEAM bằng Python', N'Ứng dụng thư viện Python nhận diện câu chào hỏi và trả lời thông tin học viện TEKY.', '2026-11-25 23:59:59', N'Published', NULL, NULL, NULL, 0, 100.00, 0.00, 10.00, 3, NULL, NULL, 150, 5)
) AS source (AssignmentId, ClassId, LessonId, MapId, Title, Instructions, DueAt, Status, ClosedAt, ClosedReason, MasterAstJson, MasterTested, AstWeight, HardwareWeight, MaxScore, MaxAttempts, ParTimeMs, ParBlockCount, MaxXp, CreatedBy)
ON target.AssignmentId = source.AssignmentId
WHEN MATCHED THEN
    UPDATE SET target.Title = source.Title, target.Instructions = source.Instructions, target.Status = source.Status
WHEN NOT MATCHED THEN
    INSERT (AssignmentId, ClassId, LessonId, MapId, Title, Instructions, DueAt, Status, ClosedAt, ClosedReason, MasterAstJson, MasterTested, AstWeight, HardwareWeight, MaxScore, MaxAttempts, ParTimeMs, ParBlockCount, MaxXp, CreatedBy)
    VALUES (source.AssignmentId, source.ClassId, source.LessonId, source.MapId, source.Title, source.Instructions, source.DueAt, source.Status, source.ClosedAt, source.ClosedReason, source.MasterAstJson, source.MasterTested, source.AstWeight, source.HardwareWeight, source.MaxScore, source.MaxAttempts, source.ParTimeMs, source.ParBlockCount, source.MaxXp, source.CreatedBy);
SET IDENTITY_INSERT Assignments OFF;

SET IDENTITY_INSERT HardwareRubricCriteria ON;
MERGE INTO HardwareRubricCriteria AS target
USING (VALUES
    (1, 1, N'Đấu nối cảm biến siêu âm đúng chân Trigger/Echo & nguồn 5V', 4.00, 1),
    (2, 1, N'Cơ cấu trục bánh xe cân bằng, động cơ không bị kẹt cơ học', 3.00, 2),
    (3, 1, N'Bố trí dây dẫn gọn gàng, cách điện an toàn và thẩm mỹ kết cấu', 3.00, 3)
) AS source (CriterionId, AssignmentId, Name, MaxPoints, SortOrder)
ON target.CriterionId = source.CriterionId
WHEN MATCHED THEN
    UPDATE SET target.Name = source.Name, target.MaxPoints = source.MaxPoints
WHEN NOT MATCHED THEN
    INSERT (CriterionId, AssignmentId, Name, MaxPoints, SortOrder)
    VALUES (source.CriterionId, source.AssignmentId, source.Name, source.MaxPoints, source.SortOrder);
SET IDENTITY_INSERT HardwareRubricCriteria OFF;

/* 9. BÀI NỘP, CHẤM AST & ĐIỂM SỐ (Submissions & Grades) */
SET IDENTITY_INSERT Submissions ON;
MERGE INTO Submissions AS target
USING (VALUES
    -- Minh Quân nộp bài Assignment 1 (Robotics)
    (1, 1, 6, 1, N'{"blocklyXml":"<xml><block type=\"robot_start\"></block></xml>"}', N'{"astRoot":{"type":"RobotProgram","commands":["MotorInit","UltrasonicLoop"]}}', N'Finalized', 1, '2026-10-25 15:40:00'),
    -- Đăng Khôi nộp bài Assignment 1 (Robotics)
    (2, 1, 9, 1, N'{"blocklyXml":"<xml><block type=\"robot_pro\"></block></xml>"}', N'{"astRoot":{"type":"RobotProgram","commands":["MotorInit","PIDControl","AvoidObstacle"]}}', N'Finalized', 1, '2026-10-25 16:10:00'),
    -- Mai Chi nộp bài Assignment 2 (Scratch)
    (3, 2, 8, 1, N'{"blocklyXml":"<xml><block type=\"scratch_maze\"></block></xml>"}', N'{"astRoot":{"type":"ScratchProject","sprites":["Cat","Crystal","Door"]}}', N'Finalized', 1, '2026-10-26 10:20:00')
) AS source (SubmissionId, AssignmentId, StudentId, AttemptNo, BlocklyJson, AstJson, Status, IsCurrent, SubmittedAt)
ON target.SubmissionId = source.SubmissionId
WHEN MATCHED THEN
    UPDATE SET target.Status = source.Status, target.IsCurrent = source.IsCurrent
WHEN NOT MATCHED THEN
    INSERT (SubmissionId, AssignmentId, StudentId, AttemptNo, BlocklyJson, AstJson, Status, IsCurrent, SubmittedAt)
    VALUES (source.SubmissionId, source.AssignmentId, source.StudentId, source.AttemptNo, source.BlocklyJson, source.AstJson, source.Status, source.IsCurrent, source.SubmittedAt);
SET IDENTITY_INSERT Submissions OFF;

SET IDENTITY_INSERT AstEvaluations ON;
MERGE INTO AstEvaluations AS target
USING (VALUES
    (1, 1, 6.80, 97.10, N'v2.4-teky'),
    (2, 2, 7.00, 100.00, N'v2.4-teky'),
    (3, 3, 7.50, 93.75, N'v2.4-teky')
) AS source (EvaluationId, SubmissionId, AutoAstScore, MatchPercent, EngineVersion)
ON target.EvaluationId = source.EvaluationId
WHEN MATCHED THEN
    UPDATE SET target.AutoAstScore = source.AutoAstScore, target.MatchPercent = source.MatchPercent
WHEN NOT MATCHED THEN
    INSERT (EvaluationId, SubmissionId, AutoAstScore, MatchPercent, EngineVersion)
    VALUES (source.EvaluationId, source.SubmissionId, source.AutoAstScore, source.MatchPercent, source.EngineVersion);
SET IDENTITY_INSERT AstEvaluations OFF;

SET IDENTITY_INSERT SimulationRuns ON;
MERGE INTO SimulationRuns AS target
USING (VALUES
    (1, 1, 6, 1, 1, 9250, 19, 4, 1, N'{"path":[[0,0],[3,2],[6,4],[10,8],[14,12]]}', '2026-10-25 15:35:00'),
    (2, 1, 9, 2, 1, 8100, 16, 4, 1, N'{"path":[[0,0],[3,2],[6,4],[10,8],[14,12]]}', '2026-10-25 16:05:00'),
    (3, 2, 8, 3, 2, 11400, 22, 3, 1, N'{"path":[[0,0],[4,4],[9,8],[15,14]]}', '2026-10-26 10:15:00')
) AS source (RunId, AssignmentId, StudentId, SubmissionId, MapId, ExecTimeMs, BlockCount, CheckpointsReached, ReachedFinish, TrajectoryJson, RunAt)
ON target.RunId = source.RunId
WHEN MATCHED THEN
    UPDATE SET target.ExecTimeMs = source.ExecTimeMs, target.ReachedFinish = source.ReachedFinish
WHEN NOT MATCHED THEN
    INSERT (RunId, AssignmentId, StudentId, SubmissionId, MapId, ExecTimeMs, BlockCount, CheckpointsReached, ReachedFinish, TrajectoryJson, RunAt)
    VALUES (source.RunId, source.AssignmentId, source.StudentId, source.SubmissionId, source.MapId, source.ExecTimeMs, source.BlockCount, source.CheckpointsReached, source.ReachedFinish, source.TrajectoryJson, source.RunAt);
SET IDENTITY_INSERT SimulationRuns OFF;

SET IDENTITY_INSERT Grades ON;
MERGE INTO Grades AS target
USING (VALUES
    (1, 1, 6.80, 2.80, 9.60, N'Xe robot lắp ráp chắc chắn, thuật toán né vật cản rất nhạy. Chúc mừng con đã hoàn thành xuất sắc!', N'Typed', 1, 3, '2026-10-26 09:00:00'),
    (2, 2, 7.00, 3.00, 10.00, N'Bài nộp đạt điểm tuyệt đối 10/10! Tối ưu số lượng khối lệnh tốt nhất lớp.', N'Typed', 1, 3, '2026-10-26 09:15:00'),
    (3, 3, 7.50, 1.80, 9.30, N'Dự án game Scratch có tạo hình sáng tạo, hiệu ứng âm thanh sống động.', N'Typed', 1, 3, '2026-10-26 11:30:00')
) AS source (GradeId, SubmissionId, AutoAstScore, HardwareScore, FinalScore, RemarkText, RemarkSource, IsFinalized, FinalizedBy, FinalizedAt)
ON target.GradeId = source.GradeId
WHEN MATCHED THEN
    UPDATE SET target.FinalScore = source.FinalScore, target.RemarkText = source.RemarkText, target.IsFinalized = source.IsFinalized
WHEN NOT MATCHED THEN
    INSERT (GradeId, SubmissionId, AutoAstScore, HardwareScore, FinalScore, RemarkText, RemarkSource, IsFinalized, FinalizedBy, FinalizedAt)
    VALUES (source.GradeId, source.SubmissionId, source.AutoAstScore, source.HardwareScore, source.FinalScore, source.RemarkText, source.RemarkSource, source.IsFinalized, source.FinalizedBy, source.FinalizedAt);
SET IDENTITY_INSERT Grades OFF;

MERGE INTO HardwareScores AS target
USING (VALUES
    (1, 1, 3.80, 3),
    (1, 2, 3.00, 3),
    (1, 3, 2.80, 3)
) AS source (GradeId, CriterionId, Points, ScoredBy)
ON target.GradeId = source.GradeId AND target.CriterionId = source.CriterionId
WHEN MATCHED THEN
    UPDATE SET target.Points = source.Points
WHEN NOT MATCHED THEN
    INSERT (GradeId, CriterionId, Points, ScoredBy) VALUES (source.GradeId, source.CriterionId, source.Points, source.ScoredBy);

/* 10. HUY HIỆU & GAMIFICATION (Badges & XP) */
SET IDENTITY_INSERT Badges ON;
MERGE INTO Badges AS target
USING (VALUES
    (1, N'PYTHON_MASTER', N'Bậc Thầy Lập Trình Python', N'Hoàn thành xuất sắc 10 thử thách thuật toán Python nâng cao.', N'/badges/python_master.svg'),
    (2, N'ROBO_INNOVATOR', N'Nhà Sáng Chế Robotics', N'Lập trình chế tạo xe tự hành đạt độ chính xác trên 95%.', N'/badges/robo_innovator.svg'),
    (3, N'STREAK_7', N'Chiến Binh Chăm Chỉ 7 Ngày', N'Tham gia học tập và nộp bài liên tục 7 ngày trong tuần.', N'/badges/streak_7.svg'),
    (4, N'SPEED_RACER', N'Tay Đua Siêu Tốc', N'Vượt đường đua mê cung mô phỏng với thời gian dưới 10 giây.', N'/badges/speed_racer.svg'),
    (5, N'CREATIVE_GENIUS', N'Ngôi Sao Sáng Tạo STEAM', N'Dự án game được đánh giá 5 sao từ giáo viên hướng dẫn.', N'/badges/creative_genius.svg')
) AS source (BadgeId, Code, Name, Description, IconUrl)
ON target.BadgeId = source.BadgeId
WHEN MATCHED THEN
    UPDATE SET target.Name = source.Name, target.Description = source.Description, target.IconUrl = source.IconUrl
WHEN NOT MATCHED THEN
    INSERT (BadgeId, Code, Name, Description, IconUrl) VALUES (source.BadgeId, source.Code, source.Name, source.Description, source.IconUrl);
SET IDENTITY_INSERT Badges OFF;

MERGE INTO StudentBadges AS target
USING (VALUES
    (6, 2, '2026-10-26 09:05:00'), -- Minh Quân: Robo Innovator
    (6, 4, '2026-10-25 15:36:00'), -- Minh Quân: Speed Racer
    (8, 5, '2026-10-26 11:35:00'), -- Mai Chi: Creative Genius
    (9, 2, '2026-10-26 09:20:00'), -- Đăng Khôi: Robo Innovator
    (9, 4, '2026-10-25 16:06:00')  -- Đăng Khôi: Speed Racer
) AS source (StudentId, BadgeId, AwardedAt)
ON target.StudentId = source.StudentId AND target.BadgeId = source.BadgeId
WHEN MATCHED THEN
    UPDATE SET target.AwardedAt = source.AwardedAt
WHEN NOT MATCHED THEN
    INSERT (StudentId, BadgeId, AwardedAt) VALUES (source.StudentId, source.BadgeId, source.AwardedAt);

SET IDENTITY_INSERT XpTransactions ON;
MERGE INTO XpTransactions AS target
USING (VALUES
    (1, 6, N'XP',   100, N'Assignment', 1, 1, N'Hoàn thành xuất sắc bài tập Xe Tự Hành Vượt Mê Cung'),
    (2, 6, N'STEM', 50,  N'Badge',      1, 1, N'Nhận huy hiệu Nhà Sáng Chế Robotics'),
    (3, 9, N'XP',   120, N'Assignment', 2, 2, N'Đạt điểm tuyệt đối bài tập Xe Tự Hành'),
    (4, 8, N'XP',   120, N'Assignment', 3, 3, N'Hoàn thành Game Mê Cung Scratch')
) AS source (XpId, StudentId, PointType, Points, Source, SubmissionId, RunId, Description)
ON target.XpId = source.XpId
WHEN MATCHED THEN
    UPDATE SET target.Points = source.Points, target.Description = source.Description
WHEN NOT MATCHED THEN
    INSERT (XpId, StudentId, PointType, Points, Source, SubmissionId, RunId, Description)
    VALUES (source.XpId, source.StudentId, source.PointType, source.Points, source.Source, source.SubmissionId, source.RunId, source.Description);
SET IDENTITY_INSERT XpTransactions OFF;

/* 11. HỒ SƠ SÁNG TẠO & CHỨNG NHẬN (Portfolio & Achievement Cards) */
SET IDENTITY_INSERT PortfolioItems ON;
MERGE INTO PortfolioItems AS target
USING (VALUES
    (1, 6, 1, N'Xe Robot Tự Hành Tránh Vật Cản Vượt Sa Mạc', N'Dự án robot thông minh sử dụng cảm biến siêu âm né chướng ngại vật kết hợp đèn LED báo hiệu.', N'/portfolio/robot_car_quan.png', 9.60),
    (2, 8, 3, N'Game Mê Cung Thu Thập Tinh Thể Năng Lượng 2D', N'Trò chơi tương tác đồ họa sinh động với 3 cấp độ chơi và bảng vàng thành tích.', N'/portfolio/scratch_game_chi.png', 9.30)
) AS source (ItemId, StudentId, SubmissionId, Title, Summary, ThumbnailUrl, FinalScore)
ON target.ItemId = source.ItemId
WHEN MATCHED THEN
    UPDATE SET target.Title = source.Title, target.FinalScore = source.FinalScore
WHEN NOT MATCHED THEN
    INSERT (ItemId, StudentId, SubmissionId, Title, Summary, ThumbnailUrl, FinalScore)
    VALUES (source.ItemId, source.StudentId, source.SubmissionId, source.Title, source.Summary, source.ThumbnailUrl, source.FinalScore);
SET IDENTITY_INSERT PortfolioItems OFF;

SET IDENTITY_INSERT AchievementCards ON;
MERGE INTO AchievementCards AS target
USING (VALUES
    (1, 6, 1, N'Chứng Nhận Nhà Sáng Chế Nhí Xuất Sắc', N'/cards/cert_quan_robo.png', '4B6E1F90-8C37-4D29-B58A-2A1C3F7E5001', 1, 3, 28),
    (2, 8, 2, N'Chứng Nhận Ngôi Sao Sáng Tạo Game Scratch', N'/cards/cert_chi_scratch.png', '9D2A3C4E-7F89-4B01-AC12-5E6F7A8B9002', 1, 3, 35)
) AS source (CardId, StudentId, ItemId, Title, CardImageUrl, QrToken, IsPublic, ExportedBy, ViewCount)
ON target.CardId = source.CardId
WHEN MATCHED THEN
    UPDATE SET target.Title = source.Title, target.ViewCount = source.ViewCount
WHEN NOT MATCHED THEN
    INSERT (CardId, StudentId, ItemId, Title, CardImageUrl, QrToken, IsPublic, ExportedBy, ViewCount)
    VALUES (source.CardId, source.StudentId, source.ItemId, source.Title, source.CardImageUrl, source.QrToken, source.IsPublic, source.ExportedBy, source.ViewCount);
SET IDENTITY_INSERT AchievementCards OFF;

/* 12. CỔ VŨ & TIN NHẮN TƯƠNG TÁC (Cheer Stickers & Messages) */
SET IDENTITY_INSERT CheerStickers ON;
MERGE INTO CheerStickers AS target
USING (VALUES
    (1, N'SUPER_STAR', N'Ngôi Sao Xuất Sắc', N'/stickers/super_star.png'),
    (2, N'HEART_PROUD', N'Mẹ Rất Tự Hào Về Con', N'/stickers/heart_proud.png'),
    (3, N'ROCKET_FLY', N'Tiến Lên Phía Trước', N'/stickers/rocket.png'),
    (4, N'GREAT_EFFORT', N'Cố Gắng Lên Nhé', N'/stickers/great_effort.png')
) AS source (StickerId, Code, Name, ImageUrl)
ON target.StickerId = source.StickerId
WHEN MATCHED THEN
    UPDATE SET target.Name = source.Name, target.ImageUrl = source.ImageUrl
WHEN NOT MATCHED THEN
    INSERT (StickerId, Code, Name, ImageUrl) VALUES (source.StickerId, source.Code, source.Name, source.ImageUrl);
SET IDENTITY_INSERT CheerStickers OFF;

SET IDENTITY_INSERT CheerMessages ON;
MERGE INTO CheerMessages AS target
USING (VALUES
    (1, 11, 6, 2, N'Mẹ xem camera lớp thấy robot của con chạy thông minh lắm, con trai cố lên nhé!', 10, '2026-10-24 15:15:00', '2026-10-24 15:20:00'),
    (2, 11, 8, 1, N'Bé Chi làm game hoạt hình đẹp quá, tối về khoe bố nhé con!', 3, '2026-10-24 09:30:00', '2026-10-24 09:45:00')
) AS source (CheerId, ParentId, StudentId, StickerId, Message, SessionId, SentAt, SeenAt)
ON target.CheerId = source.CheerId
WHEN MATCHED THEN
    UPDATE SET target.Message = source.Message
WHEN NOT MATCHED THEN
    INSERT (CheerId, ParentId, StudentId, StickerId, Message, SessionId, SentAt, SeenAt)
    VALUES (source.CheerId, source.ParentId, source.StudentId, source.StickerId, source.Message, source.SessionId, source.SentAt, source.SeenAt);
SET IDENTITY_INSERT CheerMessages OFF;

/* 13. THÔNG BÁO HỆ THỐNG (Notifications) */
SET IDENTITY_INSERT Notifications ON;
MERGE INTO Notifications AS target
USING (VALUES
    (1, 6,  N'Assignment', N'Bài tập mới đã được giao!', N'Thầy Nam đã giao bài tập: Lập trình Xe Tự Hành Vượt Mê Cung Sao Hỏa.', N'Assignment', 1, 1),
    (2, 11, N'Grade',      N'Đã có điểm số buổi học Robotics', N'Bé Nguyễn Minh Quân đạt điểm 9.6/10 với lời nhận xét xuất sắc từ Thầy Nam.', N'Grade', 1, 1),
    (3, 11, N'Schedule',   N'Nhắc lịch học sắp tới', N'Bé Minh Quân có lịch học Scratch vào Thứ 7 tuần này lúc 08:30 tại Lab STEAM 01.', N'Session', 4, 0),
    (4, 3,  N'Class',      N'Lớp học sắp bắt đầu', N'Lớp TEKY-SCR-2026-01 sẽ bắt đầu sau 15 phút tại Phòng Lab 01.', N'Session', 4, 0)
) AS source (NotificationId, RecipientId, Type, Title, Body, RefType, RefId, IsRead)
ON target.NotificationId = source.NotificationId
WHEN MATCHED THEN
    UPDATE SET target.Title = source.Title, target.Body = source.Body
WHEN NOT MATCHED THEN
    INSERT (NotificationId, RecipientId, Type, Title, Body, RefType, RefId, IsRead)
    VALUES (source.NotificationId, source.RecipientId, source.Type, source.Title, source.Body, source.RefType, source.RefId, source.IsRead);
SET IDENTITY_INSERT Notifications OFF;

PRINT N'>>> Đã khởi tạo hoàn tất toàn bộ dữ liệu mẫu (Seed Data) thành công!';
GO

