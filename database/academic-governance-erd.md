# ERD phân quyền và quản trị nội dung LMS TEKY

Sinh trực tiếp từ metadata SQL Server sau migration; chỉ bao gồm phần chuyên môn và các bảng LMS liên quan.

`PK`: khóa chính; `FK`: khóa ngoại; các cột PK trong cùng bảng tạo khóa chính ghép. `nullable`: có thể để trống.
Đường nối ghi cột FK và cột được tham chiếu; thứ tự tương ứng với khóa ghép. Bảng xuất hiện lại ở nhiều sơ đồ để dễ đọc.

`Users.PrimaryRoleId` chỉ chọn giao diện mặc định. Phân quyền thực tế dùng `UserRoles`, `RolePermissions`, phạm vi và phân công.

## Nhân sự và phân quyền

```mermaid
erDiagram
    Users {
        int UserId PK
        nvarchar Email
        nvarchar PasswordHash
        tinyint PrimaryRoleId FK
        nvarchar FullName
        nvarchar Phone "nullable"
        nvarchar Address "nullable"
        nvarchar AvatarUrl "nullable"
        nvarchar ThemeMode
        nvarchar Status
        bit MustChangePwd
        int FailedLoginCount
        datetime2 LastLoginAt "nullable"
        datetime2 CreatedAt
        datetime2 UpdatedAt "nullable"
        datetime2 LockoutEndAt "nullable"
        int SecurityVersion
        nvarchar Bio "nullable"
    }
    Roles {
        tinyint RoleId PK
        nvarchar RoleName
    }
    Departments {
        int DepartmentId PK
        varchar Code
        nvarchar Name
        bit IsActive
    }
    Positions {
        int PositionId PK
        varchar Code
        nvarchar Name
        bit IsActive
    }
    StaffAppointments {
        bigint AppointmentId PK
        int UserId FK
        int DepartmentId FK
        int PositionId FK
        varchar EmploymentType
        datetime2 ValidFrom
        datetime2 ValidTo "nullable"
    }
    Permissions {
        int PermissionId PK
        varchar Code
        nvarchar Description
    }
    RolePermissions {
        tinyint RoleId PK, FK
        int PermissionId PK, FK
    }
    UserRoles {
        bigint UserRoleId PK
        int UserId FK
        tinyint RoleId FK
        varchar ScopeType
        int DepartmentId FK "nullable"
        int AssignedBy FK "nullable"
        datetime2 AssignedAt
        datetime2 RevokedAt "nullable"
    }
    Roles ||--o{ Users : "PrimaryRoleId -> RoleId"
    Users ||--o{ StaffAppointments : "UserId -> UserId"
    Departments ||--o{ StaffAppointments : "DepartmentId -> DepartmentId"
    Positions ||--o{ StaffAppointments : "PositionId -> PositionId"
    Roles ||--o{ RolePermissions : "RoleId -> RoleId"
    Permissions ||--o{ RolePermissions : "PermissionId -> PermissionId"
    Users ||--o{ UserRoles : "UserId -> UserId"
    Roles ||--o{ UserRoles : "RoleId -> RoleId"
    Departments |o--o{ UserRoles : "DepartmentId -> DepartmentId"
    Users |o--o{ UserRoles : "AssignedBy -> UserId"
```

## Nội dung và phiên bản

```mermaid
erDiagram
    Users {
        int UserId PK
        nvarchar Email
        nvarchar PasswordHash
        tinyint PrimaryRoleId FK
        nvarchar FullName
        nvarchar Phone "nullable"
        nvarchar Address "nullable"
        nvarchar AvatarUrl "nullable"
        nvarchar ThemeMode
        nvarchar Status
        bit MustChangePwd
        int FailedLoginCount
        datetime2 LastLoginAt "nullable"
        datetime2 CreatedAt
        datetime2 UpdatedAt "nullable"
        datetime2 LockoutEndAt "nullable"
        int SecurityVersion
        nvarchar Bio "nullable"
    }
    Departments {
        int DepartmentId PK
        varchar Code
        nvarchar Name
        bit IsActive
    }
    Courses {
        int CourseId PK
        nvarchar CourseCode
        nvarchar Name
        nvarchar Description "nullable"
        nvarchar LevelCode "nullable"
        nvarchar Status
        int CreatedBy FK "nullable"
        datetime2 CreatedAt
    }
    Lessons {
        int LessonId PK
        int CourseId FK
        nvarchar Title
        nvarchar Content "nullable"
        int OrderNo
        bit IsDeleted
    }
    LessonMaterials {
        int MaterialId PK
        int LessonId FK
        nvarchar MaterialType
        nvarchar Title
        nvarchar FileUrl
        bit IsDownloadable
        int SortOrder
    }
    Contents {
        bigint ContentId PK, FK
        int DepartmentId FK
        varchar ContentType
        int CourseId FK "nullable"
        int LessonId FK "nullable"
        int MaterialId FK "nullable"
        bigint CandidateVersionId FK "nullable"
        bigint PublishedVersionId FK "nullable"
        int CreatedBy FK
        datetime2 CreatedAt
    }
    ContentVersions {
        bigint VersionId PK
        bigint ContentId FK
        int VersionNo
        bigint BaseVersionId FK "nullable"
        nvarchar Title
        nvarchar Payload
        varchar Status
        int CreatedBy FK
        datetime2 CreatedAt
        datetime2 FrozenAt "nullable"
        timestamp RowVersion
    }
    ContentAssignments {
        bigint AssignmentId PK
        bigint ContentId FK
        int UserId FK
        varchar AssignmentType
        int AssignedBy FK
        datetime2 AssignedAt
        datetime2 RevokedAt "nullable"
    }
    ContentComments {
        bigint CommentId PK
        bigint VersionId FK
        int AuthorId FK
        bigint ParentCommentId FK "nullable"
        nvarchar Anchor "nullable"
        nvarchar Body
        varchar Status
        datetime2 CreatedAt
    }
    Users |o--o{ Courses : "CreatedBy -> UserId"
    Courses ||--o{ Lessons : "CourseId -> CourseId"
    Lessons ||--o{ LessonMaterials : "LessonId -> LessonId"
    Departments ||--o{ Contents : "DepartmentId -> DepartmentId"
    Courses |o--o{ Contents : "CourseId -> CourseId"
    Lessons |o--o{ Contents : "LessonId -> LessonId"
    LessonMaterials |o--o{ Contents : "MaterialId -> MaterialId"
    Users ||--o{ Contents : "CreatedBy -> UserId"
    ContentVersions |o--o| Contents : "ContentId, CandidateVersionId -> ContentId, VersionId"
    ContentVersions |o--o| Contents : "ContentId, PublishedVersionId -> ContentId, VersionId"
    Contents ||--o{ ContentVersions : "ContentId -> ContentId"
    Users ||--o{ ContentVersions : "CreatedBy -> UserId"
    ContentVersions |o--o{ ContentVersions : "ContentId, BaseVersionId -> ContentId, VersionId"
    Contents ||--o{ ContentAssignments : "ContentId -> ContentId"
    Users ||--o{ ContentAssignments : "UserId -> UserId"
    Users ||--o{ ContentAssignments : "AssignedBy -> UserId"
    ContentVersions ||--o{ ContentComments : "VersionId -> VersionId"
    Users ||--o{ ContentComments : "AuthorId -> UserId"
    ContentComments |o--o{ ContentComments : "VersionId, ParentCommentId -> VersionId, CommentId"
```

## Xét duyệt và công bố

```mermaid
erDiagram
    Users {
        int UserId PK
        nvarchar Email
        nvarchar PasswordHash
        tinyint PrimaryRoleId FK
        nvarchar FullName
        nvarchar Phone "nullable"
        nvarchar Address "nullable"
        nvarchar AvatarUrl "nullable"
        nvarchar ThemeMode
        nvarchar Status
        bit MustChangePwd
        int FailedLoginCount
        datetime2 LastLoginAt "nullable"
        datetime2 CreatedAt
        datetime2 UpdatedAt "nullable"
        datetime2 LockoutEndAt "nullable"
        int SecurityVersion
        nvarchar Bio "nullable"
    }
    Departments {
        int DepartmentId PK
        varchar Code
        nvarchar Name
        bit IsActive
    }
    Contents {
        bigint ContentId PK, FK
        int DepartmentId FK
        varchar ContentType
        int CourseId FK "nullable"
        int LessonId FK "nullable"
        int MaterialId FK "nullable"
        bigint CandidateVersionId FK "nullable"
        bigint PublishedVersionId FK "nullable"
        int CreatedBy FK
        datetime2 CreatedAt
    }
    ContentVersions {
        bigint VersionId PK
        bigint ContentId FK
        int VersionNo
        bigint BaseVersionId FK "nullable"
        nvarchar Title
        nvarchar Payload
        varchar Status
        int CreatedBy FK
        datetime2 CreatedAt
        datetime2 FrozenAt "nullable"
        timestamp RowVersion
    }
    ApprovalRounds {
        bigint RoundId PK
        bigint ContentId FK
        bigint VersionId FK
        int DepartmentId FK
        int RoundNo
        varchar Policy
        varchar Status
        int OpenedBy FK
        datetime2 OpenedAt "nullable"
        datetime2 ClosedAt "nullable"
        nvarchar CancellationReason "nullable"
    }
    ApprovalParticipants {
        bigint RoundId PK, FK
        int UserId PK, FK
        nvarchar ParticipantSnapshot
    }
    ApprovalDecisions {
        bigint RoundId PK, FK
        int UserId PK, FK
        varchar Decision
        nvarchar Comment "nullable"
        datetime2 DecidedAt
    }
    ContentPublications {
        bigint PublicationId PK
        bigint ContentId FK
        bigint VersionId FK
        bigint RoundId FK
        int PublishedBy FK
        datetime2 PublishedAt
    }
    AuditLogs {
        bigint AuditId PK
        int ActorUserId FK "nullable"
        nvarchar ActorType
        nvarchar Action
        nvarchar EntityType "nullable"
        nvarchar EntityId "nullable"
        nvarchar OldValue "nullable"
        nvarchar NewValue "nullable"
        nvarchar IpAddress "nullable"
        datetime2 CreatedAt
    }
    Departments ||--o{ Contents : "DepartmentId -> DepartmentId"
    Users ||--o{ Contents : "CreatedBy -> UserId"
    ContentVersions |o--o| Contents : "ContentId, CandidateVersionId -> ContentId, VersionId"
    ContentVersions |o--o| Contents : "ContentId, PublishedVersionId -> ContentId, VersionId"
    Contents ||--o{ ContentVersions : "ContentId -> ContentId"
    Users ||--o{ ContentVersions : "CreatedBy -> UserId"
    ContentVersions |o--o{ ContentVersions : "ContentId, BaseVersionId -> ContentId, VersionId"
    Users ||--o{ ApprovalRounds : "OpenedBy -> UserId"
    ContentVersions ||--o{ ApprovalRounds : "ContentId, VersionId -> ContentId, VersionId"
    Departments ||--o{ ApprovalRounds : "DepartmentId -> DepartmentId"
    ApprovalRounds ||--o{ ApprovalParticipants : "RoundId -> RoundId"
    Users ||--o{ ApprovalParticipants : "UserId -> UserId"
    ApprovalParticipants ||--o| ApprovalDecisions : "RoundId, UserId -> RoundId, UserId"
    Users ||--o{ ContentPublications : "PublishedBy -> UserId"
    ApprovalRounds ||--o| ContentPublications : "ContentId, VersionId, RoundId -> ContentId, VersionId, RoundId"
    Users |o--o{ AuditLogs : "ActorUserId -> UserId"
```

Quan hệ qua unique filtered index chỉ duy nhất trong điều kiện index (ví dụ grant chưa thu hồi).

Xem [hướng dẫn migration và ràng buộc nghiệp vụ](academic-governance.md).
