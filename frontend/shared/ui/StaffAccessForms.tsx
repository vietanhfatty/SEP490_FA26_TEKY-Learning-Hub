import type { AppointmentInput, Grant, PositionPolicy, StaffPreview } from '../api-client/adminUsers';
import { userRoleLabels } from './adminUserAudit';

import { employmentLabels, emptyAppointment } from './staffAccessOptions';

export function AppointmentFields({ value, policies, onChange, disabled = false }: {
  value: AppointmentInput; policies: PositionPolicy[]; onChange: (value: AppointmentInput) => void; disabled?: boolean;
}) {
  const departments = [...new Map(policies.filter(policy => policy.isActive).map(policy => [policy.departmentId, policy.department])).entries()];
  const position = policies.find(policy => policy.positionId === value.positionId);
  const employmentTypes = position?.activeEmploymentTypes ?? [];
  return <div className="staff-appointment-fields">
    <div className="users-fields">
      <label>Phòng ban<select disabled={disabled} value={value.departmentId || ''}
        onChange={event => onChange({ ...emptyAppointment, departmentId: Number(event.target.value) })}>
        <option value="">Chọn phòng ban</option>{departments.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select></label>
      <label>Chức danh<select disabled={disabled || !value.departmentId} value={value.positionId || ''} onChange={event => {
        const next = policies.find(policy => policy.positionId === Number(event.target.value));
        onChange({ ...value, positionId: next?.positionId ?? 0, policyVersion: next?.activeVersion ?? 0,
          employmentType: next?.activeEmploymentTypes?.[0] ?? 'FULL_TIME' });
      }}>
        <option value="">{value.departmentId ? 'Chọn chức danh' : 'Chọn phòng ban trước'}</option>
        {policies.filter(policy => policy.isActive && policy.departmentId === value.departmentId).map(policy =>
          <option key={policy.positionId} value={policy.positionId} disabled={!policy.activeVersion}>{policy.position}{!policy.activeVersion ? ' · Cần cấu hình quyền' : ''}</option>)}
      </select></label>
      <label>Loại hình làm việc<select disabled={disabled || !value.positionId} value={value.employmentType}
        onChange={event => onChange({ ...value, employmentType: event.target.value })}>
        {(employmentTypes.length ? employmentTypes : ['FULL_TIME']).map(type => <option key={type} value={type}>{employmentLabels[type]}</option>)}
      </select></label>
    </div>
    {position?.activeVersion && <p className="staff-derived-roles"><strong>Vai trò được cấp:</strong> {position.activeRoleIds?.map(role => userRoleLabels[role]).join(', ')}<br />
      <strong>Phạm vi:</strong> {position.department}</p>}
    {value.departmentId > 0 && !policies.some(policy => policy.isActive && policy.departmentId === value.departmentId && policy.activeVersion) &&
      <p className="users-error">Phòng ban chưa có chức danh được cấu hình quyền. Hãy cấu hình tại “Phòng ban & Chức danh”.</p>}
  </div>;
}

export function GrantList({ grants, policies, departments }: { grants: Grant[]; policies: PositionPolicy[]; departments?: { id: number; name: string }[] }) {
  if (!grants.length) return <p>Không còn quyền truy cập.</p>;
  const departmentName = (id: number | null) => departments?.find(department => department.id === id)?.name
    ?? policies.find(policy => policy.departmentId === id)?.department ?? 'Phòng ban được cấp';
  return <ul className="staff-grant-list">{grants.map(grant => <li key={`${grant.roleId}-${grant.scopeType}-${grant.departmentId}`}>
    <strong>{userRoleLabels[grant.roleId]}</strong><span>{grant.scopeType === 'GLOBAL' ? 'Toàn hệ thống' : departmentName(grant.departmentId)}</span>
  </li>)}</ul>;
}

export function StaffAccessPreview({ preview, policies }: { preview: StaffPreview; policies: PositionPolicy[] }) {
  return <div className="staff-access-preview" role="status">
    <h4>Quyền trước và sau thay đổi</h4>
    <div className="staff-access-columns"><div><h5>Hiện tại</h5><GrantList grants={preview.before} policies={policies} /></div>
      <div><h5>Sau khi lưu</h5><GrantList grants={preview.after} policies={policies} /></div></div>
    {preview.warnings.map(warning => <p className="staff-access-warning" key={warning}>{warning}</p>)}
  </div>;
}
