SET XACT_ABORT ON;
BEGIN TRANSACTION;
-- Courses.Status lifecycle: Draft -> Published -> Archived (Active is kept for legacy seeded rows).
DECLARE @dropSql nvarchar(max) = N'';
SELECT @dropSql = @dropSql + N'ALTER TABLE dbo.Courses DROP CONSTRAINT ' + QUOTENAME(cc.name) + N';'
FROM sys.check_constraints cc
JOIN sys.tables t ON t.object_id = cc.parent_object_id
WHERE t.name = N'Courses' AND cc.definition LIKE N'%[Status]%';
IF LEN(@dropSql) > 0 EXEC sp_executesql @dropSql;

ALTER TABLE dbo.Courses WITH CHECK ADD CONSTRAINT CK_Courses_Status
    CHECK (Status IN (N'Draft', N'Published', N'Active', N'Archived'));
COMMIT;
