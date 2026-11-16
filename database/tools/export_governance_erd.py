"""Export the actual SQL Server PK/FK metadata to Mermaid. Read-only; Windows auth."""
import argparse
import json
import subprocess
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--server', default=r'.\SQLEXPRESS')
parser.add_argument('--database', default='Teky_Learning_Hub')
args = parser.parse_args()
groups = [
    ('Nhân sự và phân quyền', ['Users', 'Roles', 'Departments', 'Positions', 'StaffAppointments', 'Permissions', 'RolePermissions', 'UserRoles']),
    ('Nội dung và phiên bản', ['Users', 'Departments', 'Courses', 'Lessons', 'LessonMaterials', 'Contents', 'ContentVersions', 'ContentAssignments', 'ContentComments']),
    ('Xét duyệt và công bố', ['Users', 'Departments', 'Contents', 'ContentVersions', 'ApprovalRounds', 'ApprovalParticipants', 'ApprovalDecisions', 'ContentPublications', 'AuditLogs']),
]
names = sorted({name for _, group in groups for name in group})
query = """SET NOCOUNT ON;
SELECT t.name AS name,
 JSON_QUERY((SELECT c.name,ty.name AS type,c.is_nullable AS nullable,
 CASE WHEN EXISTS(SELECT 1 FROM sys.index_columns ic JOIN sys.indexes ix ON ix.object_id=ic.object_id AND ix.index_id=ic.index_id WHERE ic.object_id=t.object_id AND ic.column_id=c.column_id AND ix.is_primary_key=1) THEN 1 ELSE 0 END AS pk,
 CASE WHEN EXISTS(SELECT 1 FROM sys.foreign_key_columns f WHERE f.parent_object_id=t.object_id AND f.parent_column_id=c.column_id) THEN 1 ELSE 0 END AS fk
 FROM sys.columns c JOIN sys.types ty ON ty.user_type_id=c.user_type_id WHERE c.object_id=t.object_id ORDER BY c.column_id FOR JSON PATH)) AS columns,
 JSON_QUERY((SELECT fk.name,OBJECT_NAME(fk.referenced_object_id) AS parent,
 JSON_QUERY((SELECT COL_NAME(f.parent_object_id,f.parent_column_id) AS child,COL_NAME(f.referenced_object_id,f.referenced_column_id) AS parent,
 COLUMNPROPERTY(f.parent_object_id,COL_NAME(f.parent_object_id,f.parent_column_id),'AllowsNull') AS nullable
 FROM sys.foreign_key_columns f WHERE f.constraint_object_id=fk.object_id ORDER BY f.constraint_column_id FOR JSON PATH)) AS columns
 FROM sys.foreign_keys fk WHERE fk.parent_object_id=t.object_id FOR JSON PATH)) AS foreignKeys,
 JSON_QUERY((SELECT ix.name,ix.has_filter AS filtered,JSON_QUERY((SELECT COL_NAME(ic.object_id,ic.column_id) AS name FROM sys.index_columns ic
 WHERE ic.object_id=ix.object_id AND ic.index_id=ix.index_id AND ic.is_included_column=0 ORDER BY ic.key_ordinal FOR JSON PATH)) AS columns
 FROM sys.indexes ix WHERE ix.object_id=t.object_id AND ix.is_unique=1 FOR JSON PATH)) AS uniqueKeys
FROM sys.tables t WHERE SCHEMA_NAME(t.schema_id)='dbo' AND t.name IN (""" + ','.join("'" + n + "'" for n in names) + ") ORDER BY t.name FOR JSON PATH;"
result = subprocess.run(['sqlcmd', '-S', args.server, '-E', '-C', '-d', args.database,
                         '-b', '-y', '0', '-w', '65535', '-f', '65001', '-Q', query],
                        capture_output=True, encoding='utf-8')
if result.returncode:
    raise SystemExit(result.stderr or result.stdout)
# FOR JSON returns long documents in chunks; sqlcmd adds physical line breaks
# between those chunks, sometimes inside a JSON string. SQL encodes actual
# newlines in column values as escape sequences, so join only physical lines.
tables = {table['name']: table for table in json.loads(''.join(result.stdout.splitlines()))}
if set(tables) != set(names):
    raise SystemExit(f'Missing migrated tables: {set(names) - set(tables)}')
lines = ['# ERD phân quyền và quản trị nội dung LMS TEKY', '',
         'Sinh trực tiếp từ metadata SQL Server sau migration; chỉ bao gồm phần chuyên môn và các bảng LMS liên quan.', '',
         '`PK`: khóa chính; `FK`: khóa ngoại; các cột PK trong cùng bảng tạo khóa chính ghép. `nullable`: có thể để trống.',
         'Đường nối ghi cột FK và cột được tham chiếu; thứ tự tương ứng với khóa ghép. Bảng xuất hiện lại ở nhiều sơ đồ để dễ đọc.', '',
         '`Users.PrimaryRoleId` chỉ chọn giao diện mặc định. Phân quyền thực tế dùng `UserRoles`, `RolePermissions`, phạm vi và phân công.', '']
for heading, group in groups:
    lines += ['## ' + heading, '', '```mermaid', 'erDiagram']
    for name in group:
        lines.append('    ' + name + ' {')
        for col in tables[name]['columns']:
            markers = ', '.join(k for k, flag in [('PK', col['pk']), ('FK', col['fk'])] if flag)
            note = ' "nullable"' if col['nullable'] else ''
            lines.append(f"        {col['type']} {col['name']}" + (' ' + markers if markers else '') + note)
        lines.append('    }')
    for name in group:
        for fk in tables[name].get('foreignKeys', []):
            if fk['parent'] not in group:
                continue
            parent = '|o' if any(c['nullable'] for c in fk['columns']) else '||'
            child_columns = {c['child'] for c in fk['columns']}
            unique = any(not key['filtered'] and {c['name'] for c in key['columns']} <= child_columns for key in tables[name].get('uniqueKeys', []))
            child = 'o|' if unique else 'o{'
            label = ', '.join(c['child'] for c in fk['columns']) + ' -> ' + ', '.join(c['parent'] for c in fk['columns'])
            lines.append(f"    {fk['parent']} {parent}--{child} {name} : \"{label}\"")
    lines += ['```', '']
lines += ['Quan hệ qua unique filtered index chỉ duy nhất trong điều kiện index (ví dụ grant chưa thu hồi).', '',
          'Xem [hướng dẫn migration và ràng buộc nghiệp vụ](academic-governance.md).', '']
target = Path(__file__).resolve().parents[1] / 'academic-governance-erd.md'
target.write_text('\n'.join(lines), encoding='utf-8')
print(f'Exported {len(names)} physical tables and their PK/FK relationships to {target}')
