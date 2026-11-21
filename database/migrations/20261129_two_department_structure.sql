--- Two business departments: Phòng Chuyên môn (ACADEMIC) and Phòng Quản lý đào tạo (TRAINING).
--- System administration ("Tổ chức") stays the global SystemAdmin account role and is not a department.
--- The former TEACHER and STEM_OPERATIONS departments are merged into ACADEMIC. Appointments, grants and
--- their sources move with their job titles, so nobody gains or loses a permission in this script except
--- that department-scoped grants now cover the ACADEMIC department where the courses live.
--- Every step is guarded so the script is safe on a fresh database and on an already migrated one.
SET XACT_ABORT ON;
GO
--- 1. Each department declares its business function. It selects the permission templates offered for its job titles.
IF COL_LENGTH('dbo.Departments', 'FunctionCode') IS NULL
    EXEC(N'ALTER TABLE dbo.Departments ADD FunctionCode varchar(20) NOT NULL
        CONSTRAINT DF_Departments_FunctionCode DEFAULT ''ACADEMIC''
        CONSTRAINT CK_Departments_FunctionCode CHECK (FunctionCode IN (''ACADEMIC'',''TRAINING''));');
GO
--- 2. Permissions used by the training management department.
DECLARE @permissions table (Code varchar(80), Description nvarchar(250));
INSERT @permissions(Code, Description) VALUES
    ('class.manage',      N'Mở và quản lý lớp học'),
    ('enrollment.manage', N'Ghi danh học viên vào lớp'),
    ('schedule.manage',   N'Xếp lịch học và xử lý trùng lịch'),
    ('teacher.assign',    N'Phân công giáo viên và duyệt dạy thay'),
    ('attendance.view',   N'Theo dõi điểm danh'),
    ('report.view',       N'Xem báo cáo đào tạo');
INSERT dbo.Permissions(Code, Description)
SELECT p.Code, p.Description FROM @permissions p
WHERE NOT EXISTS (SELECT 1 FROM dbo.Permissions existing WHERE existing.Code = p.Code);
GO
--- 3. The two business departments.
IF NOT EXISTS (SELECT 1 FROM dbo.Departments WHERE Code = 'ACADEMIC')
    INSERT dbo.Departments(Code, Name, FunctionCode) VALUES ('ACADEMIC', N'Phòng Chuyên môn', 'ACADEMIC');
IF NOT EXISTS (SELECT 1 FROM dbo.Departments WHERE Code = 'TRAINING')
    INSERT dbo.Departments(Code, Name, FunctionCode) VALUES ('TRAINING', N'Phòng Quản lý đào tạo', 'TRAINING');
UPDATE dbo.Departments SET FunctionCode = 'TRAINING' WHERE Code = 'TRAINING';
UPDATE dbo.Departments SET Name = N'Phòng Chuyên môn' WHERE Code = 'ACADEMIC' AND Name = N'Phòng chuyên môn';
GO
--- 4. Merge TEACHER and STEM_OPERATIONS into ACADEMIC.
DECLARE @academic int = (SELECT MIN(DepartmentId) FROM dbo.Departments WHERE Code = 'ACADEMIC');
DECLARE @now datetime2 = SYSUTCDATETIME();
DECLARE @old table (DepartmentId int PRIMARY KEY, Code varchar(40));
INSERT @old(DepartmentId, Code)
SELECT DepartmentId, Code FROM dbo.Departments WHERE Code IN ('TEACHER', 'STEM_OPERATIONS') AND DepartmentId <> @academic AND IsActive = 1;

IF EXISTS (SELECT 1 FROM @old)
BEGIN
    --- 4a. The first governance script seeded older duplicates of these titles in ACADEMIC. Remove the unused
    ---     ones; keep used ones as inactive history under a freed code.
    DECLARE @legacy table (PositionId int PRIMARY KEY, Used bit);
    INSERT @legacy(PositionId, Used)
    SELECT p.PositionId,
        CASE WHEN EXISTS (SELECT 1 FROM dbo.StaffAppointments a WHERE a.PositionId = p.PositionId)
               OR EXISTS (SELECT 1 FROM dbo.UserRoleGrantSources s JOIN dbo.PositionAccessPolicies pp ON pp.PolicyId = s.PolicyId
                          WHERE pp.PositionId = p.PositionId) THEN 1 ELSE 0 END
    FROM dbo.Positions p
    WHERE p.DepartmentId = @academic
      AND p.Code IN ('TEACHER', 'ACADEMIC_ADVISOR', 'TEACHER_MANAGER', 'TEACHER_LEADER', 'STEM_SCHOOL_OPERATIONS');

    DELETE ppp FROM dbo.PositionPolicyPermissions ppp
        JOIN dbo.PositionAccessPolicies pp ON pp.PolicyId = ppp.PolicyId
        JOIN @legacy l ON l.PositionId = pp.PositionId WHERE l.Used = 0;
    DELETE ppr FROM dbo.PositionPolicyRoles ppr
        JOIN dbo.PositionAccessPolicies pp ON pp.PolicyId = ppr.PolicyId
        JOIN @legacy l ON l.PositionId = pp.PositionId WHERE l.Used = 0;
    DELETE pp FROM dbo.PositionAccessPolicies pp JOIN @legacy l ON l.PositionId = pp.PositionId WHERE l.Used = 0;
    DELETE p FROM dbo.Positions p JOIN @legacy l ON l.PositionId = p.PositionId WHERE l.Used = 0;
    UPDATE p SET Code = LEFT(p.Code, 52) + '_LEGACY', IsActive = 0, Name = LEFT(p.Name + N' (cũ)', 200)
    FROM dbo.Positions p JOIN @legacy l ON l.PositionId = p.PositionId WHERE l.Used = 1;

    --- 4b. Move the job titles one source department at a time. A code that already exists in ACADEMIC
    ---     receives the source department as a suffix so the per-department unique index holds.
    DECLARE @source int = (SELECT MIN(DepartmentId) FROM @old);
    WHILE @source IS NOT NULL
    BEGIN
        UPDATE p SET Code = LEFT(p.Code + '_' + o.Code, 60)
        FROM dbo.Positions p JOIN @old o ON o.DepartmentId = p.DepartmentId
        WHERE p.DepartmentId = @source
          AND EXISTS (SELECT 1 FROM dbo.Positions existing WHERE existing.DepartmentId = @academic AND existing.Code = p.Code);
        UPDATE dbo.Positions SET DepartmentId = @academic WHERE DepartmentId = @source;
        SET @source = (SELECT MIN(DepartmentId) FROM @old WHERE DepartmentId > @source);
    END;

    --- 4c. Appointments, current and historical, follow their job title.
    DECLARE @affected table (UserId int PRIMARY KEY);
    INSERT @affected(UserId)
    SELECT DISTINCT UserId FROM dbo.StaffAppointments WHERE DepartmentId IN (SELECT DepartmentId FROM @old)
    UNION SELECT DISTINCT UserId FROM dbo.UserRoles WHERE RevokedAt IS NULL AND DepartmentId IN (SELECT DepartmentId FROM @old);
    UPDATE dbo.StaffAppointments SET DepartmentId = @academic WHERE DepartmentId IN (SELECT DepartmentId FROM @old);

    --- 4d. Live grants move to ACADEMIC. When the user already holds the same role there, its sources are
    ---     attached to that grant and the old grant is closed, so each role keeps one live grant per department.
    DECLARE @merge table (OldId bigint PRIMARY KEY, NewId bigint NOT NULL);
    INSERT @merge(OldId, NewId)
    SELECT g.UserRoleId, target.UserRoleId
    FROM dbo.UserRoles g
    JOIN dbo.UserRoles target ON target.UserId = g.UserId AND target.RoleId = g.RoleId
        AND target.DepartmentId = @academic AND target.RevokedAt IS NULL
    WHERE g.RevokedAt IS NULL AND g.DepartmentId IN (SELECT DepartmentId FROM @old);
    UPDATE s SET UserRoleId = m.NewId FROM dbo.UserRoleGrantSources s JOIN @merge m ON m.OldId = s.UserRoleId;
    UPDATE g SET RevokedAt = CASE WHEN @now > g.AssignedAt THEN @now ELSE g.AssignedAt END
    FROM dbo.UserRoles g JOIN @merge m ON m.OldId = g.UserRoleId;
    UPDATE dbo.UserRoles SET DepartmentId = @academic
    WHERE RevokedAt IS NULL AND DepartmentId IN (SELECT DepartmentId FROM @old);

    --- 4e. Courses owned by the merged departments are now owned by ACADEMIC. Contents keep their owner
    ---     because content ownership is immutable by design (trg_Contents_PublicationPointer).
    IF COL_LENGTH('dbo.Courses', 'DepartmentId') IS NOT NULL
        EXEC sp_executesql N'UPDATE dbo.Courses SET DepartmentId = @academic WHERE DepartmentId IN (SELECT DepartmentId FROM dbo.Departments WHERE Code IN (''TEACHER'',''STEM_OPERATIONS''))',
            N'@academic int', @academic = @academic;

    --- 4f. Sign affected staff out so their next token carries the new department scope.
    UPDATE u SET SecurityVersion = SecurityVersion + 1 FROM dbo.Users u JOIN @affected a ON a.UserId = u.UserId;

    --- 4g. The merged departments stay as inactive history until nothing references them.
    UPDATE dbo.Departments SET IsActive = 0 WHERE DepartmentId IN (SELECT DepartmentId FROM @old);
END;
GO
--- 5. Training department job titles.
DECLARE @training int = (SELECT MIN(DepartmentId) FROM dbo.Departments WHERE Code = 'TRAINING');
DECLARE @titles table (Code varchar(60), Name nvarchar(200));
INSERT @titles(Code, Name) VALUES
    ('TRAINING_HEAD',      N'Trưởng phòng Quản lý đào tạo'),
    ('TRAINING_OFFICER',   N'Chuyên viên Quản lý đào tạo (giáo vụ)'),
    ('TRAINING_SCHEDULER', N'Chuyên viên Xếp lịch & Điều phối giáo viên');
INSERT dbo.Positions(Code, Name, IsActive, DepartmentId)
SELECT t.Code, t.Name, 1, @training FROM @titles t
WHERE NOT EXISTS (SELECT 1 FROM dbo.Positions p WHERE p.DepartmentId = @training AND p.Code = t.Code);
GO
--- 6. Publish a template policy for every seeded job title that has none yet. Titles that already have a
---    published policy are left untouched, so no existing appointment changes its permissions here.
DECLARE @plan table (DepartmentCode varchar(40), Code varchar(60), EmploymentTypes varchar(80));
INSERT @plan(DepartmentCode, Code, EmploymentTypes) VALUES
    ('ACADEMIC', 'PD_ACADEMIC',               'FULL_TIME,PART_TIME,CONTRACTOR'),
    ('ACADEMIC', 'TEACHER_CENTRIC',           'FULL_TIME,PART_TIME,CONTRACTOR'),
    ('ACADEMIC', 'TEACHER_LEADER',            'FULL_TIME,PART_TIME,CONTRACTOR'),
    ('ACADEMIC', 'SUBJECT_TEACHER',           'FULL_TIME,PART_TIME,CONTRACTOR'),
    ('ACADEMIC', 'ACADEMIC_SPECIALIST',       'FULL_TIME,PART_TIME,CONTRACTOR'),
    ('ACADEMIC', 'STEM_ACADEMIC_SPECIALIST',  'FULL_TIME,PART_TIME,CONTRACTOR'),
    ('ACADEMIC', 'STEM_SCHOOL_OPERATIONS',    'FULL_TIME,PART_TIME,CONTRACTOR'),
    ('ACADEMIC', 'EDTECH_CONTENT_DEVELOPER',  'FULL_TIME,PART_TIME,CONTRACTOR'),
    ('ACADEMIC', 'SCHOOL_CONTENT_SPECIALIST', 'FULL_TIME,PART_TIME,CONTRACTOR'),
    ('ACADEMIC', 'TRAINING_QA',               'FULL_TIME,PART_TIME,CONTRACTOR'),
    ('TRAINING', 'TRAINING_HEAD',             'FULL_TIME,PART_TIME,CONTRACTOR'),
    ('TRAINING', 'TRAINING_OFFICER',          'FULL_TIME,PART_TIME,CONTRACTOR'),
    ('TRAINING', 'TRAINING_SCHEDULER',        'FULL_TIME,PART_TIME,CONTRACTOR');
DECLARE @planRoles table (Code varchar(60), RoleId tinyint);
INSERT @planRoles(Code, RoleId) VALUES
    ('PD_ACADEMIC', 6),
    ('TEACHER_CENTRIC', 2), ('TEACHER_CENTRIC', 5),
    ('TEACHER_LEADER', 2), ('TEACHER_LEADER', 5),
    ('SUBJECT_TEACHER', 2), ('SUBJECT_TEACHER', 5),
    ('ACADEMIC_SPECIALIST', 5), ('STEM_ACADEMIC_SPECIALIST', 5), ('STEM_SCHOOL_OPERATIONS', 5),
    ('EDTECH_CONTENT_DEVELOPER', 5), ('SCHOOL_CONTENT_SPECIALIST', 5), ('TRAINING_QA', 5),
    ('TRAINING_HEAD', 6), ('TRAINING_OFFICER', 5), ('TRAINING_SCHEDULER', 5);
DECLARE @planPermissions table (Code varchar(60), Permission varchar(80));
INSERT @planPermissions(Code, Permission)
SELECT c.Code, p.Permission FROM (VALUES ('PD_ACADEMIC')) c(Code)
CROSS JOIN (VALUES ('content.read'),('content.edit'),('content.comment'),('content.assign'),('review.open'),('review.respond'),('content.publish'),('course.manage')) p(Permission)
UNION ALL
SELECT c.Code, p.Permission FROM (VALUES ('TEACHER_CENTRIC'),('TEACHER_LEADER'),('SUBJECT_TEACHER'),('ACADEMIC_SPECIALIST'),('STEM_ACADEMIC_SPECIALIST'),
    ('STEM_SCHOOL_OPERATIONS'),('EDTECH_CONTENT_DEVELOPER'),('SCHOOL_CONTENT_SPECIALIST'),('TRAINING_QA')) c(Code)
CROSS JOIN (VALUES ('content.read'),('content.edit'),('content.comment'),('review.respond')) p(Permission)
UNION ALL SELECT 'TRAINING_QA', 'review.open'
UNION ALL
SELECT 'TRAINING_HEAD', p.Permission FROM (VALUES ('class.manage'),('enrollment.manage'),('schedule.manage'),('teacher.assign'),('attendance.view'),('report.view')) p(Permission)
UNION ALL
SELECT 'TRAINING_OFFICER', p.Permission FROM (VALUES ('enrollment.manage'),('schedule.manage'),('attendance.view')) p(Permission)
UNION ALL
SELECT 'TRAINING_SCHEDULER', p.Permission FROM (VALUES ('schedule.manage'),('teacher.assign'),('attendance.view')) p(Permission);

DECLARE @targets table (PositionId int PRIMARY KEY, Code varchar(60), Version int, EmploymentTypes varchar(80));
INSERT @targets(PositionId, Code, Version, EmploymentTypes)
SELECT p.PositionId, pl.Code,
    ISNULL((SELECT MAX(pp.Version) FROM dbo.PositionAccessPolicies pp WHERE pp.PositionId = p.PositionId), 0) + 1,
    pl.EmploymentTypes
FROM @plan pl
JOIN dbo.Departments d ON d.Code = pl.DepartmentCode
JOIN dbo.Positions p ON p.DepartmentId = d.DepartmentId AND p.Code = pl.Code
WHERE NOT EXISTS (SELECT 1 FROM dbo.PositionAccessPolicies pp WHERE pp.PositionId = p.PositionId AND pp.IsPublished = 1);

INSERT dbo.PositionAccessPolicies(PositionId, Version, IsPublished, EmploymentTypes, CreatedBy)
SELECT PositionId, Version, 1, EmploymentTypes, 0 FROM @targets;
INSERT dbo.PositionPolicyRoles(PolicyId, RoleId)
SELECT pp.PolicyId, r.RoleId FROM @targets t
JOIN dbo.PositionAccessPolicies pp ON pp.PositionId = t.PositionId AND pp.Version = t.Version
JOIN @planRoles r ON r.Code = t.Code;
INSERT dbo.PositionPolicyPermissions(PolicyId, PermissionId)
SELECT DISTINCT pp.PolicyId, permission.PermissionId FROM @targets t
JOIN dbo.PositionAccessPolicies pp ON pp.PositionId = t.PositionId AND pp.Version = t.Version
JOIN @planPermissions pl ON pl.Code = t.Code
JOIN dbo.Permissions permission ON permission.Code = pl.Permission;
GO
