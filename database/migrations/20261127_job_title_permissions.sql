--- Job titles carry their own permission set instead of borrowing the system role permission bundle.
--- The system roles stay fixed (Student, Teacher, SystemAdmin, Parent, AcademicStaff, AcademicManager);
--- only the permission list attached to a job title becomes configurable.
SET XACT_ABORT ON;
GO
IF OBJECT_ID('dbo.PositionPolicyPermissions','U') IS NULL
BEGIN
    CREATE TABLE dbo.PositionPolicyPermissions (
        PolicyId bigint NOT NULL REFERENCES dbo.PositionAccessPolicies(PolicyId),
        PermissionId int NOT NULL REFERENCES dbo.Permissions(PermissionId),
        CONSTRAINT PK_PositionPolicyPermissions PRIMARY KEY(PolicyId,PermissionId)
    );
    CREATE INDEX IX_PositionPolicyPermissions_Permission ON dbo.PositionPolicyPermissions(PermissionId);
END;
GO
--- Keep the effective permission set unchanged: every policy inherits the permission bundle
--- of the system roles it references, so no grant changes meaning after this migration.
INSERT dbo.PositionPolicyPermissions(PolicyId, PermissionId)
SELECT pr.PolicyId, rp.PermissionId
FROM dbo.PositionPolicyRoles pr
JOIN dbo.RolePermissions rp ON rp.RoleId = pr.RoleId
WHERE NOT EXISTS (SELECT 1 FROM dbo.PositionPolicyPermissions existing
                  WHERE existing.PolicyId = pr.PolicyId AND existing.PermissionId = rp.PermissionId);
GO
--- The grant source must point at a policy that actually grants the role it references.
CREATE OR ALTER TRIGGER dbo.trg_GrantSources_Validate ON dbo.UserRoleGrantSources AFTER INSERT,UPDATE AS
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
--- Effective permission = the system role bundle UNION the permission list the job title declares.
--- A grant without any live source falls back to the role bundle alone.
CREATE OR ALTER FUNCTION dbo.HasAcademicPermission(@UserId int,@Code varchar(80),@DepartmentId int)
RETURNS bit AS
BEGIN
    RETURN CASE WHEN EXISTS (
        SELECT 1 FROM dbo.UserRoles ur
        JOIN dbo.Users u ON u.UserId=ur.UserId
        JOIN dbo.Permissions p ON p.Code=@Code
        LEFT JOIN dbo.RolePermissions rp ON rp.RoleId=ur.RoleId AND rp.PermissionId=p.PermissionId
        LEFT JOIN dbo.UserRoleGrantSources s ON s.UserRoleId=ur.UserRoleId AND s.EndedAt IS NULL
        LEFT JOIN dbo.PositionPolicyPermissions ppp ON ppp.PolicyId=s.PolicyId AND ppp.PermissionId=p.PermissionId
        WHERE ur.UserId=@UserId AND ur.RevokedAt IS NULL AND u.Status='Active'
          AND dbo.IsEffectiveUserRole(ur.UserRoleId)=1
          AND (rp.PermissionId IS NOT NULL OR ppp.PermissionId IS NOT NULL)
          AND (ur.ScopeType='GLOBAL' OR ur.DepartmentId=@DepartmentId)) THEN 1 ELSE 0 END;
END;
GO
