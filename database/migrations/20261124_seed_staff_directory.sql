--- Seed the department catalogue and the job titles (chức danh) approved by the academy.
--- Positions are scoped to one department so admin can group accounts by department.
SET XACT_ABORT ON;
GO
--- 1. Departments used by the staff organisation.
IF NOT EXISTS (SELECT 1 FROM dbo.Departments WHERE Code = 'ACADEMIC')
    INSERT dbo.Departments(Code, Name) VALUES ('ACADEMIC', N'Phòng chuyên môn');
IF NOT EXISTS (SELECT 1 FROM dbo.Departments WHERE Code = 'TEACHER')
    INSERT dbo.Departments(Code, Name) VALUES ('TEACHER', N'Phòng giáo viên');
IF NOT EXISTS (SELECT 1 FROM dbo.Departments WHERE Code = 'STEM_OPERATIONS')
    INSERT dbo.Departments(Code, Name) VALUES ('STEM_OPERATIONS', N'Phòng vận hành trường STEM');
GO
--- 2. Job titles for the teaching department.
DECLARE @teacher int = (SELECT MIN(DepartmentId) FROM dbo.Departments WHERE Code = 'TEACHER');
DECLARE @academic int = (SELECT MIN(DepartmentId) FROM dbo.Departments WHERE Code = 'ACADEMIC');
DECLARE @operations int = (SELECT MIN(DepartmentId) FROM dbo.Departments WHERE Code = 'STEM_OPERATIONS');

DECLARE @positions table (Code varchar(60), Name nvarchar(200), DepartmentId int);
INSERT @positions(Code, Name, DepartmentId) VALUES
    (N'TEACHER_FULL_TIME',   N'Giáo viên Fulltime',                          @teacher),
    (N'TEACHER_PART_TIME',   N'Giáo viên Part time',                          @teacher),
    (N'TEACHER_STEM_FREELANCE', N'Giáo viên Công tác STEM tại điểm Trường',   @teacher),
    (N'TEACHER_STEM_HANOI',  N'Giáo viên Công tác STEM tại điểm Trường Hà Nội', @teacher),
    (N'SUBJECT_TEACHER',     N'Cố vấn chuyên môn',                            @academic),
    (N'TEACHER_CENTRIC',     N'Teacher Centric - Quản lý Giáo viên',          @teacher),
    (N'TEACHER_LEADER',      N'Teacher Leader',                                @teacher),
    (N'ACADEMIC_SPECIALIST', N'Chuyên viên Giáo dục học thuật',                @academic),
    (N'TRAINING_QA',         N'Chuyên viên Đào tạo Giám Sát Chất lượng Giáo dục', @academic),
    (N'PD_ACADEMIC',         N'PD Chuyên môn',                                @academic),
    (N'STEM_ACADEMIC_SPECIALIST', N'Chuyên viên Giáo dục Học thuật STEM',      @academic),
    (N'STEM_SCHOOL_OPERATIONS', N'Chuyên viên Giáo dục Vận hành mảng Trường STEM', @operations),
    (N'EDTECH_CONTENT_DEVELOPER', N'Chuyên viên Phát triển Học liệu khởi Edtech', @academic),
    (N'SCHOOL_CONTENT_SPECIALIST', N'Chuyên viên học liệu vận hành mảng trường', @academic);

INSERT dbo.Positions(Code, Name, IsActive, DepartmentId)
SELECT p.Code, p.Name, 1, p.DepartmentId
FROM @positions p
WHERE NOT EXISTS (SELECT 1 FROM dbo.Positions existing
                  WHERE existing.Code = p.Code AND existing.DepartmentId = p.DepartmentId);
