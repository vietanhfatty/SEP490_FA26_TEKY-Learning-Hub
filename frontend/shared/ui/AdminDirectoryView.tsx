import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { adminRequest, deleteDirectoryEntry, setDirectoryStatus } from '../api-client/adminUsers';
import type { Catalog, DepartmentFunction, DirectoryEntry, PermissionCatalog, PolicyRequest, PositionPolicy, PositionTemplate, StaffPreview } from '../api-client/adminUsers';
import './AdminDirectoryView.css';
import { GrantList } from './StaffAccessForms';
import { employmentLabels } from './staffAccessOptions';
import { userRoleLabels } from './adminUserAudit';
import { IconPlus, IconSearch } from './Icons';

type Kind = 'departments' | 'positions';
type Editor = { kind: Kind; entry?: DirectoryEntry };
type Tab = Kind;
const labels: Record<Kind, string> = { departments: 'phòng ban', positions: 'chức danh' };
const tabLabels: Record<Kind, string> = { departments: 'Phòng ban', positions: 'Chức vụ' };
const functionLabels: Record<DepartmentFunction, string> = { ACADEMIC: 'Chuyên môn', TRAINING: 'Quản lý đào tạo' };
const CUSTOM_TEMPLATE = 'CUSTOM';
const sameSet = <T,>(a: T[], b: T[]) => a.length === b.length && a.every(item => b.includes(item));
/** Template whose roles and permissions equal the given set, or CUSTOM. Same rule as the backend. */
function matchTemplate(templates: PositionTemplate[], roleIds: number[], permissionCodes: string[]): string {
  return templates.find(template => sameSet(template.roleIds, roleIds) && sameSet(template.permissionCodes, permissionCodes))?.code ?? CUSTOM_TEMPLATE;
}
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Không thể thực hiện thao tác. Vui lòng thử lại.';

/** Mirrors the backend rule: a position code is DEPT_NAME, for example ACADEMIC_GIAO_VIEN. */
function buildPositionCode(departmentCode: string, name: string): string {
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const suffix = normalized.replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, Math.max(4, 40 - departmentCode.length - 1)).replace(/_+$/, '');
  return `${departmentCode.toUpperCase()}_${suffix || 'POSITION'}`;
}

/** Groups the permission catalogue by its prefix so the checkbox list stays readable. */
function groupPermissions(permissions: PermissionCatalog[]): { prefix: string; items: PermissionCatalog[] }[] {
  const groups = new Map<string, PermissionCatalog[]>();
  for (const permission of permissions) {
    const prefix = permission.code.split('.')[0] || 'other';
    const bucket = groups.get(prefix);
    if (bucket) bucket.push(permission);
    else groups.set(prefix, [permission]);
  }
  return [...groups.entries()].map(([prefix, items]) => ({ prefix, items: items.sort((a, b) => a.code.localeCompare(b.code)) }));
}

const permissionGroupLabels: Record<string, string> = {
  content: 'Nội dung học tập', review: 'Duyệt & đánh giá', course: 'Khóa học',
  identity: 'Tài khoản & nhân sự', academic: 'Quản lý học thuật', system: 'Hệ thống',
  class: 'Lớp học', enrollment: 'Ghi danh', schedule: 'Lịch học', teacher: 'Phân công giáo viên', attendance: 'Điểm danh', report: 'Báo cáo',
};

export function AdminDirectoryView() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [policies, setPolicies] = useState<PositionPolicy[]>([]);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<Tab>('departments');
  const [query, setQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [positionDepartment, setPositionDepartment] = useState('');
  const [positionCode, setPositionCode] = useState('');
  const [positionName, setPositionName] = useState('');
  const [departmentFunction, setDepartmentFunction] = useState<DepartmentFunction>('ACADEMIC');
  const [policyDraft, setPolicyDraft] = useState<PolicyRequest>({version:0,roleIds:[],permissionCodes:[],employmentTypes:Object.keys(employmentLabels),publish:true,reason:''});
  const [policyPreview, setPolicyPreview] = useState<StaffPreview>();
  const [savingPolicy, setSavingPolicy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let current = true;
    Promise.all([adminRequest<Catalog>('/directory'),adminRequest<PositionPolicy[]>('/position-policies')]).then(([data,positionPolicies]) => { if (current) {setCatalog(data);setPolicies(positionPolicies);} })
      .catch(error => { if (current) setError(errorText(error)); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [revision]);

  function reload() { setLoading(true); setError(''); setRevision(value => value + 1); }

  function openEditor(kind: Kind, button: HTMLButtonElement, entry?: DirectoryEntry) {
    opener.current = button;
    setEditor({ kind, entry }); setFormError(''); setMessage('');
    setPositionDepartment(entry?.departmentId ? String(entry.departmentId) : '');
    setPositionCode(entry?.code ?? '');
    setPositionName(entry?.name ?? '');
    setDepartmentFunction(kind === 'departments' ? entry?.functionCode ?? 'ACADEMIC' : 'ACADEMIC');
    const policy=entry?policies.find(item=>item.positionId===entry.id):undefined;
    setPolicyDraft({version:policy?.version??0,roleIds:policy?.activeRoleIds??policy?.roleIds??[],
      permissionCodes:policy?.activePermissionCodes??policy?.permissionCodes??[],
      employmentTypes:policy?.activeEmploymentTypes??policy?.employmentTypes??Object.keys(employmentLabels),publish:true,reason:''});
    setPolicyPreview(undefined);
    dialog.current?.showModal();
  }
  function closeEditor() { dialog.current?.close(); }

  // Preview of the code the backend generates when the admin leaves the code field blank.
  const generatedPositionCode = useMemo(() => {
    if (editor?.kind !== 'positions' || positionCode.trim()) return '';
    const department = catalog?.departments.find(d => d.id === Number(positionDepartment));
    if (!department) return '';
    return buildPositionCode(department.code, positionName);
  }, [catalog, editor?.kind, positionCode, positionDepartment, positionName]);

  const editorTemplates = useMemo(() => {
    const department = catalog?.departments.find(d => d.id === Number(positionDepartment));
    return (catalog?.templates ?? []).filter(template => template.functionCode === (department?.functionCode ?? 'ACADEMIC'));
  }, [catalog, positionDepartment]);
  const draftTemplate = matchTemplate(editorTemplates, policyDraft.roleIds, policyDraft.permissionCodes);
  function applyTemplate(code: string) {
    const template = editorTemplates.find(item => item.code === code);
    if (!template) return;
    setPolicyDraft(draft => ({ ...draft, roleIds: [...template.roleIds], permissionCodes: [...template.permissionCodes] }));
    setPolicyPreview(undefined);
  }
  function templateLabel(policy: PositionPolicy | undefined) {
    if (!policy?.activeTemplateCode) return '';
    if (policy.activeTemplateCode === CUSTOM_TEMPLATE) return 'Tùy chỉnh';
    return catalog?.templates.find(template => template.functionCode === policy.departmentFunction && template.code === policy.activeTemplateCode)?.name ?? '';
  }

  const permissionGroups = useMemo(() => groupPermissions(catalog?.availablePermissions ?? []), [catalog]);
  const availableCodes = useMemo(() => new Set((catalog?.availablePermissions ?? []).map(item => item.code)), [catalog]);

  function togglePermission(code: string, checked: boolean) {
    setPolicyDraft(draft => ({...draft, permissionCodes: checked
      ? [...draft.permissionCodes.filter(item => item !== code), code]
      : draft.permissionCodes.filter(item => item !== code)}));
    setPolicyPreview(undefined);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || saving) return;
    const values = new FormData(event.currentTarget);
    const name = String(values.get('name') ?? '').trim();
    if (!name) { setFormError('Tên không được để trống.'); return; }
    const code = editor.entry?.code ?? (String(values.get('code') ?? '').trim() || generatedPositionCode);
    const departmentId = editor.kind === 'positions'
      ? Number(values.get('departmentId') ?? 0)
      : null;
    if (editor.kind === 'positions' && !departmentId) {
      setFormError('Vui lòng chọn phòng ban cho chức danh.'); return;
    }
    if (editor.kind === 'positions' && !policyDraft.roleIds.length) { setFormError('Chọn ít nhất một vai trò hệ thống để cấp quyền khi bổ nhiệm.'); return; }
    if (editor.kind === 'positions' && !policyDraft.permissionCodes.length) { setFormError('Chọn ít nhất một quyền cho chức danh.'); return; }
    if (editor.kind === 'positions' && !policyDraft.employmentTypes.length) { setFormError('Chọn ít nhất một loại hình làm việc.'); return; }
    if (editor.kind === 'positions' && editor.entry) {
      const current=policies.find(item=>item.positionId===editor.entry!.id);
      const policyChanged=!current?.activeVersion || JSON.stringify([...(current.activeRoleIds??[])].sort())!==JSON.stringify([...policyDraft.roleIds].sort()) ||
        JSON.stringify([...(current.activePermissionCodes??[])].sort())!==JSON.stringify([...policyDraft.permissionCodes].sort()) ||
        JSON.stringify([...(current.activeEmploymentTypes??[])].sort())!==JSON.stringify([...policyDraft.employmentTypes].sort());
      if (current?.activeAppointments && policyChanged && !policyPreview) {
        await previewPolicy();
        return;
      }
    }
    await saveAll(editor,code,name,departmentId);
  }

  async function previewPolicy() {
    if (editor?.kind!=='positions' || !editor.entry) return;
    setSavingPolicy(true);setFormError('');
    try {setPolicyPreview(await adminRequest<StaffPreview>(`/position-policies/${editor.entry.id}/preview`,{...policyDraft,publish:true}));}
    catch(failure){setFormError(errorText(failure));}
    finally{setSavingPolicy(false);}
  }

  async function saveAll(currentEditor:Editor,code:string,name:string,departmentId:number|null) {
    setSaving(true); setFormError(''); setError(''); setMessage('');
    try {
      if(currentEditor.kind==='positions') {
        await adminRequest(`/positions${currentEditor.entry ? `/${currentEditor.entry.id}` : ''}`,
          {code,name,departmentId,isActive:currentEditor.entry?.isActive??true,policy:{...policyDraft,publish:true}},
          currentEditor.entry ? 'PUT' : 'POST');
      } else {
        await adminRequest(`/directory/departments${currentEditor.entry ? `/${currentEditor.entry.id}` : ''}`,
          {code,name,isActive:currentEditor.entry?.isActive??true,functionCode:departmentFunction},currentEditor.entry ? 'PUT' : 'POST');
      }
      closeEditor(); setMessage(currentEditor.entry ? 'Đã lưu danh mục.' : 'Đã thêm danh mục.'); reload();
    } catch (failure) { setFormError(errorText(failure)); }
    finally { setSaving(false); }
  }

  async function toggle(kind: Kind, entry: DirectoryEntry) {
    const staffNote = entry.isActive && entry.activeAppointmentCount ? ` Còn ${entry.activeAppointmentCount} nhân sự đang được bổ nhiệm; họ vẫn giữ quyền hiện có nhưng không bổ nhiệm mới được.` : ' Các phân công hiện có được giữ nguyên.';
    if (saving || !window.confirm(`${entry.isActive ? 'Ngừng sử dụng' : 'Kích hoạt'} ${labels[kind]} “${entry.name}”?${staffNote}`)) return;
    setSaving(true); setError(''); setMessage('');
    try {
      await setDirectoryStatus(kind, entry.id, !entry.isActive);
      setMessage('Đã cập nhật trạng thái danh mục.'); reload();
    } catch (error) { setError(errorText(error)); }
    finally { setSaving(false); }
  }

  async function remove(kind: Kind, entry: DirectoryEntry) {
    if (saving) return;
    const reason = entry.deleteBlockedReason;
    if (!entry.canDelete) {
      setError(reason ? `Không thể xóa vì ${reason}. Hãy ngừng sử dụng thay vì xóa.` : 'Không thể xóa mục này vì đang được sử dụng.');
      return;
    }
    if (!window.confirm(`Xóa ${labels[kind]} “${entry.name}”? Thao tác này không thể hoàn tác.`)) return;
    setSaving(true); setError(''); setMessage('');
    try {
      await deleteDirectoryEntry(kind, entry.id);
      setMessage(`Đã xóa ${labels[kind]} “${entry.name}”.`); reload();
    } catch (error) { setError(errorText(error)); }
    finally { setSaving(false); }
  }

  const entries = (catalog?.[tab] ?? []).filter(entry => {
    const matchesQuery = `${entry.code} ${entry.name} ${entry.departmentName ?? ''}`.toLocaleLowerCase('vi')
      .includes(query.trim().toLocaleLowerCase('vi'));
    return matchesQuery && (tab !== 'positions' || !departmentFilter || entry.departmentId === Number(departmentFilter));
  });

  return <div className="directory-page">
    <header className="directory-heading"><h1>Phòng ban & chức vụ</h1></header>
    {message && <p className="directory-success" role="status">{message}</p>}
    {error && <div className="directory-error" role="alert">{error} <button disabled={loading || saving} onClick={reload}>Thử lại</button></div>}
    {loading && <p role="status">Đang tải danh mục…</p>}

    <div className="directory-tabs" role="tablist" aria-label="Danh mục phòng ban và chức vụ">
      {(['departments','positions'] as const).map(kind => <button key={kind} role="tab" id={`directory-tab-${kind}`}
        aria-selected={tab === kind} aria-controls={`directory-panel-${kind}`} tabIndex={tab === kind ? 0 : -1}
        className={`directory-tab${tab === kind ? ' is-active' : ''}`}
        onClick={() => {setTab(kind);setQuery('');setDepartmentFilter('');}}>
        {tabLabels[kind]}
        {catalog && <span className="directory-tab-count">{catalog[kind].length}</span>}
      </button>)}
    </div>

    {(['departments','positions'] as const).map(kind => <section key={kind} role="tabpanel" id={`directory-panel-${kind}`}
      aria-labelledby={`directory-tab-${kind}`} hidden={tab !== kind} aria-busy={loading}>
      <div className="directory-section-heading"><h2>{tabLabels[kind]}</h2>
        <button className="directory-primary" disabled={loading || saving || !catalog} onClick={event => openEditor(kind, event.currentTarget)}><IconPlus size={17} />Thêm {labels[kind]}</button></div>
      <div className="directory-filterbar">
        <label className="directory-search"><IconSearch size={17} /><span className="lms-sr-only">Tìm {labels[kind]}</span><input type="search" value={tab === kind ? query : ''} onChange={event => setQuery(event.target.value)} placeholder={`Tìm mã hoặc tên ${labels[kind]}`} disabled={loading || !catalog} /></label>
        {kind === 'positions' && <label className="directory-department-filter"><span className="lms-sr-only">Lọc phòng ban</span><select value={departmentFilter} onChange={event => setDepartmentFilter(event.target.value)} disabled={loading || !catalog}><option value="">Tất cả phòng ban</option>{catalog?.departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>}
        <span className="directory-result-count" role="status">{tab === kind ? entries.length : catalog?.[kind].length ?? 0} / {catalog?.[kind].length ?? 0} {labels[kind]}</span>
      </div>
      <div className="directory-table-wrap" role="region" aria-label={`Danh sách ${labels[kind]}`} tabIndex={0}><table className={`directory-table--${kind}`}>
        <caption className="lms-sr-only">Danh sách {labels[kind]}</caption>
        {kind === 'departments'
          ? <thead><tr><th scope="col">Mã</th><th scope="col">Tên</th><th scope="col">Chức năng</th><th scope="col">Số chức vụ</th><th scope="col">Nhân sự</th><th scope="col">Trạng thái</th><th scope="col">Thao tác</th></tr></thead>
          : <thead><tr><th scope="col">Mã</th><th scope="col">Tên</th><th scope="col">Phòng ban</th><th scope="col">Quyền</th><th scope="col">Loại hình</th><th scope="col">Nhân sự</th><th scope="col">Trạng thái</th><th scope="col">Thao tác</th></tr></thead>}
        <tbody>{(tab === kind ? entries : []).map(entry => {
          const policy = policies.find(item => item.positionId === entry.id);
          return <tr key={entry.id}>
          <td><code>{entry.code}</code></td><td>{entry.name}</td>
          {kind === 'departments'
            ? <><td>{functionLabels[entry.functionCode] ?? entry.functionCode}</td><td className="tabular-nums">{entry.positionCount}</td><td className="tabular-nums">{entry.activeAppointmentCount}</td></>
            : <><td>{entry.departmentName || '—'}</td>
              <td className="directory-permission-cell">
                {policy?.activePermissionCodes?.length
                  ? <span title={policy.activePermissionCodes.join(', ')}>{templateLabel(policy) ? `${templateLabel(policy)} · ` : ''}{policy.activePermissionCodes.length} quyền</span>
                  : <span className="directory-muted">Chưa cấu hình</span>}
              </td>
              <td>{policy?.activeEmploymentTypes?.length
                ? <span title={policy.activeEmploymentTypes.map(type => employmentLabels[type] ?? type).join(', ')}>
                    {policy.activeEmploymentTypes.length === 1
                      ? employmentLabels[policy.activeEmploymentTypes[0]] ?? policy.activeEmploymentTypes[0]
                      : `${policy.activeEmploymentTypes.length} loại hình`}
                  </span>
                : '—'}</td>
              <td className="tabular-nums">{entry.activeAppointmentCount}</td></>}
          <td><span className={`directory-status${entry.isActive ? ' is-active' : ''}`}>{entry.isActive ? 'Hoạt động' : 'Ngừng sử dụng'}</span></td>
          <td><div className="directory-actions">
            <button disabled={saving || loading} aria-label={kind==='positions'?`Chỉnh sửa chức vụ ${entry.name}`:`Đổi tên ${entry.name}`} onClick={event => openEditor(kind, event.currentTarget, entry)}>{kind==='positions'?'Chỉnh sửa':'Đổi tên'}</button>
            <button disabled={saving || loading} aria-label={`${entry.isActive ? 'Ngừng sử dụng' : 'Kích hoạt'} ${entry.name}`} onClick={() => void toggle(kind, entry)}>{entry.isActive ? 'Ngừng sử dụng' : 'Kích hoạt'}</button>
            <button className="directory-danger" disabled={saving || loading || !entry.canDelete}
              title={entry.canDelete ? 'Xóa vĩnh viễn' : (entry.deleteBlockedReason ? `Không thể xóa vì ${entry.deleteBlockedReason}` : 'Không thể xóa vì đang được sử dụng')}
              aria-label={`Xóa ${entry.name}`} onClick={() => void remove(kind, entry)}>Xóa</button>
          </div></td>
        </tr>})}</tbody>
      </table></div>
      {catalog && tab === kind && !entries.length && <div className="directory-empty"><p>{catalog[kind].length ? 'Không có kết quả phù hợp.' : `Chưa có ${labels[kind]}.`}</p>{catalog[kind].length ? <button onClick={() => {setQuery('');setDepartmentFilter('');}}>Xóa bộ lọc</button> : <button className="directory-primary" onClick={event => openEditor(kind, event.currentTarget)}>Thêm {labels[kind]}</button>}</div>}
    </section>)}

    <dialog ref={dialog} className="directory-dialog" aria-labelledby="directory-editor-title" onClose={() => { setEditor(null); setPolicyPreview(undefined); opener.current?.focus(); }} onCancel={event => { if (saving || savingPolicy) event.preventDefault(); }}>
      {editor && <form key={`${editor.kind}-${editor.entry?.id ?? 'new'}`} onSubmit={save}>
        <div className="directory-section-heading"><h2 id="directory-editor-title">{editor.kind==='positions'?(editor.entry?'Chỉnh sửa chức vụ':'Thêm chức vụ'):(editor.entry?'Đổi tên phòng ban':'Thêm phòng ban')}</h2><button type="button" disabled={saving} onClick={closeEditor}>Đóng</button></div>
        <fieldset disabled={saving || savingPolicy}>
          {editor.kind === 'positions' && <>
            <label>Phòng ban<select name="departmentId" required disabled={!!editor.entry&&!!policies.find(policy=>policy.positionId===editor.entry!.id)?.activeAppointments} value={positionDepartment} onChange={event => {setPositionDepartment(event.target.value);setPolicyPreview(undefined);}} aria-describedby="directory-department-help">
              <option value="">Chọn phòng ban</option>
              {catalog?.departments.filter(d => d.isActive || String(d.id) === positionDepartment).map(d => <option key={d.id} value={d.id}>{d.name}{d.isActive ? '' : ' (ngừng sử dụng)'}</option>)}
            </select></label>
            <p id="directory-department-help" className="directory-help">{editor.entry&&policies.find(policy=>policy.positionId===editor.entry!.id)?.activeAppointments?'Chức vụ đang có người được bổ nhiệm. Hãy tạo chức vụ ở phòng mới rồi chuyển bổ nhiệm để giữ lịch sử.':'Chọn phòng ban, chức vụ và các quyền được cấp trong cùng biểu mẫu.'}</p>
            <div className="directory-code-row">
              <label>Mã chức vụ<input name="code" pattern="[A-Z0-9_]{1,40}" maxLength={40} value={positionCode} readOnly={!!editor.entry} onChange={event => setPositionCode(event.target.value.toUpperCase())} aria-describedby="directory-code-help" autoFocus={!editor.entry} /></label>
            </div>
            <p id="directory-code-help" className="directory-help">
              {editor.entry
                ? 'Mã được giữ nguyên khi đổi tên.'
                : generatedPositionCode
                  ? <>Để trống để hệ thống tự tạo mã: <code>{generatedPositionCode}</code></>
                  : 'Từ 1–40 ký tự: chữ in hoa, chữ số hoặc dấu gạch dưới (_). Để trống để hệ thống tự sinh mã từ phòng ban.'}
            </p>
            <label>Tên chức vụ<input name="name" required maxLength={160} value={positionName} onChange={event => setPositionName(event.target.value)} autoFocus={!!editor.entry} aria-describedby={formError ? 'directory-form-error' : undefined} /></label>
            <section className="directory-position-policy" aria-labelledby="position-policy-editor-title">
              <h3 id="position-policy-editor-title">Vai trò, quyền và loại hình khi bổ nhiệm</h3>
              <p>Chức vụ mang danh sách quyền riêng. Quyền được giới hạn trong phòng ban ở trên.</p>
              <label>Mẫu quyền<select value={draftTemplate} onChange={event => applyTemplate(event.target.value)} aria-describedby="position-template-help">
                {editorTemplates.map(template => <option key={template.code} value={template.code}>{template.name} · {template.roleIds.map(role => userRoleLabels[role]).join(' + ')}</option>)}
                <option value={CUSTOM_TEMPLATE} disabled>Tùy chỉnh</option>
              </select></label>
              <p id="position-template-help" className="directory-help">Chọn mẫu để điền sẵn vai trò và quyền theo chức năng của phòng. Chỉnh bên dưới nếu cần; khi đó chức vụ dùng cấu hình tùy chỉnh.</p>
              <h4>Vai trò hệ thống</h4>
              <p className="directory-help">Chọn ít nhất một vai trò để cấp quyền khi bổ nhiệm và mở đúng giao diện sau đăng nhập.</p>
              <div className="directory-policy-roles">{[2,5,6].map(role=><label className="staff-checkbox" key={role}>
                <input type="checkbox" checked={policyDraft.roleIds.includes(role)} onChange={event=>{setPolicyDraft(draft=>({...draft,roleIds:event.target.checked?[...draft.roleIds,role]:draft.roleIds.filter(item=>item!==role)}));setPolicyPreview(undefined);}} />
                {userRoleLabels[role]}</label>)}</div>

              <h4>Quyền</h4>
              {permissionGroups.length === 0
                ? <p className="directory-help">Chưa có quyền nào trong danh mục.</p>
                : <div className="directory-permission-groups">{permissionGroups.map(group => <fieldset key={group.prefix} className="directory-permission-group">
                    <legend>{permissionGroupLabels[group.prefix] ?? group.prefix}</legend>
                    {group.items.map(permission => <label className="staff-checkbox" key={permission.code}>
                      <input type="checkbox" checked={policyDraft.permissionCodes.includes(permission.code)}
                        disabled={!availableCodes.has(permission.code)}
                        onChange={event=>togglePermission(permission.code,event.target.checked)} />
                      <span><code>{permission.code}</code>{permission.description && <span className="directory-help"> — {permission.description}</span>}</span>
                    </label>)}
                  </fieldset>)}</div>}
              <p className="directory-help">Đã chọn {policyDraft.permissionCodes.length} quyền.</p>

              <h4>Loại hình làm việc</h4>
              <div className="directory-policy-employment">{Object.entries(employmentLabels).map(([type,label])=><label className="staff-checkbox" key={type}>
                <input type="checkbox" checked={policyDraft.employmentTypes.includes(type)} onChange={event=>{setPolicyDraft(draft=>({...draft,employmentTypes:event.target.checked?[...draft.employmentTypes,type]:draft.employmentTypes.filter(item=>item!==type)}));setPolicyPreview(undefined);}} />{label}</label>)}</div>
              <label>Lý do thay đổi quyền<textarea maxLength={500} value={policyDraft.reason} onChange={event=>setPolicyDraft(draft=>({...draft,reason:event.target.value}))} /></label>
              {policyPreview&&<div className="directory-policy-preview" aria-live="polite">
                <h4>Ảnh hưởng tới {policyPreview.affectedUserIds.length} tài khoản</h4>
                {policyPreview.warnings.map(warning=><p className="staff-access-warning" key={warning}>{warning}</p>)}
                {policyPreview.userChanges?.map(change=><div key={change.userId}><strong>{change.name}</strong><div className="staff-access-columns">
                  <div><h5>Hiện tại</h5><GrantList grants={change.before} policies={policies} departments={catalog?.departments}/></div><div><h5>Sau khi lưu</h5><GrantList grants={change.after} policies={policies} departments={catalog?.departments}/></div>
                </div></div>)}
              </div>}
            </section>
          </>}
          {editor.kind === 'departments' && <>
            <label>Mã<input name="code" required pattern="[A-Z0-9_]{1,40}" maxLength={40} defaultValue={editor.entry?.code ?? ''} readOnly={!!editor.entry} aria-describedby="directory-code-help" autoFocus={!editor.entry} /></label>
            <p id="directory-code-help" className="directory-help">{editor.entry ? 'Mã được giữ nguyên khi đổi tên.' : 'Từ 1–40 ký tự: chữ in hoa, chữ số hoặc dấu gạch dưới (_).'}</p>
            <label>Tên<input name="name" required maxLength={160} defaultValue={editor.entry?.name ?? ''} autoFocus={!!editor.entry} aria-describedby={formError ? 'directory-form-error' : undefined} /></label>
            <label>Chức năng<select value={departmentFunction} onChange={event => setDepartmentFunction(event.target.value as DepartmentFunction)} aria-describedby="directory-function-help">
              {(Object.keys(functionLabels) as DepartmentFunction[]).map(code => <option key={code} value={code}>{functionLabels[code]}</option>)}
            </select></label>
            <p id="directory-function-help" className="directory-help">Chức năng quyết định các mẫu quyền khi cấu hình chức vụ: Chuyên môn (nội dung giảng dạy) hoặc Quản lý đào tạo (lớp học, ghi danh, lịch học).</p>
          </>}
          {formError && <p id="directory-form-error" className="directory-error" role="alert">{formError}</p>}
          <div className="directory-form-actions"><button type="button" onClick={closeEditor}>Hủy</button>
            {editor.kind==='positions'&&editor.entry&&(policies.find(policy=>policy.positionId===editor.entry!.id)?.activeAppointments??0)>0&&<button type="button" disabled={saving||savingPolicy||!policyDraft.permissionCodes.length} onClick={()=>void previewPolicy()}>{savingPolicy?'Đang xem…':'Xem ảnh hưởng'}</button>}
            <button className="directory-primary" type="submit" disabled={saving||savingPolicy||editor.kind==='positions'&&(!policyDraft.roleIds.length||!policyDraft.permissionCodes.length)}>{saving?'Đang lưu…':policyPreview?.affectedUserIds.length?'Xác nhận quyền và lưu chức vụ':editor.kind==='positions'?editor.entry?'Lưu chức vụ và quyền':'Thêm chức vụ và quyền':editor.entry?'Lưu phòng ban':'Thêm mới'}</button></div>
        </fieldset>
      </form>}
    </dialog>
  </div>;
}
