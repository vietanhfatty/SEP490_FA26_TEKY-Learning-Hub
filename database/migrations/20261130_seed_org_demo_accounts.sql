--- Development demo accounts for the two-department organisation (docs/org-structure-redesign.md).
--- One account per job title in Phòng Chuyên môn (ACADEMIC) and Phòng Quản lý đào tạo (TRAINING).
--- Each account is appointed to its title, so its roles and permissions come from the published title
--- policy exactly as an administrator appointment would grant them.
--- The procedure is only executed by the Development seeder (DbInitializer), which passes the hash of the
--- shared demo password. Nothing is inserted by this script itself. Existing accounts are never modified.
CREATE OR ALTER PROCEDURE dbo.SeedDemoOrgAccounts
    @PasswordHash nvarchar(255)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;

    DECLARE @lock int;
    EXEC @lock = sys.sp_getapplock @Resource=N'Teky.SeedDemoOrgAccounts',
        @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=15000;
    IF @lock < 0 THROW 51000, 'Could not acquire the demo organisation seed lock.', 1;

    DECLARE @accounts table (
        Seq int IDENTITY PRIMARY KEY, Email nvarchar(150), FullName nvarchar(120),
        DepartmentCode varchar(40), PositionCode varchar(60), EmploymentType varchar(20));
    INSERT @accounts(Email, FullName, DepartmentCode, PositionCode, EmploymentType) VALUES
        --- Phòng Chuyên môn: quản lý phòng
        (N'pd.chuyenmon@teky.edu.vn',      N'Phạm Quang Huy (PD Chuyên môn)',          'ACADEMIC', 'PD_ACADEMIC',               'FULL_TIME'),
        --- Phòng Chuyên môn: quản lý giáo viên (chuyên viên + giáo viên)
        (N'teacher.centric@teky.edu.vn',   N'Ngô Thanh Tùng (Teacher Centric)',         'ACADEMIC', 'TEACHER_CENTRIC',           'FULL_TIME'),
        (N'teacher.leader@teky.edu.vn',    N'Bùi Khánh Linh (Teacher Leader)',          'ACADEMIC', 'TEACHER_LEADER',            'FULL_TIME'),
        (N'covan.chuyenmon@teky.edu.vn',   N'Đặng Minh Tâm (Cố vấn chuyên môn)',        'ACADEMIC', 'SUBJECT_TEACHER',           'FULL_TIME'),
        --- Phòng Chuyên môn: chuyên viên
        (N'cv.hocthuat@teky.edu.vn',       N'Lý Thu Hà (CV GD học thuật)',              'ACADEMIC', 'ACADEMIC_SPECIALIST',       'FULL_TIME'),
        (N'cv.stem@teky.edu.vn',           N'Trịnh Gia Bảo (CV GD học thuật STEM)',     'ACADEMIC', 'STEM_ACADEMIC_SPECIALIST',  'FULL_TIME'),
        (N'cv.truongstem@teky.edu.vn',     N'Hồ Ngọc Ánh (CV vận hành Trường STEM)',    'ACADEMIC', 'STEM_SCHOOL_OPERATIONS',    'FULL_TIME'),
        (N'cv.edtech@teky.edu.vn',         N'Phan Đức Long (CV học liệu Edtech)',       'ACADEMIC', 'EDTECH_CONTENT_DEVELOPER',  'FULL_TIME'),
        (N'cv.hoclieu@teky.edu.vn',        N'Mai Phương Thảo (CV học liệu mảng trường)', 'ACADEMIC', 'SCHOOL_CONTENT_SPECIALIST', 'FULL_TIME'),
        (N'cv.giamsat@teky.edu.vn',        N'Võ Hải Yến (CV giám sát chất lượng GD)',   'ACADEMIC', 'TRAINING_QA',               'FULL_TIME'),
        --- Phòng Chuyên môn: giáo viên
        (N'gv.fulltime@teky.edu.vn',       N'Thầy Lương Văn Khải (GV Fulltime)',        'ACADEMIC', 'TEACHER_FULL_TIME',         'FULL_TIME'),
        (N'gv.parttime@teky.edu.vn',       N'Cô Đinh Thị Ngân (GV Part time)',          'ACADEMIC', 'TEACHER_PART_TIME',         'PART_TIME'),
        (N'gv.ctv.stem@teky.edu.vn',       N'Thầy Tạ Quốc Việt (CTV STEM VT/BD)',       'ACADEMIC', 'TEACHER_STEM_FREELANCE',    'CONTRACTOR'),
        (N'gv.ctv.hanoi@teky.edu.vn',      N'Cô Kiều Bích Ngọc (CTV STEM Hà Nội)',      'ACADEMIC', 'TEACHER_STEM_HANOI',        'CONTRACTOR'),
        --- Phòng Quản lý đào tạo
        (N'tp.daotao@teky.edu.vn',         N'Cao Văn Thịnh (Trưởng phòng QLĐT)',        'TRAINING', 'TRAINING_HEAD',             'FULL_TIME'),
        (N'cv.giaovu@teky.edu.vn',         N'Dương Thùy Dung (CV giáo vụ)',             'TRAINING', 'TRAINING_OFFICER',          'FULL_TIME'),
        (N'cv.xeplich@teky.edu.vn',        N'Lâm Tuấn Kiệt (CV xếp lịch & điều phối)',  'TRAINING', 'TRAINING_SCHEDULER',        'FULL_TIME');

    DECLARE @seq int = 1, @max int = (SELECT MAX(Seq) FROM @accounts);
    WHILE @seq <= @max
    BEGIN
        DECLARE @email nvarchar(150), @name nvarchar(120), @employment varchar(20),
                @department int, @position int, @policy bigint, @primary tinyint, @user int, @appointment bigint;
        SELECT @email = a.Email, @name = a.FullName, @employment = a.EmploymentType,
               @department = d.DepartmentId, @position = p.PositionId, @policy = pp.PolicyId
        FROM @accounts a
        LEFT JOIN dbo.Departments d ON d.Code = a.DepartmentCode AND d.IsActive = 1
        LEFT JOIN dbo.Positions p ON p.DepartmentId = d.DepartmentId AND p.Code = a.PositionCode AND p.IsActive = 1
        LEFT JOIN dbo.PositionAccessPolicies pp ON pp.PositionId = p.PositionId AND pp.IsPublished = 1
            AND (',' + pp.EmploymentTypes + ',') LIKE '%,' + a.EmploymentType + ',%'
        WHERE a.Seq = @seq;

        --- Skip titles missing from this database and accounts that already exist (changed data is preserved).
        IF @policy IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.Users WHERE NormalizedEmail = LOWER(@email))
        BEGIN
            SET @primary = (SELECT MAX(RoleId) FROM dbo.PositionPolicyRoles WHERE PolicyId = @policy);
            INSERT dbo.Users(Email, PasswordHash, PrimaryRoleId, FullName, ThemeMode, Status, MustChangePwd,
                             FailedLoginCount, ActivationPending, StaffAccessManaged)
            VALUES (@email, @PasswordHash, @primary, @name, N'Light', N'Active', 0, 0, 0, 1);
            SET @user = SCOPE_IDENTITY();

            INSERT dbo.StaffAppointments(UserId, DepartmentId, PositionId, EmploymentType, PolicyId)
            VALUES (@user, @department, @position, @employment, @policy);
            SET @appointment = SCOPE_IDENTITY();

            DECLARE @grants table (UserRoleId bigint);
            DELETE @grants;
            INSERT dbo.UserRoles(UserId, RoleId, ScopeType, DepartmentId)
            OUTPUT inserted.UserRoleId INTO @grants(UserRoleId)
            SELECT @user, r.RoleId, 'DEPARTMENT', @department FROM dbo.PositionPolicyRoles r WHERE r.PolicyId = @policy;
            INSERT dbo.UserRoleGrantSources(UserRoleId, AppointmentId, PolicyId, Kind, Reason)
            SELECT g.UserRoleId, @appointment, @policy, 'APPOINTMENT', N'Tài khoản demo theo sơ đồ tổ chức mới.'
            FROM @grants g;

            IF EXISTS (SELECT 1 FROM dbo.PositionPolicyRoles WHERE PolicyId = @policy AND RoleId = 2)
                INSERT dbo.TeacherProfiles(UserId, TeacherCode) VALUES (@user, N'TC-' + CAST(@user AS nvarchar(10)));
        END;
        SET @seq += 1;
    END;

    COMMIT TRANSACTION;
END;
GO
