-- Preview by default. Set @Apply=1 only after reviewing the result sets.
-- Classify accounts by PrimaryRoleId; never delete profiles or business links.
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
DECLARE @Apply bit=0, @Now datetime2=SYSUTCDATETIME(), @LockResult int;
BEGIN TRANSACTION;
EXEC @LockResult=sys.sp_getapplock @Resource=N'Teky.UserAdministration',
 @LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=15000;
IF @LockResult<0 THROW 51201,'Cannot acquire user administration lock.',1;

SELECT u.UserId,u.Email,u.PrimaryRoleId,
 (SELECT g.RoleId,g.ScopeType,g.DepartmentId FROM dbo.UserRoles g
  WHERE g.UserId=u.UserId AND g.RevokedAt IS NULL FOR JSON PATH) AS BeforeRoles
INTO #Affected FROM dbo.Users u
WHERE EXISTS (SELECT 1 FROM dbo.UserRoles g WHERE g.UserId=u.UserId AND g.RevokedAt IS NULL AND
 ((u.PrimaryRoleId IN (1,4) AND (g.RoleId<>u.PrimaryRoleId OR g.ScopeType<>'GLOBAL')) OR
  (u.PrimaryRoleId IN (2,3,5,6) AND g.RoleId IN (1,4))))
 OR (u.PrimaryRoleId IN (1,4) AND NOT EXISTS(SELECT 1 FROM dbo.UserRoles g
  WHERE g.UserId=u.UserId AND g.RoleId=u.PrimaryRoleId AND g.ScopeType='GLOBAL' AND g.RevokedAt IS NULL));
SELECT * FROM #Affected;
SELECT a.* FROM dbo.StaffAppointments a JOIN dbo.Users u ON u.UserId=a.UserId
 WHERE u.PrimaryRoleId IN (1,4) AND a.ValidTo IS NULL;
-- Report historical teacher/business links for manual review, without removing them.
SELECT u.UserId,u.Email,t.TeacherCode FROM dbo.Users u
 JOIN dbo.TeacherProfiles t ON t.UserId=u.UserId WHERE u.PrimaryRoleId IN (1,4);
IF @Apply=0 BEGIN ROLLBACK; RETURN; END;

UPDATE g SET RevokedAt=@Now FROM dbo.UserRoles g JOIN #Affected u ON u.UserId=g.UserId
WHERE g.RevokedAt IS NULL AND
 ((u.PrimaryRoleId IN (1,4) AND (g.RoleId<>u.PrimaryRoleId OR g.ScopeType<>'GLOBAL')) OR
  (u.PrimaryRoleId IN (2,3,5,6) AND g.RoleId IN (1,4)));
INSERT dbo.UserRoles(UserId,RoleId,ScopeType)
 SELECT u.UserId,u.PrimaryRoleId,'GLOBAL' FROM #Affected u WHERE u.PrimaryRoleId IN (1,4)
 AND NOT EXISTS(SELECT 1 FROM dbo.UserRoles g WHERE g.UserId=u.UserId
 AND g.RoleId=u.PrimaryRoleId AND g.ScopeType='GLOBAL' AND g.RevokedAt IS NULL);
UPDATE u SET SecurityVersion=SecurityVersion+1,AdministrationVersion=AdministrationVersion+1,UpdatedAt=@Now
 FROM dbo.Users u JOIN #Affected a ON a.UserId=u.UserId;
UPDATE s SET IsActive=0,LogoutAt=@Now FROM dbo.UserSessions s JOIN #Affected a ON a.UserId=s.UserId WHERE s.IsActive=1;
UPDATE o SET UsedAt=@Now FROM dbo.PasswordResetOtps o JOIN #Affected a ON a.UserId=o.UserId WHERE o.UsedAt IS NULL;
INSERT dbo.AuditLogs(ActorType,Action,EntityType,EntityId,OldValue,NewValue,CreatedAt)
 SELECT 'System','ACCOUNT_ROLES_REPAIRED','User',CONVERT(nvarchar(40),u.UserId),u.BeforeRoles,
 (SELECT g.RoleId,g.ScopeType,g.DepartmentId FROM dbo.UserRoles g
 WHERE g.UserId=u.UserId AND g.RevokedAt IS NULL FOR JSON PATH),@Now FROM #Affected u;
COMMIT;
