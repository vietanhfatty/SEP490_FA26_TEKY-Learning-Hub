--- A job title declares its own permission list, but the account still has to be activated
--- before any permission takes effect. This keeps the pending invitation state authoritative.
SET XACT_ABORT ON;
GO
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
        WHERE ur.UserId=@UserId AND ur.RevokedAt IS NULL AND u.Status='Active' AND u.ActivationPending=0
          AND dbo.IsEffectiveUserRole(ur.UserRoleId)=1
          AND (rp.PermissionId IS NOT NULL OR ppp.PermissionId IS NOT NULL)
          AND (ur.ScopeType='GLOBAL' OR ur.DepartmentId=@DepartmentId)) THEN 1 ELSE 0 END;
END;
GO
