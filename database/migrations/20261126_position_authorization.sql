SET XACT_ABORT ON;
ALTER TABLE dbo.Users ADD StaffAccessManaged bit NOT NULL CONSTRAINT DF_Users_StaffAccessManaged DEFAULT 0;
CREATE TABLE dbo.PositionAccessPolicies (
 PolicyId bigint IDENTITY PRIMARY KEY, PositionId int NOT NULL REFERENCES dbo.Positions(PositionId),
 Version int NOT NULL, IsPublished bit NOT NULL DEFAULT 0,
 EmploymentTypes varchar(80) NOT NULL DEFAULT 'FULL_TIME,PART_TIME,CONTRACTOR',
 CreatedBy int NOT NULL, CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
 CONSTRAINT UX_PositionAccessPolicy_Version UNIQUE(PositionId,Version)
);
CREATE UNIQUE INDEX UX_PositionAccessPolicy_Published ON dbo.PositionAccessPolicies(PositionId) WHERE IsPublished=1;
CREATE TABLE dbo.PositionPolicyRoles (
 PolicyId bigint NOT NULL REFERENCES dbo.PositionAccessPolicies(PolicyId), RoleId tinyint NOT NULL REFERENCES dbo.Roles(RoleId),
 CONSTRAINT PK_PositionPolicyRoles PRIMARY KEY(PolicyId,RoleId),
 CONSTRAINT CK_PositionPolicyRoles_Business CHECK(RoleId IN(2,5,6))
);
ALTER TABLE dbo.StaffAppointments ADD PolicyId bigint NULL REFERENCES dbo.PositionAccessPolicies(PolicyId),
 CreatedBy int NULL, EndedBy int NULL, EndReason nvarchar(500) NULL,
 Version int NOT NULL CONSTRAINT DF_StaffAppointments_Version DEFAULT 0;
CREATE TABLE dbo.UserRoleGrantSources (
 SourceId bigint IDENTITY PRIMARY KEY, UserRoleId bigint NOT NULL REFERENCES dbo.UserRoles(UserRoleId),
 AppointmentId bigint NULL REFERENCES dbo.StaffAppointments(AppointmentId),
 PolicyId bigint NULL REFERENCES dbo.PositionAccessPolicies(PolicyId),
 Kind varchar(20) NOT NULL, Reason nvarchar(500) NOT NULL DEFAULT N'', CreatedBy int NULL,
 CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(), EndedAt datetime2 NULL,
 CONSTRAINT CK_GrantSources_Kind CHECK (
  (Kind='APPOINTMENT' AND AppointmentId IS NOT NULL AND PolicyId IS NOT NULL) OR
  (Kind IN('LEGACY','SYSTEM_ADMIN','EXCEPTION','PERSONAL') AND AppointmentId IS NULL AND PolicyId IS NULL))
);
CREATE UNIQUE INDEX UX_GrantSources_Appointment ON dbo.UserRoleGrantSources(UserRoleId,AppointmentId) WHERE EndedAt IS NULL AND AppointmentId IS NOT NULL;
CREATE INDEX IX_GrantSources_Active ON dbo.UserRoleGrantSources(UserRoleId,EndedAt);
-- Preserve existing permissions until an administrator reconciles the actual appointments.
INSERT dbo.UserRoleGrantSources(UserRoleId,Kind,Reason,CreatedBy,CreatedAt)
 SELECT UserRoleId,CASE WHEN RoleId=3 THEN 'SYSTEM_ADMIN' WHEN RoleId IN(1,4) THEN 'PERSONAL' ELSE 'LEGACY' END,
 N'Quyền trước khi liên kết chức danh; cần đối soát đối với nhân sự.',AssignedBy,AssignedAt
 FROM dbo.UserRoles WHERE RevokedAt IS NULL;
-- Only the established teaching titles get a published default. Other job titles require explicit configuration.
INSERT dbo.PositionAccessPolicies(PositionId,Version,IsPublished,EmploymentTypes,CreatedBy)
 SELECT p.PositionId,1,CASE WHEN d.Code='TEACHER' AND p.Code IN('TEACHER_FULL_TIME','TEACHER_PART_TIME','TEACHER_STEM_FREELANCE','TEACHER_STEM_HANOI') THEN 1 ELSE 0 END,
 CASE WHEN d.Code='TEACHER' AND p.Code='TEACHER_FULL_TIME' THEN 'FULL_TIME'
      WHEN d.Code='TEACHER' AND p.Code='TEACHER_PART_TIME' THEN 'PART_TIME'
      ELSE 'FULL_TIME,PART_TIME,CONTRACTOR' END,0
 FROM dbo.Positions p JOIN dbo.Departments d ON d.DepartmentId=p.DepartmentId;
INSERT dbo.PositionPolicyRoles(PolicyId,RoleId)
 SELECT PolicyId,2 FROM dbo.PositionAccessPolicies WHERE IsPublished=1;
GO
-- Cross-table ownership constraints supplement application validation.
CREATE TRIGGER dbo.trg_GrantSources_Validate ON dbo.UserRoleGrantSources AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted s JOIN dbo.UserRoles g ON g.UserRoleId=s.UserRoleId
   LEFT JOIN dbo.StaffAppointments a ON a.AppointmentId=s.AppointmentId
   LEFT JOIN dbo.PositionAccessPolicies p ON p.PolicyId=s.PolicyId
   WHERE s.EndedAt IS NULL AND s.Kind='APPOINTMENT' AND
    (a.UserId<>g.UserId OR a.DepartmentId<>g.DepartmentId OR g.ScopeType<>'DEPARTMENT'
      OR a.PolicyId<>s.PolicyId OR p.PositionId<>a.PositionId OR a.ValidTo IS NOT NULL
      OR NOT EXISTS(SELECT 1 FROM dbo.PositionPolicyRoles r WHERE r.PolicyId=s.PolicyId AND r.RoleId=g.RoleId)))
  THROW 51250,'Grant source must match its user, department, appointment and position policy.',1;
END;
GO

CREATE FUNCTION dbo.IsEffectiveUserRole(@UserRoleId bigint)
RETURNS bit AS
BEGIN
 RETURN CASE WHEN EXISTS(SELECT 1 FROM dbo.UserRoles g JOIN dbo.Users u ON u.UserId=g.UserId
  WHERE g.UserRoleId=@UserRoleId AND g.RevokedAt IS NULL AND
   (u.StaffAccessManaged=0 OR g.RoleId IN(1,3,4) OR EXISTS(
    SELECT 1 FROM dbo.UserRoleGrantSources s LEFT JOIN dbo.StaffAppointments a ON a.AppointmentId=s.AppointmentId
    WHERE s.UserRoleId=g.UserRoleId AND s.EndedAt IS NULL AND
     (s.Kind='EXCEPTION' OR (s.Kind='APPOINTMENT' AND a.ValidTo IS NULL AND a.PolicyId=s.PolicyId))))) THEN 1 ELSE 0 END;
END;
GO
ALTER FUNCTION dbo.HasAcademicPermission(@UserId int,@Code varchar(80),@DepartmentId int)
RETURNS bit AS
BEGIN
 RETURN CASE WHEN EXISTS (
 SELECT 1 FROM dbo.UserRoles ur JOIN dbo.Users u ON u.UserId=ur.UserId
 JOIN dbo.RolePermissions rp ON rp.RoleId=ur.RoleId JOIN dbo.Permissions p ON p.PermissionId=rp.PermissionId
 WHERE ur.UserId=@UserId AND dbo.IsEffectiveUserRole(ur.UserRoleId)=1 AND u.Status='Active' AND u.ActivationPending=0 AND p.Code=@Code
 AND (ur.ScopeType='GLOBAL' OR ur.DepartmentId=@DepartmentId)) THEN 1 ELSE 0 END;
END;
GO
