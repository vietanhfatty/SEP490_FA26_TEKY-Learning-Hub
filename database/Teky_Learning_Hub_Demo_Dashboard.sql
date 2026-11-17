-- Run in local Development Teky_Learning_Hub after migrations.
-- Re-running refreshes only dates of DEMO-DASH-* records; existing submissions are preserved.
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;
IF DB_NAME() <> N'Teky_Learning_Hub' THROW 51000,'Wrong demo database.',1;
DECLARE @student int=(SELECT UserId FROM dbo.Users WHERE Email=N'student@teky.edu.vn'),
 @teacher int=(SELECT UserId FROM dbo.Users WHERE Email=N'teacher@teky.edu.vn'),
 @today date=CONVERT(date,DATEADD(hour,7,SYSUTCDATETIME())), @lock int;
IF NOT EXISTS(SELECT 1 FROM dbo.StudentProfiles WHERE UserId=@student) OR NOT EXISTS(SELECT 1 FROM dbo.TeacherProfiles WHERE UserId=@teacher)
 THROW 51000,'Seed demo student/teacher profiles first.',1;
IF COL_LENGTH('dbo.StudentProjectSubmissions','ReviewStatus') IS NULL THROW 51000,'Run Development migrations first.',1;
BEGIN TRAN;
EXEC @lock=sys.sp_getapplock @Resource='Teky.Demo.Dashboard',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
IF @lock<0 THROW 51000,'Demo seed is already running.',1;
DECLARE @n int=1,@course int,@class int,@lesson int,@assignment int,@i int,@code nvarchar(20),@title nvarchar(200);
WHILE @n<=2
BEGIN
 SET @code=CONCAT('DEMO-DASH-',@n);
 SET @course=NULL;SET @class=NULL;
 SELECT @course=CourseId FROM dbo.Courses WHERE CourseCode=@code;
 IF @course IS NULL BEGIN
  INSERT dbo.Courses(CourseCode,Name,Description,CreatedBy)
  VALUES(@code,CASE @n WHEN 1 THEN N'[Demo] Python khám phá' ELSE N'[Demo] Thiết kế thế giới 3D' END,
   N'Chương trình minh hoạ Dashboard: ôn tập, hạn nộp, lịch học và phản hồi giáo viên.',@teacher);
  SET @course=SCOPE_IDENTITY();
 END;
 SELECT @class=ClassId FROM dbo.Classes WHERE ClassCode=CONCAT(@code,'-01');
 IF @class IS NULL BEGIN
  INSERT dbo.Classes(ClassCode,CourseId,TeacherId,Name,StartDate,EndDate,Status)
  VALUES(CONCAT(@code,'-01'),@course,@teacher,CASE @n WHEN 1 THEN N'[Demo] Lớp Python sáng tạo' ELSE N'[Demo] Lớp thiết kế 3D' END,DATEADD(day,-14,@today),DATEADD(day,28,@today),'Open');
  SET @class=SCOPE_IDENTITY();
 END;
 UPDATE dbo.Classes SET StartDate=DATEADD(day,-14,@today),EndDate=DATEADD(day,28,@today) WHERE ClassId=@class;
 IF NOT EXISTS(SELECT 1 FROM dbo.Enrollments WHERE ClassId=@class AND StudentId=@student)
  INSERT dbo.Enrollments(ClassId,StudentId,ProgressPercent) VALUES(@class,@student,CASE @n WHEN 1 THEN 50 ELSE 25 END);
 SET @i=1;
 WHILE @i<=4
 BEGIN
  SET @lesson=NULL;SET @assignment=NULL;
  SET @title=CASE @n WHEN 1 THEN CASE @i WHEN 1 THEN N'Làm quen Python và biến' WHEN 2 THEN N'Điều kiện và lựa chọn' WHEN 3 THEN N'Vòng lặp trong trò chơi' ELSE N'Dự án trò chơi đoán số' END
   ELSE CASE @i WHEN 1 THEN N'Khám phá không gian 3D' WHEN 2 THEN N'Thiết kế địa hình' WHEN 3 THEN N'Ánh sáng và bầu trời' ELSE N'Sản phẩm thế giới của em' END END;
  SELECT @lesson=LessonId FROM dbo.Lessons WHERE CourseId=@course AND OrderNo=@i AND IsDeleted=0;
  IF @lesson IS NULL BEGIN
   INSERT dbo.Lessons(CourseId,Title,Content,OrderNo) VALUES(@course,@title,N'Mục tiêu: hiểu kiến thức, tạo một sản phẩm nhỏ và giải thích cách thực hiện. Đọc học liệu, thực hành, kiểm tra sản phẩm rồi nộp bài để nhận góp ý.',@i);
   SET @lesson=SCOPE_IDENTITY();
  END;
  IF NOT EXISTS(SELECT 1 FROM dbo.LessonMaterials WHERE LessonId=@lesson AND Title=N'[Demo] Tài liệu tham khảo')
   INSERT dbo.LessonMaterials(LessonId,Title,MaterialType,FileUrl)
   VALUES(@lesson,N'[Demo] Tài liệu tham khảo','Document',CASE @n WHEN 1 THEN 'https://docs.python.org/3/tutorial/' ELSE 'https://create.roblox.com/docs/studio' END);
  IF NOT EXISTS(SELECT 1 FROM dbo.ClassSessions WHERE ClassId=@class AND LessonId=@lesson)
   INSERT dbo.ClassSessions(ClassId,LessonId,SessionDate,StartTime,EndTime,Status)
   VALUES(@class,@lesson,@today,CASE @n WHEN 1 THEN '09:00' ELSE '14:00' END,CASE @n WHEN 1 THEN '10:30' ELSE '15:30' END,'Scheduled');
  UPDATE dbo.ClassSessions SET SessionDate=DATEADD(day,CASE @i WHEN 1 THEN -7 WHEN 2 THEN -1 WHEN 3 THEN @n ELSE @n+3 END,@today),
   Status=CASE WHEN @i<=2 THEN 'Done' ELSE 'Scheduled' END WHERE ClassId=@class AND LessonId=@lesson;
  IF @i<=CASE @n WHEN 1 THEN 2 ELSE 1 END AND NOT EXISTS(SELECT 1 FROM dbo.LessonProgress WHERE StudentId=@student AND LessonId=@lesson)
   INSERT dbo.LessonProgress(StudentId,LessonId,CompletedAt) VALUES(@student,@lesson,DATEADD(day,-1,SYSUTCDATETIME()));
  IF @i<=3
  BEGIN
   SELECT @assignment=AssignmentId FROM dbo.Assignments WHERE ClassId=@class AND LessonId=@lesson AND Title=CONCAT(N'[Demo] Thực hành: ',@title);
   IF @assignment IS NULL BEGIN
    INSERT dbo.Assignments(ClassId,LessonId,Title,Instructions,DueAt,Status,CreatedBy)
    VALUES(@class,@lesson,CONCAT(N'[Demo] Thực hành: ',@title),N'Tạo sản phẩm theo nội dung bài học. Nộp một tệp Python, Roblox Studio, ảnh hoặc ZIP. Kiểm tra sản phẩm và mô tả ý tưởng trước khi nộp.',SYSUTCDATETIME(),'Published',@teacher);
    SET @assignment=SCOPE_IDENTITY();
   END;
   UPDATE dbo.Assignments SET DueAt=DATEADD(hour,-7,DATEADD(hour,20,CONVERT(datetime2,DATEADD(day,@i,@today)))) WHERE AssignmentId=@assignment;
   -- 1 passed, 1 revision, 1 pending review; the other three are not submitted.
   IF (@n=1 AND @i IN (1,2)) OR (@n=2 AND @i=1)
   BEGIN
    IF NOT EXISTS(SELECT 1 FROM dbo.StudentProjectSubmissions WHERE AssignmentId=@assignment AND StudentId=@student)
     INSERT dbo.StudentProjectSubmissions(AssignmentId,StudentId,FileName,Content,SubmittedAt,ReviewStatus,Feedback,ReviewedBy,ReviewedAt)
     VALUES(@assignment,@student,'demo-product.py',CONVERT(varbinary(max),'# DEMO learning project'+CHAR(10)+'print("Hello TEKY")'),DATEADD(hour,-6,SYSUTCDATETIME()),
      CASE WHEN @n=2 THEN 'Pending' WHEN @i=1 THEN 'Passed' ELSE 'NeedsRevision' END,
      CASE WHEN @n=2 THEN NULL WHEN @i=1 THEN N'[Demo] Em đã thực hiện đúng yêu cầu và giải thích rõ ý tưởng.' ELSE N'[Demo] Em hãy ôn lại điều kiện, kiểm tra thêm trường hợp nhập sai rồi nộp lại sản phẩm.' END,
      CASE WHEN @n=2 THEN NULL ELSE @teacher END,CASE WHEN @n=2 THEN NULL ELSE DATEADD(hour,-2,SYSUTCDATETIME()) END);
   END;
  END;
  SET @i+=1;
 END;
 IF NOT EXISTS(SELECT 1 FROM dbo.Notifications WHERE RecipientId=@student AND RefType='Class' AND RefId=@class AND Title=N'[Demo] Chuẩn bị cho buổi học tiếp theo')
  INSERT dbo.Notifications(RecipientId,Type,Title,Body,RefType,RefId)
  VALUES(@student,'Class',N'[Demo] Chuẩn bị cho buổi học tiếp theo',N'Em hãy ôn học liệu, kiểm tra máy tính và hoàn thiện sản phẩm theo phản hồi trước buổi học tiếp theo.','Class',@class);
 SET @n+=1;
END;
COMMIT;
SELECT c.CourseCode,cl.ClassCode,cl.ClassId FROM dbo.Courses c JOIN dbo.Classes cl ON cl.CourseId=c.CourseId WHERE c.CourseCode IN ('DEMO-DASH-1','DEMO-DASH-2');
