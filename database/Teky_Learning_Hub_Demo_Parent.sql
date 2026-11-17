-- Dữ liệu minh họa cổng Parent. Chạy sau migration và script Demo Dashboard.
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;
SET NOCOUNT ON;
IF DB_NAME() <> N'Teky_Learning_Hub' THROW 51000, 'Wrong demo database.', 1;
DECLARE @parent int=(SELECT UserId FROM dbo.Users WHERE Email=N'parent@teky.edu.vn'),
        @student int=(SELECT UserId FROM dbo.Users WHERE Email=N'student@teky.edu.vn'),
        @course int=(SELECT CourseId FROM dbo.Courses WHERE CourseCode=N'DEMO-DASH-1'),
        @course3d int=(SELECT CourseId FROM dbo.Courses WHERE CourseCode=N'DEMO-DASH-2'),
        @teacher int=(SELECT TeacherId FROM dbo.Classes WHERE ClassCode=N'DEMO-DASH-1-01');
IF @parent IS NULL OR @student IS NULL OR @course IS NULL OR @course3d IS NULL OR @teacher IS NULL
    THROW 51000, 'Run the development accounts and Dashboard demo first.', 1;
IF NOT EXISTS (SELECT 1 FROM dbo.ParentStudentLinks WHERE ParentId=@parent AND StudentId=@student AND Status=N'Active')
    THROW 51000, 'The demo parent and student need an active link.', 1;

BEGIN TRAN;
UPDATE dbo.Courses SET
    LearningObjectives=COALESCE(LearningObjectives,N'Viết chương trình Python có biến, điều kiện và vòng lặp. Hoàn thiện trò chơi đoán số.'),
    TuitionVnd=COALESCE(TuitionVnd,2400000),
    Status=CASE WHEN Status=N'Draft' THEN N'Published' ELSE Status END
WHERE CourseId=@course;
UPDATE dbo.Courses SET
    LearningObjectives=COALESCE(LearningObjectives,N'Dựng bối cảnh 3D, bố trí vật thể và điều chỉnh ánh sáng để kể một câu chuyện.'),
    TuitionVnd=COALESCE(TuitionVnd,2800000),
    Status=CASE WHEN Status=N'Draft' THEN N'Published' ELSE Status END
WHERE CourseId=@course3d;

DECLARE @today date=CONVERT(date,DATEADD(hour,7,SYSUTCDATETIME()));
IF NOT EXISTS (SELECT 1 FROM dbo.Classes WITH (UPDLOCK,HOLDLOCK) WHERE ClassCode=N'DEMO-PARENT-01')
BEGIN
    INSERT dbo.Classes(ClassCode, CourseId, TeacherId, Name, Status, StartDate, EndDate)
    VALUES(N'DEMO-PARENT-01',@course,@teacher,N'[Demo] Python sáng tạo · lớp kế tiếp',N'Open',DATEADD(day,7,@today),DATEADD(day,35,@today));
    INSERT dbo.ClassSessions(ClassId,LessonId,SessionDate,StartTime,EndTime)
    SELECT SCOPE_IDENTITY(),LessonId,DATEADD(day,7,@today),'09:00','10:30'
    FROM dbo.Lessons WHERE CourseId=@course AND OrderNo=1 AND IsDeleted=0;
END;
IF NOT EXISTS (SELECT 1 FROM dbo.ParentPayments WITH (UPDLOCK,HOLDLOCK) WHERE Reference=N'DEMO-PARENT-PY-01')
    INSERT dbo.ParentPayments(ParentId,StudentId,CourseId,Reference,InvoiceNumber,AmountVnd,Status,PaidAt)
    VALUES(@parent,@student,@course,N'DEMO-PARENT-PY-01',N'DEMO-INV-001',2400000,N'Paid',SYSUTCDATETIME());
IF NOT EXISTS (SELECT 1 FROM dbo.ParentPayments WITH (UPDLOCK,HOLDLOCK) WHERE Reference=N'DEMO-PARENT-3D-01')
    INSERT dbo.ParentPayments(ParentId,StudentId,CourseId,Reference,AmountVnd,Status)
    VALUES(@parent,@student,@course3d,N'DEMO-PARENT-3D-01',2800000,N'Pending');
IF NOT EXISTS (SELECT 1 FROM dbo.ParentTeacherMessages WITH (UPDLOCK,HOLDLOCK)
               WHERE ClientId='973baec4-bac0-4f10-9fa3-60350f29e2c0')
    INSERT dbo.ParentTeacherMessages(ClientId,ParentId,StudentId,TeacherId,SenderId,Body)
    VALUES('973baec4-bac0-4f10-9fa3-60350f29e2c0',@parent,@student,@teacher,@teacher,
           N'[Demo] Minh Quân đã ôn phần biến. Buổi tới lớp sẽ thực hành vòng lặp trong trò chơi.');
COMMIT;
