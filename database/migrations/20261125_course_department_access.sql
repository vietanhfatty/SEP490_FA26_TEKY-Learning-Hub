-- Existing courses remain in the shared catalog; only a global course.manage grant can administer them.
IF COL_LENGTH('dbo.Courses', 'DepartmentId') IS NULL
BEGIN
    ALTER TABLE dbo.Courses ADD DepartmentId int NULL;
    ALTER TABLE dbo.Courses ADD CONSTRAINT FK_Courses_Departments
        FOREIGN KEY (DepartmentId) REFERENCES dbo.Departments(DepartmentId);
    CREATE INDEX IX_Courses_DepartmentId ON dbo.Courses(DepartmentId);
END;
