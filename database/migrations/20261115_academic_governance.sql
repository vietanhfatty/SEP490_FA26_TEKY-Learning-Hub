-- Additive governance schema; replace the single authorization role with scoped grants.
-- Users.PrimaryRoleId is only the default UI role. Authorization uses UserRoles.
-- The migration runner owns the transaction. Never replay the legacy seed script.
SET XACT_ABORT ON;

CREATE TABLE dbo.Departments (
 DepartmentId int IDENTITY PRIMARY KEY, Code varchar(40) NOT NULL UNIQUE,
 Name nvarchar(160) NOT NULL, IsActive bit NOT NULL DEFAULT 1
);
CREATE TABLE dbo.Positions (
 PositionId int IDENTITY PRIMARY KEY, Code varchar(60) NOT NULL UNIQUE,
 Name nvarchar(200) NOT NULL, IsActive bit NOT NULL DEFAULT 1
);
CREATE TABLE dbo.StaffAppointments (
 AppointmentId bigint IDENTITY PRIMARY KEY,
 UserId int NOT NULL REFERENCES dbo.Users(UserId),
 DepartmentId int NOT NULL REFERENCES dbo.Departments(DepartmentId),
 PositionId int NOT NULL REFERENCES dbo.Positions(PositionId),
 EmploymentType varchar(20) NOT NULL CHECK (EmploymentType IN ('FULL_TIME','PART_TIME','CONTRACTOR')),
 ValidFrom datetime2 NOT NULL DEFAULT SYSUTCDATETIME(), ValidTo datetime2 NULL,
 CONSTRAINT CK_StaffAppointments_Dates CHECK (ValidTo IS NULL OR ValidTo>ValidFrom)
);
CREATE UNIQUE INDEX UX_StaffAppointments_Current ON dbo.StaffAppointments(UserId,DepartmentId,PositionId) WHERE ValidTo IS NULL;
CREATE INDEX IX_StaffAppointments_Department ON dbo.StaffAppointments(DepartmentId,ValidTo,UserId);

CREATE TABLE dbo.Permissions (
 PermissionId int IDENTITY PRIMARY KEY, Code varchar(80) NOT NULL UNIQUE,
 Description nvarchar(250) NOT NULL
);
CREATE TABLE dbo.RolePermissions (
 RoleId tinyint NOT NULL REFERENCES dbo.Roles(RoleId),
 PermissionId int NOT NULL REFERENCES dbo.Permissions(PermissionId),
 CONSTRAINT PK_RolePermissions PRIMARY KEY (RoleId,PermissionId)
);
CREATE TABLE dbo.UserRoles (
 UserRoleId bigint IDENTITY PRIMARY KEY,
 UserId int NOT NULL REFERENCES dbo.Users(UserId),
 RoleId tinyint NOT NULL REFERENCES dbo.Roles(RoleId),
 ScopeType varchar(20) NOT NULL, DepartmentId int NULL REFERENCES dbo.Departments(DepartmentId),
 AssignedBy int NULL REFERENCES dbo.Users(UserId), AssignedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
 RevokedAt datetime2 NULL,
 CONSTRAINT CK_UserRoles_Scope CHECK ((ScopeType='GLOBAL' AND DepartmentId IS NULL) OR (ScopeType='DEPARTMENT' AND DepartmentId IS NOT NULL)),
 CONSTRAINT CK_UserRoles_Dates CHECK (RevokedAt IS NULL OR RevokedAt>=AssignedAt)
 ,CONSTRAINT CK_UserRoles_SystemAdmin CHECK (RoleId<>3 OR ScopeType='GLOBAL')
);
CREATE UNIQUE INDEX UX_UserRoles_Global ON dbo.UserRoles(UserId,RoleId) WHERE RevokedAt IS NULL AND DepartmentId IS NULL;
CREATE UNIQUE INDEX UX_UserRoles_Department ON dbo.UserRoles(UserId,RoleId,DepartmentId) WHERE RevokedAt IS NULL AND DepartmentId IS NOT NULL;

INSERT dbo.Departments(Code,Name) VALUES ('ACADEMIC',N'Phòng chuyên môn');
INSERT dbo.Positions(Code,Name) VALUES
 ('TEACHER',N'Giáo viên'),('ACADEMIC_ADVISOR',N'Cố vấn chuyên môn'),
 ('TEACHER_MANAGER',N'Quản lý giáo viên'),('TEACHER_LEADER',N'Teacher Leader'),
 ('ACADEMIC_SPECIALIST',N'Chuyên viên học thuật'),('TRAINING_QA',N'Chuyên viên đào tạo và giám sát chất lượng'),
 ('PD_ACADEMIC',N'PD Chuyên môn'),('STEM_ACADEMIC_SPECIALIST',N'Chuyên viên học thuật STEM'),
 ('STEM_SCHOOL_OPERATIONS',N'Chuyên viên vận hành trường STEM'),
 ('EDTECH_CONTENT_DEVELOPER',N'Chuyên viên phát triển học liệu Edtech'),
 ('SCHOOL_CONTENT_SPECIALIST',N'Chuyên viên học liệu mảng trường');

-- Stable IDs preserve references. The user approved replacing legacy Staff/Admin roles.
DECLARE @roles table (RoleId tinyint, RoleName nvarchar(20));
INSERT @roles VALUES (1,N'Student'),(2,N'Teacher'),(3,N'SystemAdmin'),(4,N'Parent'),(5,N'AcademicStaff'),(6,N'AcademicManager');
IF EXISTS (SELECT 1 FROM dbo.Roles WHERE RoleId NOT BETWEEN 1 AND 6)
 THROW 51100,'Unknown legacy roles: map them explicitly before this migration.',1;
UPDATE r SET RoleName=s.RoleName FROM dbo.Roles r JOIN @roles s ON s.RoleId=r.RoleId;
INSERT dbo.Roles(RoleId,RoleName) SELECT s.RoleId,s.RoleName FROM @roles s WHERE NOT EXISTS (SELECT 1 FROM dbo.Roles r WHERE r.RoleId=s.RoleId);

INSERT dbo.Permissions(Code,Description) VALUES
 ('content.read',N'Xem nội dung được giao'),('content.edit',N'Biên soạn nội dung được giao'),
 ('content.comment',N'Góp ý nội dung được giao'),('content.assign',N'Phân công nội dung trong phạm vi'),
 ('review.open',N'Mở vòng xét duyệt'),('review.respond',N'Phản hồi vòng xét duyệt được giao'),
 ('content.publish',N'Công bố phiên bản đủ đồng thuận'),('identity.manage',N'Quản lý tài khoản và role'),
 ('course.manage',N'Quản lý danh mục khóa học');
INSERT dbo.RolePermissions(RoleId,PermissionId)
 SELECT r.RoleId,p.PermissionId FROM dbo.Roles r CROSS JOIN dbo.Permissions p
 WHERE (r.RoleId=2 AND p.Code IN ('content.read','content.comment','review.respond'))
 OR (r.RoleId=5 AND p.Code IN ('content.read','content.edit','content.comment','review.respond'))
 OR (r.RoleId=6 AND p.Code IN ('content.read','content.edit','content.comment','content.assign','review.open','review.respond','content.publish','course.manage'))
 OR (r.RoleId=3 AND p.Code IN ('identity.manage','course.manage'));
-- Preserve existing membership. Academic grants are limited to the new academic department.
INSERT dbo.UserRoles(UserId,RoleId,ScopeType,DepartmentId)
 SELECT UserId,RoleId,CASE WHEN RoleId IN (5,6) THEN 'DEPARTMENT' ELSE 'GLOBAL' END,
 CASE WHEN RoleId IN (5,6) THEN (SELECT DepartmentId FROM dbo.Departments WHERE Code='ACADEMIC') END FROM dbo.Users;
EXEC sys.sp_rename N'dbo.Users.RoleId',N'PrimaryRoleId',N'COLUMN';
-- Invalidate pre-migration tokens without deleting accounts or refresh/session history.
UPDATE dbo.Users SET SecurityVersion=SecurityVersion+1;

CREATE TABLE dbo.Contents (
 ContentId bigint IDENTITY PRIMARY KEY,
 DepartmentId int NOT NULL REFERENCES dbo.Departments(DepartmentId),
 ContentType varchar(20) NOT NULL,
 CourseId int NULL REFERENCES dbo.Courses(CourseId),
 LessonId int NULL REFERENCES dbo.Lessons(LessonId),
 MaterialId int NULL REFERENCES dbo.LessonMaterials(MaterialId),
 CandidateVersionId bigint NULL, PublishedVersionId bigint NULL,
 CreatedBy int NOT NULL REFERENCES dbo.Users(UserId), CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
 CONSTRAINT CK_Contents_Target CHECK
 ((ContentType='COURSE' AND CourseId IS NOT NULL AND LessonId IS NULL AND MaterialId IS NULL)
 OR (ContentType='LESSON' AND CourseId IS NULL AND LessonId IS NOT NULL AND MaterialId IS NULL)
 OR (ContentType='MATERIAL' AND CourseId IS NULL AND LessonId IS NULL AND MaterialId IS NOT NULL)
 OR (ContentType='DOCUMENT' AND CourseId IS NULL AND LessonId IS NULL AND MaterialId IS NULL))
);
CREATE UNIQUE INDEX UX_Contents_Course ON dbo.Contents(CourseId) WHERE CourseId IS NOT NULL;
CREATE UNIQUE INDEX UX_Contents_Lesson ON dbo.Contents(LessonId) WHERE LessonId IS NOT NULL;
CREATE UNIQUE INDEX UX_Contents_Material ON dbo.Contents(MaterialId) WHERE MaterialId IS NOT NULL;
CREATE TABLE dbo.ContentVersions (
 VersionId bigint IDENTITY PRIMARY KEY,
 ContentId bigint NOT NULL REFERENCES dbo.Contents(ContentId), VersionNo int NOT NULL CHECK (VersionNo>0),
 BaseVersionId bigint NULL, Title nvarchar(250) NOT NULL, Payload nvarchar(max) NOT NULL CHECK (ISJSON(Payload)=1),
 Status varchar(10) NOT NULL DEFAULT 'DRAFT' CHECK (Status IN ('DRAFT','FROZEN')),
 CreatedBy int NOT NULL REFERENCES dbo.Users(UserId), CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
 FrozenAt datetime2 NULL, RowVersion rowversion NOT NULL,
 CONSTRAINT UQ_ContentVersions_Number UNIQUE(ContentId,VersionNo),
 CONSTRAINT UQ_ContentVersions_Owner UNIQUE(ContentId,VersionId),
 CONSTRAINT FK_ContentVersions_Base FOREIGN KEY(ContentId,BaseVersionId) REFERENCES dbo.ContentVersions(ContentId,VersionId),
 CONSTRAINT CK_ContentVersions_Frozen CHECK ((Status='DRAFT' AND FrozenAt IS NULL) OR (Status='FROZEN' AND FrozenAt IS NOT NULL))
);
CREATE UNIQUE INDEX UX_ContentVersions_Draft ON dbo.ContentVersions(ContentId) WHERE Status='DRAFT';
ALTER TABLE dbo.Contents ADD
 CONSTRAINT FK_Contents_Candidate FOREIGN KEY(ContentId,CandidateVersionId) REFERENCES dbo.ContentVersions(ContentId,VersionId),
 CONSTRAINT FK_Contents_Published FOREIGN KEY(ContentId,PublishedVersionId) REFERENCES dbo.ContentVersions(ContentId,VersionId);
CREATE TABLE dbo.ContentAssignments (
 AssignmentId bigint IDENTITY PRIMARY KEY,
 ContentId bigint NOT NULL REFERENCES dbo.Contents(ContentId), UserId int NOT NULL REFERENCES dbo.Users(UserId),
 AssignmentType varchar(12) NOT NULL CHECK (AssignmentType IN ('EDITOR','COMMENTER')),
 AssignedBy int NOT NULL REFERENCES dbo.Users(UserId), AssignedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
 RevokedAt datetime2 NULL,
 CONSTRAINT CK_ContentAssignments_Dates CHECK (RevokedAt IS NULL OR RevokedAt>=AssignedAt)
);
CREATE UNIQUE INDEX UX_ContentAssignments_Active ON dbo.ContentAssignments(ContentId,UserId,AssignmentType) WHERE RevokedAt IS NULL;
CREATE TABLE dbo.ContentComments (
 CommentId bigint IDENTITY PRIMARY KEY, VersionId bigint NOT NULL REFERENCES dbo.ContentVersions(VersionId),
 AuthorId int NOT NULL REFERENCES dbo.Users(UserId), ParentCommentId bigint NULL,
 Anchor nvarchar(500) NULL, Body nvarchar(max) NOT NULL,
 Status varchar(12) NOT NULL DEFAULT 'OPEN' CHECK (Status IN ('OPEN','RESOLVED')),
 CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
 CONSTRAINT UQ_ContentComments_Version UNIQUE(VersionId,CommentId),
 CONSTRAINT FK_ContentComments_Parent FOREIGN KEY(VersionId,ParentCommentId) REFERENCES dbo.ContentComments(VersionId,CommentId),
 CONSTRAINT CK_ContentComments_NotSelf CHECK (ParentCommentId IS NULL OR ParentCommentId<>CommentId)
);
CREATE TABLE dbo.ApprovalRounds (
 RoundId bigint IDENTITY PRIMARY KEY, ContentId bigint NOT NULL, VersionId bigint NOT NULL,
 DepartmentId int NOT NULL REFERENCES dbo.Departments(DepartmentId), RoundNo int NOT NULL CHECK (RoundNo>0),
 Policy varchar(10) NOT NULL DEFAULT 'ALL' CHECK (Policy='ALL'),
 Status varchar(20) NOT NULL DEFAULT 'DRAFT' CHECK (Status IN ('DRAFT','OPEN','APPROVED','CHANGES_REQUESTED','CANCELLED')),
 OpenedBy int NOT NULL REFERENCES dbo.Users(UserId), OpenedAt datetime2 NULL, ClosedAt datetime2 NULL,
 CancellationReason nvarchar(1000) NULL,
 CONSTRAINT FK_ApprovalRounds_Version FOREIGN KEY(ContentId,VersionId) REFERENCES dbo.ContentVersions(ContentId,VersionId),
 CONSTRAINT UQ_ApprovalRounds_Number UNIQUE(VersionId,RoundNo),
 CONSTRAINT UQ_ApprovalRounds_Version UNIQUE(ContentId,VersionId,RoundId),
 CONSTRAINT CK_ApprovalRounds_Dates CHECK
 ((Status='DRAFT' AND OpenedAt IS NULL AND ClosedAt IS NULL)
 OR (Status='OPEN' AND OpenedAt IS NOT NULL AND ClosedAt IS NULL)
 OR (Status IN ('APPROVED','CHANGES_REQUESTED','CANCELLED') AND OpenedAt IS NOT NULL AND ClosedAt IS NOT NULL AND ClosedAt>=OpenedAt)),
 CONSTRAINT CK_ApprovalRounds_Cancel CHECK (Status<>'CANCELLED' OR (CancellationReason IS NOT NULL AND LEN(LTRIM(RTRIM(CancellationReason)))>0))
);
CREATE UNIQUE INDEX UX_ApprovalRounds_OpenContent ON dbo.ApprovalRounds(ContentId) WHERE Status='OPEN';
CREATE TABLE dbo.ApprovalParticipants (
 RoundId bigint NOT NULL REFERENCES dbo.ApprovalRounds(RoundId), UserId int NOT NULL REFERENCES dbo.Users(UserId),
 ParticipantSnapshot nvarchar(max) NOT NULL CHECK(ISJSON(ParticipantSnapshot)=1),
 CONSTRAINT PK_ApprovalParticipants PRIMARY KEY(RoundId,UserId)
);
CREATE TABLE dbo.ApprovalDecisions (
 RoundId bigint NOT NULL, UserId int NOT NULL,
 Decision varchar(20) NOT NULL CHECK(Decision IN ('APPROVE','REQUEST_CHANGES')),
 Comment nvarchar(2000) NULL, DecidedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
 CONSTRAINT PK_ApprovalDecisions PRIMARY KEY(RoundId,UserId),
 CONSTRAINT FK_ApprovalDecisions_Participant FOREIGN KEY(RoundId,UserId) REFERENCES dbo.ApprovalParticipants(RoundId,UserId),
 CONSTRAINT CK_ApprovalDecisions_Reason CHECK(Decision<>'REQUEST_CHANGES' OR (Comment IS NOT NULL AND LEN(LTRIM(RTRIM(Comment)))>0))
);
CREATE TABLE dbo.ContentPublications (
 PublicationId bigint IDENTITY PRIMARY KEY, ContentId bigint NOT NULL, VersionId bigint NOT NULL, RoundId bigint NOT NULL,
 PublishedBy int NOT NULL REFERENCES dbo.Users(UserId), PublishedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
 CONSTRAINT FK_ContentPublications_Approval FOREIGN KEY(ContentId,VersionId,RoundId) REFERENCES dbo.ApprovalRounds(ContentId,VersionId,RoundId),
 CONSTRAINT UQ_ContentPublications_Round UNIQUE(RoundId)
);
GO
CREATE FUNCTION dbo.HasAcademicPermission(@UserId int,@Code varchar(80),@DepartmentId int)
RETURNS bit AS
BEGIN
 RETURN CASE WHEN EXISTS (
 SELECT 1 FROM dbo.UserRoles ur JOIN dbo.Users u ON u.UserId=ur.UserId
 JOIN dbo.RolePermissions rp ON rp.RoleId=ur.RoleId JOIN dbo.Permissions p ON p.PermissionId=rp.PermissionId
 WHERE ur.UserId=@UserId AND ur.RevokedAt IS NULL AND u.Status='Active' AND p.Code=@Code
 AND (ur.ScopeType='GLOBAL' OR ur.DepartmentId=@DepartmentId)) THEN 1 ELSE 0 END;
END;
GO
CREATE TRIGGER dbo.trg_ContentVersions_Immutable ON dbo.ContentVersions AFTER UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted WHERE Status='FROZEN')
 THROW 51101,'Frozen versions are immutable. Create a new draft.',1;
 IF EXISTS(SELECT 1 FROM deleted d JOIN inserted i ON i.VersionId=d.VersionId WHERE i.ContentId<>d.ContentId OR i.VersionNo<>d.VersionNo)
 THROW 51102,'Version identity cannot be reassigned.',1;
END;
GO
CREATE TRIGGER dbo.trg_ApprovalParticipants_Frozen ON dbo.ApprovalParticipants AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM (SELECT RoundId FROM inserted UNION SELECT RoundId FROM deleted) x
 JOIN dbo.ApprovalRounds r WITH(UPDLOCK,HOLDLOCK) ON r.RoundId=x.RoundId WHERE r.Status<>'DRAFT')
 THROW 51103,'The participant list is frozen after opening a round.',1;
END;
GO
CREATE TRIGGER dbo.trg_ApprovalDecisions_Immutable ON dbo.ApprovalDecisions AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted) THROW 51104,'Decisions are append-only.',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.ApprovalRounds r WITH(UPDLOCK,HOLDLOCK) ON r.RoundId=i.RoundId
 WHERE r.Status<>'OPEN' OR dbo.HasAcademicPermission(i.UserId,'review.respond',r.DepartmentId)=0)
 THROW 51105,'Only eligible participants may respond to an open round.',1;
END;
GO
CREATE TRIGGER dbo.trg_ApprovalRounds_Validate ON dbo.ApprovalRounds AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.RoundId=d.RoundId WHERE i.RoundId IS NULL)
 THROW 51106,'Approval history cannot be deleted.',1;
 IF EXISTS(SELECT 1 FROM deleted d JOIN inserted i ON i.RoundId=d.RoundId
 WHERE d.ContentId<>i.ContentId OR d.VersionId<>i.VersionId OR d.DepartmentId<>i.DepartmentId OR d.RoundNo<>i.RoundNo
 OR d.Policy<>i.Policy OR d.Status IN ('APPROVED','CHANGES_REQUESTED','CANCELLED')
 OR (d.Status='OPEN' AND i.Status NOT IN ('APPROVED','CHANGES_REQUESTED','CANCELLED')))
 THROW 51107,'Invalid approval transition or altered approval identity.',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Contents c ON c.ContentId=i.ContentId WHERE c.DepartmentId<>i.DepartmentId)
 THROW 51108,'Approval department must own the content.',1;
 IF EXISTS(SELECT 1 FROM inserted i WHERE i.Status IN ('OPEN','APPROVED') AND
 (NOT EXISTS(SELECT 1 FROM dbo.ApprovalParticipants p WHERE p.RoundId=i.RoundId)
 OR NOT EXISTS(SELECT 1 FROM dbo.ContentVersions v WHERE v.VersionId=i.VersionId AND v.Status='FROZEN')))
 THROW 51109,'Approval requires a frozen version and a nonempty roster.',1;
 -- Opening must include exactly the department roster, including locked accounts: no silent omission.
 IF EXISTS(SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.RoundId=i.RoundId WHERE i.Status='OPEN' AND
 (d.RoundId IS NULL OR d.Status='DRAFT') AND
 (EXISTS(SELECT a.UserId FROM dbo.StaffAppointments a WHERE a.DepartmentId=i.DepartmentId AND a.ValidFrom<=i.OpenedAt AND (a.ValidTo IS NULL OR a.ValidTo>i.OpenedAt)
 EXCEPT SELECT p.UserId FROM dbo.ApprovalParticipants p WHERE p.RoundId=i.RoundId)
 OR EXISTS(SELECT p.UserId FROM dbo.ApprovalParticipants p WHERE p.RoundId=i.RoundId
 EXCEPT SELECT a.UserId FROM dbo.StaffAppointments a WHERE a.DepartmentId=i.DepartmentId AND a.ValidFrom<=i.OpenedAt AND (a.ValidTo IS NULL OR a.ValidTo>i.OpenedAt))))
 THROW 51110,'All department members must be included, without additional participants.',1;
 IF EXISTS(SELECT 1 FROM inserted i WHERE i.Status='APPROVED' AND EXISTS
 (SELECT 1 FROM dbo.ApprovalParticipants p LEFT JOIN dbo.ApprovalDecisions d ON d.RoundId=p.RoundId AND d.UserId=p.UserId
 WHERE p.RoundId=i.RoundId AND (d.Decision IS NULL OR d.Decision<>'APPROVE')))
 THROW 51111,'Unanimous approval is required.',1;
END;
GO
CREATE TRIGGER dbo.trg_ContentPublications_Validate ON dbo.ContentPublications AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted) THROW 51112,'Publication history is append-only.',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Contents c WITH(UPDLOCK,HOLDLOCK) ON c.ContentId=i.ContentId
 JOIN dbo.ApprovalRounds r ON r.RoundId=i.RoundId
 WHERE r.Status<>'APPROVED' OR c.CandidateVersionId IS NULL OR c.CandidateVersionId<>i.VersionId
 OR dbo.HasAcademicPermission(i.PublishedBy,'content.publish',c.DepartmentId)=0)
 THROW 51113,'Only the current, unanimously approved candidate may be published by an authorized manager.',1;
END;
GO
CREATE TRIGGER dbo.trg_Contents_PublicationPointer ON dbo.Contents AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i WHERE i.PublishedVersionId IS NOT NULL AND NOT EXISTS
 (SELECT 1 FROM dbo.ContentPublications p WHERE p.ContentId=i.ContentId AND p.VersionId=i.PublishedVersionId))
 THROW 51114,'A published pointer requires a validated publication record.',1;
 IF EXISTS(SELECT 1 FROM deleted d JOIN inserted i ON i.ContentId=d.ContentId WHERE d.DepartmentId<>i.DepartmentId
 OR ISNULL(d.CourseId,0)<>ISNULL(i.CourseId,0) OR ISNULL(d.LessonId,0)<>ISNULL(i.LessonId,0)
 OR ISNULL(d.MaterialId,0)<>ISNULL(i.MaterialId,0) OR d.ContentType<>i.ContentType)
 THROW 51115,'Content ownership and source cannot be reassigned.',1;
END;
GO
CREATE PROCEDURE dbo.OpenContentApproval @ContentId bigint,@ActorId int AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
 BEGIN TRANSACTION;
 DECLARE @version bigint,@dept int,@round bigint,@now datetime2=SYSUTCDATETIME();
 SELECT @version=CandidateVersionId,@dept=DepartmentId FROM dbo.Contents WITH(UPDLOCK,HOLDLOCK) WHERE ContentId=@ContentId;
 IF @version IS NULL OR dbo.HasAcademicPermission(@ActorId,'review.open',@dept)=0 THROW 51120,'No candidate or no permission to open review.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.StaffAppointments WITH(UPDLOCK,HOLDLOCK) WHERE DepartmentId=@dept AND ValidFrom<=@now AND (ValidTo IS NULL OR ValidTo>@now))
 THROW 51121,'Configure the complete department membership before opening review.',1;
 IF EXISTS(SELECT 1 FROM dbo.StaffAppointments WHERE DepartmentId=@dept AND ValidFrom<=@now AND (ValidTo IS NULL OR ValidTo>@now)
 AND dbo.HasAcademicPermission(UserId,'review.respond',@dept)=0)
 THROW 51122,'Every required member needs an active account and review permission.',1;
 UPDATE dbo.ContentVersions SET Status='FROZEN',FrozenAt=@now WHERE VersionId=@version AND Status='DRAFT';
 INSERT dbo.ApprovalRounds(ContentId,VersionId,DepartmentId,RoundNo,OpenedBy)
 SELECT @ContentId,@version,@dept,ISNULL(MAX(RoundNo),0)+1,@ActorId FROM dbo.ApprovalRounds WHERE VersionId=@version;
 SET @round=SCOPE_IDENTITY();
 INSERT dbo.ApprovalParticipants(RoundId,UserId,ParticipantSnapshot)
 SELECT @round,u.UserId,(SELECT u.FullName AS name,d.Name AS department,
 JSON_QUERY((SELECT p.Code,p.Name FROM dbo.StaffAppointments a JOIN dbo.Positions p ON p.PositionId=a.PositionId
 WHERE a.UserId=u.UserId AND a.DepartmentId=@dept AND a.ValidFrom<=@now AND (a.ValidTo IS NULL OR a.ValidTo>@now) FOR JSON PATH)) AS positions
 FOR JSON PATH,WITHOUT_ARRAY_WRAPPER)
 FROM dbo.Users u CROSS JOIN dbo.Departments d WHERE d.DepartmentId=@dept AND EXISTS
 (SELECT 1 FROM dbo.StaffAppointments a WHERE a.UserId=u.UserId AND a.DepartmentId=@dept AND a.ValidFrom<=@now AND (a.ValidTo IS NULL OR a.ValidTo>@now));
 UPDATE dbo.ApprovalRounds SET Status='OPEN',OpenedAt=@now WHERE RoundId=@round;
 INSERT dbo.AuditLogs(ActorUserId,ActorType,Action,EntityType,EntityId) VALUES(@ActorId,'User','REVIEW_OPENED','ApprovalRound',CONVERT(nvarchar(40),@round));
 COMMIT; SELECT @round AS RoundId;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK; THROW; END CATCH
END;
GO
CREATE PROCEDURE dbo.SubmitContentDecision @RoundId bigint,@ActorId int,@Decision varchar(20),@Comment nvarchar(2000)=NULL AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
 BEGIN TRANSACTION;
 DECLARE @status varchar(20);
 SELECT @status=Status FROM dbo.ApprovalRounds WITH(UPDLOCK,HOLDLOCK) WHERE RoundId=@RoundId;
 IF @status IS NULL OR @status<>'OPEN' THROW 51123,'Review is not open.',1;
 INSERT dbo.ApprovalDecisions(RoundId,UserId,Decision,Comment) VALUES(@RoundId,@ActorId,@Decision,@Comment);
 IF @Decision='REQUEST_CHANGES'
 UPDATE dbo.ApprovalRounds SET Status='CHANGES_REQUESTED',ClosedAt=SYSUTCDATETIME() WHERE RoundId=@RoundId;
 ELSE IF NOT EXISTS(SELECT 1 FROM dbo.ApprovalParticipants p LEFT JOIN dbo.ApprovalDecisions d ON d.RoundId=p.RoundId AND d.UserId=p.UserId
 WHERE p.RoundId=@RoundId AND (d.Decision IS NULL OR d.Decision<>'APPROVE'))
 UPDATE dbo.ApprovalRounds SET Status='APPROVED',ClosedAt=SYSUTCDATETIME() WHERE RoundId=@RoundId;
 INSERT dbo.AuditLogs(ActorUserId,ActorType,Action,EntityType,EntityId,NewValue) VALUES(@ActorId,'User','REVIEW_RESPONDED','ApprovalRound',CONVERT(nvarchar(40),@RoundId),@Decision);
 COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK; THROW; END CATCH
END;
GO
CREATE PROCEDURE dbo.PublishAcademicContent @RoundId bigint,@ActorId int AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
 BEGIN TRANSACTION;
 DECLARE @content bigint,@version bigint;
 SELECT @content=ContentId,@version=VersionId FROM dbo.ApprovalRounds WHERE RoundId=@RoundId;
 IF @content IS NULL THROW 51124,'Review does not exist.',1;
 -- Lock order matches opening: content, then round. The insert trigger checks permissions and unanimity.
 SELECT @content=ContentId FROM dbo.Contents WITH(UPDLOCK,HOLDLOCK) WHERE ContentId=@content;
 INSERT dbo.ContentPublications(ContentId,VersionId,RoundId,PublishedBy) VALUES(@content,@version,@RoundId,@ActorId);
 UPDATE dbo.Contents SET PublishedVersionId=@version WHERE ContentId=@content;
 INSERT dbo.AuditLogs(ActorUserId,ActorType,Action,EntityType,EntityId) VALUES(@ActorId,'User','CONTENT_PUBLISHED','Content',CONVERT(nvarchar(40),@content));
 COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK; THROW; END CATCH
END;
