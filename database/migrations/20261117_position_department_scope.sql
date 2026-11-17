--- Scope every job title (chức danh) to one department (phòng ban).
--- dbo.Positions becomes a per-department catalogue so admin can group accounts by department.
--- Batches are separated by GO so each DDL step is compiled against the schema it produces.
SET XACT_ABORT ON;
GO
--- 1. Add the department link. Nullable first so existing rows survive the backfill.
IF COL_LENGTH('dbo.Positions', 'DepartmentId') IS NULL
    EXEC(N'ALTER TABLE dbo.Positions ADD DepartmentId int NULL REFERENCES dbo.Departments(DepartmentId);');
GO
--- 2. Guarantee a fallback department for rows that have no explicit owner.
IF NOT EXISTS (SELECT 1 FROM dbo.Departments WHERE Code = 'ACADEMIC')
    INSERT dbo.Departments(Code, Name) VALUES ('ACADEMIC', N'Phòng chuyên môn');
GO
--- 3. Backfill every orphaned position into the academic department.
UPDATE p SET DepartmentId = (SELECT MIN(DepartmentId) FROM dbo.Departments WHERE Code = 'ACADEMIC')
FROM dbo.Positions p
WHERE p.DepartmentId IS NULL;
GO
--- 4. The link is mandatory from now on.
IF EXISTS (SELECT 1 FROM dbo.Positions WHERE DepartmentId IS NULL)
    THROW 51200, 'Every position must belong to a department before scoping positions.', 1;
GO
--- 5. Tighten the column to NOT NULL. ALTER COLUMN cannot run inside an IF block.
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Positions') AND name = 'DepartmentId' AND is_nullable = 1)
    EXEC(N'ALTER TABLE dbo.Positions ALTER COLUMN DepartmentId int NOT NULL;');
GO
--- 6. A code is unique inside its department. The global unique constraint on Code is
---    dropped so two departments may reuse the same short code. The constraint name is
---    system-generated, so it is resolved from sys.indexes instead of hard-coded.
DECLARE @codeIndex nvarchar(128);
SELECT @codeIndex = i.name
FROM sys.indexes i
JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
WHERE i.object_id = OBJECT_ID('dbo.Positions') AND i.is_unique = 1 AND i.is_primary_key = 0
  AND c.name = 'Code' AND i.name <> 'UX_Positions_Department_Code';

IF @codeIndex IS NOT NULL
    EXEC(N'ALTER TABLE dbo.Positions DROP CONSTRAINT ' + @codeIndex + N';');
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.Positions') AND name = 'UX_Positions_Department_Code')
    EXEC(N'CREATE UNIQUE INDEX UX_Positions_Department_Code ON dbo.Positions(DepartmentId, Code);');
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.Positions') AND name = 'IX_Positions_Department')
    EXEC(N'CREATE INDEX IX_Positions_Department ON dbo.Positions(DepartmentId, IsActive, Name);');
