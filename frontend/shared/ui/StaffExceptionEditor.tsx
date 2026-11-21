import { useState } from 'react';
import { adminRequest } from '../api-client/adminUsers';
import type { Detail, PositionPolicy, StaffPreview } from '../api-client/adminUsers';
import { StaffAccessPreview } from './StaffAccessForms';
import { userRoleLabels } from './adminUserAudit';

export function StaffExceptionEditor({ detail, policies, reload }: { detail: Detail; policies: PositionPolicy[]; reload: () => void }) {
  const [roleId, setRoleId] = useState(2);
  const [departmentId, setDepartmentId] = useState(() => String(detail.staffAccess.appointments.find(appointment => !appointment.validTo)?.departmentId
    ?? policies.find(policy => policy.isActive)?.departmentId ?? ''));
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState<StaffPreview>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const departments = [...new Map(policies.filter(policy => policy.isActive).map(policy => [policy.departmentId, policy.department])).entries()];
  const path = `/users/${detail.user.userId}/staff-access/exceptions`;
  const body = { version: detail.user.version, grant: {roleId,scopeType:departmentId?'DEPARTMENT':'GLOBAL',departmentId:departmentId?Number(departmentId):null},reason };
  async function run(save: boolean) {
    setBusy(true);setError('');
    try { if(save){await adminRequest(path,body);reload();}else setPreview(await adminRequest<StaffPreview>(`${path}/preview`,body)); }
    catch(failure){setError(failure instanceof Error?failure.message:'Không thể xử lý quyền bổ sung.');}
    finally{setBusy(false);}
  }
  return <details><summary>Quyền bổ sung ngoài chức danh</summary>
    <p>Dùng cho phân công đặc biệt có lý do. Khi cần công tác tại chức danh khác, hãy thêm kiêm nhiệm.</p>
    <fieldset disabled={busy}><div className="users-fields"><label>Vai trò bổ sung<select value={roleId} onChange={event=>{setRoleId(Number(event.target.value));setPreview(undefined);}}>
      {[2,5,6].map(role=><option key={role} value={role}>{userRoleLabels[role]}</option>)}</select></label>
      <label>Phạm vi<select value={departmentId} onChange={event=>{setDepartmentId(event.target.value);setPreview(undefined);}}>
        <option value="">Toàn hệ thống</option>{departments.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label></div>
      <label>Lý do cụ thể<textarea required maxLength={500} value={reason} onChange={event=>{setReason(event.target.value);setPreview(undefined);}}/></label>
      <button type="button" disabled={!reason.trim()} onClick={()=>void run(false)}>Xem trước quyền bổ sung</button></fieldset>
    {error&&<p role="alert" className="users-error">{error}</p>}
    {preview&&<><StaffAccessPreview preview={preview} policies={policies}/><button type="button" disabled={busy} onClick={()=>void run(true)}>Xác nhận cấp quyền bổ sung</button></>}
  </details>;
}
