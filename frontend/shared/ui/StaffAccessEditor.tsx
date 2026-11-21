import { useState } from 'react';
import { adminRequest } from '../api-client/adminUsers';
import type { AppointmentInput, Detail, PositionPolicy, StaffChange, StaffPreview, StaffReconcile } from '../api-client/adminUsers';
import { AppointmentFields, StaffAccessPreview } from './StaffAccessForms';
import { emptyAppointment, employmentLabels } from './staffAccessOptions';
import { userRoleLabels } from './adminUserAudit';
import { StaffExceptionEditor } from './StaffExceptionEditor';

export function StaffAccessEditor({ detail, policies, reload }: { detail: Detail; policies: PositionPolicy[]; reload: () => void }) {
  const { user, staffAccess } = detail;
  const [reconciling, setReconciling] = useState(staffAccess.needsReconciliation);
  const [appointments, setAppointments] = useState<AppointmentInput[]>([]);
  const [candidate, setCandidate] = useState<AppointmentInput>(emptyAppointment);
  const [endId, setEndId] = useState<number>();
  const [transfer, setTransfer] = useState(false);
  const [retainIds, setRetainIds] = useState<number[]>([]);
  const [reason, setReason] = useState('');
  const [disableAccess, setDisableAccess] = useState(false);
  const [primary, setPrimary] = useState(user.primaryRoleId);
  const [pending, setPending] = useState<{ body: StaffChange | StaffReconcile; path: string; preview: StaffPreview }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const active = staffAccess.appointments.filter(appointment => !appointment.validTo);
  function resetPreview() { setPending(undefined); setError(''); }
  async function preview() {
    setBusy(true); setError(''); setPending(undefined);
    try {
      const path = `/users/${user.userId}/staff-access${reconciling ? '/reconcile' : ''}`;
      const body: StaffChange | StaffReconcile = reconciling
        ? { version: user.version, appointments, retainGrantIds: retainIds, reason, disableAccess, primaryRoleId: primary }
        : { version: user.version, endAppointmentId: endId, appointment: !endId || transfer ? candidate : undefined, reason, disableAccess, primaryRoleId: primary };
      const result = await adminRequest<StaffPreview>(`${path}/preview`, body);
      const nextPrimary = result.availablePrimaryRoles.includes(primary) ? primary : result.availablePrimaryRoles[0];
      setPrimary(nextPrimary ?? primary);
      setPending({ path, body: { ...body, primaryRoleId: nextPrimary }, preview: result });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Không thể xem trước quyền.'); }
    finally { setBusy(false); }
  }
  async function save() {
    if (!pending) return;
    setBusy(true); setError('');
    try { await adminRequest(pending.path, pending.body); reload(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Không thể lưu bổ nhiệm.'); }
    finally { setBusy(false); }
  }
  return <section className="staff-access-editor" aria-labelledby="staff-assignments-title">
    <h3 id="staff-assignments-title">Phòng ban, chức danh và quyền</h3>
    <p>Chọn chức danh để hệ thống cấp đúng vai trò và phạm vi. Kết thúc bổ nhiệm sẽ thu hồi phần quyền do bổ nhiệm đó cấp.</p>
    {staffAccess.needsReconciliation && <p className="staff-access-warning" role="status">Cần đối soát vai trò và chức danh. Quyền cũ được giữ đến khi bạn xem trước và xác nhận phương án bên dưới.</p>}
    {!active.length ? <p>Chưa có bổ nhiệm đang hiệu lực.</p> : <ul className="staff-appointments">{active.map(appointment => <li key={appointment.appointmentId}>
      <strong>{appointment.position}</strong><small>{appointment.department} · {employmentLabels[appointment.employmentType]}</small>
      <p>{appointment.roleIds.length ? `Được cấp: ${appointment.roleIds.map(role => userRoleLabels[role]).join(', ')}` : 'Bổ nhiệm cũ chưa liên kết cấu hình quyền.'}</p>
      {!reconciling && <div className="users-actions"><button type="button" disabled={busy} onClick={() => { setEndId(appointment.appointmentId); setTransfer(true); resetPreview(); }}>Chuyển phòng/chức danh</button>
        <button type="button" disabled={busy} onClick={() => { setEndId(appointment.appointmentId); setTransfer(false); resetPreview(); }}>Kết thúc bổ nhiệm</button></div>}
    </li>)}</ul>}
    {!reconciling && <div className="users-actions">
      <button type="button" disabled={busy} onClick={() => { setEndId(undefined); setTransfer(false); resetPreview(); }}>Thêm kiêm nhiệm</button>
      <button type="button" disabled={busy} onClick={() => {
        setReconciling(true); setAppointments(active.filter(appointment => policies.some(policy => policy.positionId === appointment.positionId && policy.activeVersion)).map(appointment => ({
          departmentId: appointment.departmentId, positionId: appointment.positionId,
          policyVersion: policies.find(policy => policy.positionId === appointment.positionId)!.activeVersion!, employmentType: appointment.employmentType
        }))); resetPreview();
      }}>Đối soát bổ nhiệm và quyền bổ sung</button>
    </div>}
    <fieldset disabled={busy}>
      <h4>{reconciling ? 'Bổ nhiệm và quyền sẽ áp dụng' : endId ? transfer ? 'Chuyển sang chức danh mới' : 'Xác nhận kết thúc bổ nhiệm' : 'Thêm bổ nhiệm'}</h4>
      {reconciling && <>
        <p>Chọn lại các bổ nhiệm đúng. Quyền cũ không được giữ hoặc cấp từ bổ nhiệm mới sẽ được thu hồi.</p>
        <ul className="staff-appointments">{appointments.map((appointment, index) => <li key={`${appointment.positionId}-${index}`}>
          <span>{policies.find(policy => policy.positionId === appointment.positionId)?.position} · {policies.find(policy => policy.positionId === appointment.positionId)?.department}</span>
          <button type="button" onClick={() => { setAppointments(items => items.filter((_, i) => i !== index)); resetPreview(); }}>Bỏ</button>
        </li>)}</ul>
      </>}
      {(reconciling || !endId || transfer) && <AppointmentFields value={candidate} policies={policies} onChange={value => { setCandidate(value); resetPreview(); }} />}
      {reconciling && <>
        <button type="button" disabled={!candidate.positionId || appointments.some(appointment => appointment.positionId === candidate.positionId)}
          onClick={() => { setAppointments(items => [...items, candidate]); setCandidate(emptyAppointment); resetPreview(); }}>Thêm chức danh vào phương án</button>
        <h4>Quyền cũ cần giữ bổ sung</h4><p>Chỉ chọn quyền cần giữ ngoài chức danh và ghi rõ lý do. Quyền quản trị hệ thống được giữ riêng.</p>
        {user.roles.filter(grant => !grant.revokedAt && grant.roleId !== 3).map(grant => <label className="staff-checkbox" key={grant.grantId}>
          <input type="checkbox" checked={retainIds.includes(grant.grantId!)} onChange={event => {
            setRetainIds(items => event.target.checked ? [...items, grant.grantId!] : items.filter(id => id !== grant.grantId)); resetPreview();
          }} />{userRoleLabels[grant.roleId]} · {grant.scopeType === 'GLOBAL' ? 'Toàn hệ thống' : policies.find(policy => policy.departmentId === grant.departmentId)?.department || 'Phòng ban được cấp'}
        </label>)}
      </>}
      <label>Lý do{reconciling ? ' đối soát' : ' thay đổi'}<textarea maxLength={500} required={reconciling} value={reason} onChange={event => { setReason(event.target.value); resetPreview(); }} /></label>
      <label className="staff-checkbox"><input type="checkbox" checked={disableAccess} onChange={event => { setDisableAccess(event.target.checked); resetPreview(); }} />
        Ngừng truy cập nếu không còn quyền nào sau thay đổi</label>
      <div className="users-actions"><button type="button" disabled={busy || reconciling && !reason.trim()} onClick={() => void preview()}>{busy ? 'Đang xử lý…' : 'Xem trước quyền'}</button>
        {!staffAccess.needsReconciliation && reconciling && <button type="button" onClick={() => { setReconciling(false); resetPreview(); }}>Hủy đối soát</button>}</div>
    </fieldset>
    {error && <p role="alert" className="users-error">{error}</p>}
    {pending && <>
      <StaffAccessPreview preview={pending.preview} policies={policies} />
      {pending.preview.availablePrimaryRoles.length > 0 && <label>Trang mở sau đăng nhập<select value={pending.body.primaryRoleId} disabled={busy} onChange={event => {
        const role = Number(event.target.value); setPrimary(role); setPending({ ...pending, body: { ...pending.body, primaryRoleId: role } });
      }}>{pending.preview.availablePrimaryRoles.map(role => <option key={role} value={role}>{userRoleLabels[role]}</option>)}</select></label>}
      <button type="button" className="users-primary" disabled={busy || !pending.preview.after.length && !disableAccess} onClick={() => void save()}>Xác nhận áp dụng</button>
    </>}
    <details><summary>Lịch sử bổ nhiệm</summary><ul>{staffAccess.appointments.filter(appointment => appointment.validTo).map(appointment =>
      <li key={appointment.appointmentId}>{appointment.position} · {appointment.department} · Kết thúc {new Date(appointment.validTo!).toLocaleString('vi-VN')}</li>)}</ul></details>
    {!staffAccess.needsReconciliation && <StaffExceptionEditor detail={detail} policies={policies} reload={reload}/>}
  </section>;
}
