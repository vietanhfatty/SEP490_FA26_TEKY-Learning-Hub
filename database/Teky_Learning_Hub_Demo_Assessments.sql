-- Chạy sau migration Assessments và script Demo Dashboard trên SQL Server Development.
SET NOCOUNT ON;
SET XACT_ABORT ON;
IF DB_NAME() <> N'Teky_Learning_Hub' THROW 51000, 'Wrong demo database.', 1;
IF NOT EXISTS (SELECT 1 FROM dbo.Classes WHERE ClassCode='DEMO-DASH-1-01')
 OR NOT EXISTS (SELECT 1 FROM dbo.Classes WHERE ClassCode='DEMO-DASH-2-01')
 THROW 51000, 'Run Demo Dashboard data first.', 1;
BEGIN TRAN;
INSERT dbo.Assessments(ClassId,Code,Title,Instructions,IsPublished,AllowAnswerReview,QuestionsJson)
SELECT c.ClassId, seed.Code,seed.Title,N'Chọn một đáp án cho mỗi câu. Kiểm tra lại lựa chọn trước khi nộp.',1,seed.Review,seed.Questions
FROM (VALUES
    ('DEMO-DASH-1-01','DEMO-PYTHON',N'[Demo] Python: Biến và vòng lặp',1,N'[{"prompt": "Câu lệnh nào hiển thị chữ Xin chào?", "options": ["print(\"Xin chào\")", "input(\"Xin chào\")", "len(\"Xin chào\")"], "correct": 0, "explanation": "print hiển thị văn bản ra màn hình."}, {"prompt": "Điều kiện 5 > 3 có giá trị gì?", "options": ["False", "True", "None"], "correct": 1, "explanation": "5 lớn hơn 3 nên biểu thức trả về True."}, {"prompt": "range(3) tạo ra các số nào?", "options": ["1, 2, 3", "1, 2", "0, 1, 2"], "correct": 2, "explanation": "range bắt đầu từ 0 và không bao gồm giá trị dừng."}]'),
    ('DEMO-DASH-2-01','DEMO-3D',N'[Demo] Không gian và vật thể 3D',0,N'[{"prompt": "Công cụ nào dùng để thay đổi kích thước vật thể?", "options": ["Move", "Scale", "Rotate"], "correct": 1, "explanation": "Scale thay đổi kích thước vật thể."}, {"prompt": "Em dùng công cụ nào để xoay vật thể?", "options": ["Rotate", "Scale", "Move"], "correct": 0, "explanation": "Rotate xoay vật thể quanh trục được chọn."}]')
) seed(ClassCode,Code,Title,Review,Questions)
JOIN dbo.Classes c ON c.ClassCode=seed.ClassCode
WHERE NOT EXISTS (SELECT 1 FROM dbo.Assessments a WITH (UPDLOCK,HOLDLOCK)
    WHERE a.ClassId=c.ClassId AND a.Code=seed.Code);
COMMIT;
SELECT AssessmentId,Code,Title FROM dbo.Assessments WHERE Code IN ('DEMO-PYTHON','DEMO-3D');
