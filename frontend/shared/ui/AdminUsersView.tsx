import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { adminRequest, bulkCreateUsers, downloadBulkTemplate, getAdminUsers, previewBulkFile } from '../api-client/adminUsers';
import type { AdminUser, BulkCreateResult, Catalog, Detail, Grant, AuditEvent, AppointmentInput, PositionPolicy, StaffPreview } from '../api-client/adminUsers';
import { UserAuditHistory } from './UserAuditHistory';
import { UserAccessSummary } from './UserAccessSummary';
import { IconX } from './Icons';
import { AppointmentFields } from './StaffAccessForms';
import { emptyAppointment, employmentLabels } from './staffAccessOptions';
import { StaffAccessEditor } from './StaffAccessEditor';
import { userRoleLabels as labels, userStatusLabels as statuses } from './adminUserAudit';
import './AdminUsersView.css';
const isStaff = (role:number) => [2,3,5,6].includes(role);
/** One row of the bulk import preview. */
type BulkPreviewRow={row:string;email:string;fullName:string;valid:boolean;reason:string};
export function AdminUsersView(){
 const [page,setPage]=useState({total:0,items:[] as AdminUser[]});const [catalog,setCatalog]=useState<Catalog|null>(null);
 const [q,setQ]=useState('');const [status,setStatus]=useState('');const [roleId,setRoleId]=useState('');const [department,setDepartment]=useState('');const [skip,setSkip]=useState(0);
 const [loading,setLoading]=useState(false);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [error,setError]=useState('');const [revision,setRevision]=useState(0);
 const [detail,setDetail]=useState<Detail|null>(null);const [audit,setAudit]=useState<AuditEvent[]>([]);const [auditSkip,setAuditSkip]=useState(0);const [auditTotal,setAuditTotal]=useState(0);const [selected,setSelected]=useState<number|null>(null);
 const [accountType,setAccountType]=useState(1);
 const [primary,setPrimary]=useState(1);
 const [policies,setPolicies]=useState<PositionPolicy[]>([]);
 const [createAppointments,setCreateAppointments]=useState<AppointmentInput[]>([]);
 const [createCandidate,setCreateCandidate]=useState<AppointmentInput>(emptyAppointment);
 const [createPreview,setCreatePreview]=useState<StaffPreview>();
 const [bulkSource,setBulkSource]=useState<'paste'|'excel'>('paste');
 const [bulkDepartment,setBulkDepartment]=useState('');
 const [bulkPosition,setBulkPosition]=useState('');
 const [bulkEmployment,setBulkEmployment]=useState('FULL_TIME');
 const [bulkText,setBulkText]=useState('');
 const [bulkRows,setBulkRows]=useState<BulkPreviewRow[]>([]);
 const [bulkResult,setBulkResult]=useState<BulkCreateResult|null>(null);
 const [bulkError,setBulkError]=useState('');
 const [bulkBusy,setBulkBusy]=useState(false);
 const detailBody=useRef<HTMLDivElement>(null);
 const createDialog=useRef<HTMLDialogElement>(null);const detailDialog=useRef<HTMLDialogElement>(null);const bulkDialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{let valid=true;const timer=setTimeout(()=>{setLoading(true);setError('');Promise.all([getAdminUsers({q,status,roleId:roleId?Number(roleId):undefined,departmentId:department?Number(department):undefined,skip,take:20}),adminRequest<Catalog>('/directory'),adminRequest<PositionPolicy[]>('/position-policies')]).then(([p,c,policies])=>{if(valid){setPage(p);setCatalog(c);setPolicies(policies);}}).catch(e=>{if(valid)setError(e.message);}).finally(()=>{if(valid)setLoading(false);});},200);return()=>{valid=false;clearTimeout(timer);};},[q,status,roleId,department,skip,revision]);
 useEffect(()=>{if(selected===null)return;let valid=true;const timer=setTimeout(()=>{setBusy(true);Promise.all([adminRequest<Detail>(`/users/${selected}`),adminRequest<{items:AuditEvent[];total:number}>(`/users/${selected}/audit-events?skip=${auditSkip}&take=20`)]).then(([d,a])=>{if(valid){setDetail(d);setAudit(a.items);setAuditTotal(a.total);}}).catch(e=>{if(valid)setError(e.message);}).finally(()=>{if(valid)setBusy(false);});},0);return()=>{valid=false;clearTimeout(timer);};},[selected,revision,auditSkip]);
 async function run(f:()=>Promise<unknown>,success:string){setBusy(true);setError('');setMessage('');try{await f();setMessage(success);setRevision(v=>v+1);return true;}catch(e){setError(e instanceof Error?e.message:'Không thể thực hiện.');return false;}finally{setBusy(false);}}
 function scope(g:Grant){return g.scopeType==='GLOBAL'?'Toàn hệ thống':catalog?.departments.find(d=>d.id===g.departmentId)?.name||`Phòng ${g.departmentId}`;}
 async function previewCreate(){setBusy(true);setError('');try{const preview=await adminRequest<StaffPreview>('/staff-access/preview',createAppointments);setCreatePreview(preview);if(!preview.availablePrimaryRoles.includes(primary))setPrimary(preview.availablePrimaryRoles[0]??2);}catch(failure){setError(failure instanceof Error?failure.message:'Không thể xác định quyền.');}finally{setBusy(false);}}

 /** Parses the pasted list into preview rows and flags the invalid ones before sending. */
 function parseBulkText(text:string):BulkPreviewRow[]{
  const seen=new Set<string>();const rows:BulkPreviewRow[]=[];
  for(const raw of text.split(/\r?\n/)){
   const line=raw.trim();if(!line)continue;
   const parts=line.split(',',2);
   const email=parts[0].trim().toLowerCase();const fullName=parts.length>1?parts[1].trim():'';
   if(!email){rows.push({row:line,email,fullName,valid:false,reason:'Thiếu email.'});continue;}
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){rows.push({row:line,email,fullName,valid:false,reason:'Email không hợp lệ.'});continue;}
   if(seen.has(email)){rows.push({row:line,email,fullName,valid:false,reason:'Trùng trong danh sách.'});continue;}
   if(!fullName){rows.push({row:line,email,fullName,valid:false,reason:'Thiếu họ tên.'});continue;}
   seen.add(email);rows.push({row:line,email,fullName,valid:true,reason:''});
  }
  return rows;
 }
 function openBulk(){setBulkError('');setBulkResult(null);setBulkRows(parseBulkText(bulkText));bulkDialog.current?.showModal();}
 function updateBulkText(text:string){setBulkText(text);setBulkRows(parseBulkText(text));}
 async function readBulkFile(file:File){
  setBulkError('');
  try{
   const rows=await previewBulkFile(file);
   const text=rows.map(row=>row.fullName?`${row.email}, ${row.fullName}`:row.email).join('\n');
   setBulkText(text);
   setBulkRows(rows.map(row=>({row:row.email,email:row.email,fullName:row.fullName,valid:row.valid,reason:row.reason})));
  }catch(failure){setBulkError(failure instanceof Error?failure.message:'Không đọc được file Excel.');}
 }
 async function submitBulk(){
  setBulkBusy(true);setBulkError('');
  try{
   const valid=bulkRows.filter(row=>row.valid).map(row=>row.fullName?`${row.email}, ${row.fullName}`:row.email);
   if(!valid.length){setBulkError('Chưa có dòng hợp lệ để tạo.');return;}
   if(!bulkDepartment){setBulkError('Chọn phòng ban cho các tài khoản mới.');return;}
   if(!bulkPosition){setBulkError('Chọn chức vụ để hệ thống cấp đúng quyền cho các tài khoản mới.');return;}
   const result=await bulkCreateUsers({departmentId:Number(bulkDepartment),positionId:Number(bulkPosition),rows:valid,employmentType:bulkEmployment});
   setBulkResult(result);setMessage(`Đã tạo ${result.created} tài khoản.`);setRevision(v=>v+1);
  }catch(failure){setBulkError(failure instanceof Error?failure.message:'Không thể tạo hàng loạt tài khoản.');}
  finally{setBulkBusy(false);}
 }
 async function downloadTemplate(){
  try{await downloadBulkTemplate();}
  catch(failure){setBulkError(failure instanceof Error?failure.message:'Không thể tải file mẫu.');}
 }
 async function create(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const data=new FormData(e.currentTarget);
  if(accountType===2&&(!createPreview||!createAppointments.length)){setError('Chọn bổ nhiệm và xem trước quyền nhân sự.');return;}
  if(accountType===3&&!window.confirm('Tạo tài khoản Quản trị hệ thống với quyền quản lý toàn hệ thống?'))return;
  const ok=await run(()=>adminRequest('/users',{email:data.get('email'),fullName:data.get('fullName'),phone:data.get('phone')||null,
   primaryRoleId:accountType===2?primary:accountType,appointments:accountType===2?createAppointments:[],
   grants:accountType===2?[]:[{roleId:accountType,scopeType:'GLOBAL',departmentId:null}]}),'Đã tạo tài khoản. Lời mời đang chờ gửi email.');
  if(ok)createDialog.current?.close();
 }
 async function mutate(path:string,body:Record<string,unknown>,method='POST'){if(!detail)return;await run(()=>adminRequest(`/users/${detail.user.userId}${path}`,{version:detail.user.version,...body},method),'Đã lưu thay đổi.');}
 const u=detail?.user;
 return <main className="users-page"><header><div><h1>Quản lý tài khoản</h1><p>Tạo tài khoản, quản lý vai trò và phạm vi truy cập.</p></div><div className="users-actions"><button className="users-primary" disabled={!catalog} onClick={()=>{setAccountType(1);setPrimary(1);setCreateAppointments([]);setCreateCandidate(emptyAppointment);setCreatePreview(undefined);setError('');createDialog.current?.showModal();}}>Tạo tài khoản</button><button disabled={!catalog||busy} onClick={openBulk}>Tạo nhiều tài khoản</button></div></header>
 {message&&<p role="status" className="users-success">{message}</p>}{error&&<p role="alert" className="users-error">{error} <button onClick={()=>setRevision(v=>v+1)}>Tải lại</button></p>}
 <div className="users-filters"><label>Tìm tài khoản<input type="search" placeholder="Tên hoặc email" value={q} onChange={e=>{setQ(e.target.value);setSkip(0);}}/></label><label>Trạng thái<select value={status} onChange={e=>{setStatus(e.target.value);setSkip(0);}}><option value="">Tất cả</option>{Object.entries(statuses).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label>Vai trò<select value={roleId} onChange={e=>{setRoleId(e.target.value);setSkip(0);}}><option value="">Tất cả</option>{Object.entries(labels).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label><label>Phạm vi phòng ban<select value={department} onChange={e=>{setDepartment(e.target.value);setSkip(0);}}><option value="">Tất cả</option>{catalog?.departments.map(d=><option value={d.id} key={d.id}>{d.name}</option>)}</select></label></div>
 <div className="users-table" aria-busy={loading}><table><caption className="users-caption">{loading?'Đang tải tài khoản…':`${page.total} tài khoản`}</caption><thead><tr><th>Họ tên / Email</th><th>Trang mở sau đăng nhập</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{page.items.map(user=><tr key={user.userId}><td><strong>{user.fullName}</strong><small>{user.email}</small></td><td>{labels[user.primaryRoleId]}</td><td><span className={`users-status is-${user.status.toLowerCase()}`}>{statuses[user.status]||user.status}</span></td><td><button onClick={()=>{setDetail(null);setError('');setMessage('');setSelected(user.userId);setAuditSkip(0);detailDialog.current?.showModal();if(detailBody.current)detailBody.current.scrollTop=0;}}>Chi tiết & quyền</button></td></tr>)}</tbody></table>{!loading&&!page.items.length&&<p className="users-empty">Không có tài khoản phù hợp.</p>}</div>
 <nav className="users-pagination" aria-label="Phân trang tài khoản"><button disabled={skip===0||loading} onClick={()=>setSkip(v=>Math.max(v-20,0))}>Trước</button><span>Trang {Math.floor(skip/20)+1}</span><button disabled={skip+20>=page.total||loading} onClick={()=>setSkip(v=>v+20)}>Sau</button></nav>
 <dialog ref={createDialog} className="users-dialog" aria-labelledby="users-create-title"><form onSubmit={create}>
 <div className="users-dialog-heading"><h2 id="users-create-title">Tạo tài khoản</h2><button type="button" onClick={()=>createDialog.current?.close()}>Đóng</button></div>
 <p>Người dùng nhận lời mời đặt mật khẩu, có hiệu lực 24 giờ.</p><fieldset disabled={busy}>
 <div className="users-fields"><label>Họ tên<input required maxLength={120} name="fullName" autoComplete="name"/></label>
 <label>Email<input required type="email" maxLength={150} name="email" autoComplete="email"/></label><label>Số điện thoại<input name="phone" maxLength={20} type="tel"/></label></div>
 <label>Loại tài khoản<select value={accountType} onChange={e=>{const role=Number(e.target.value);setAccountType(role);setPrimary(role);setCreatePreview(undefined);setError('');}}>
 <option value={1}>{labels[1]}</option><option value={4}>{labels[4]}</option><option value={2}>Nhân sự theo chức danh</option><option value={3}>Quản trị hệ thống</option></select></label>
 {accountType===2&&<><h3>Phòng ban, chức danh và quyền</h3><p>Quyền được tính từ chức danh. Thêm nhiều bổ nhiệm khi nhân sự kiêm nhiệm.</p>
 <ul className="staff-appointments">{createAppointments.map((appointment,index)=><li key={appointment.positionId}>
 <span>{policies.find(policy=>policy.positionId===appointment.positionId)?.position} · {policies.find(policy=>policy.positionId===appointment.positionId)?.department}</span>
 <button type="button" onClick={()=>{setCreateAppointments(items=>items.filter((_,i)=>i!==index));setCreatePreview(undefined);}}>Bỏ</button></li>)}</ul>
 <AppointmentFields value={createCandidate} policies={policies} onChange={setCreateCandidate}/>
 <div className="users-actions"><button type="button" disabled={!createCandidate.positionId||createAppointments.some(appointment=>appointment.positionId===createCandidate.positionId)}
 onClick={()=>{setCreateAppointments(items=>[...items,createCandidate]);setCreateCandidate(emptyAppointment);setCreatePreview(undefined);}}>Thêm chức danh</button>
 <button type="button" disabled={!createAppointments.length} onClick={()=>void previewCreate()}>Xem trước quyền</button></div>
 {createPreview&&<><h4>Vai trò và phạm vi được cấp</h4><ul>{createPreview.after.map(grant=><li key={`${grant.roleId}-${grant.departmentId}`}>{labels[grant.roleId]} · {scope(grant)}</li>)}</ul>
 <label>Trang mở sau đăng nhập<select value={primary} onChange={e=>setPrimary(Number(e.target.value))}>{createPreview.availablePrimaryRoles.map(role=><option key={role} value={role}>{labels[role]}</option>)}</select></label></>}
 </>}
 {error&&<p role="alert" className="users-error">{error}</p>}<button className="users-primary" disabled={busy||accountType===2&&!createPreview} type="submit">{busy?'Đang tạo…':'Tạo và gửi lời mời'}</button>
 </fieldset></form></dialog>
 <dialog ref={bulkDialog} className="users-dialog users-bulk-dialog" aria-labelledby="users-bulk-title" onClose={()=>setBulkError('')}>
 <div className="users-dialog-heading"><h2 id="users-bulk-title">Tạo nhiều tài khoản</h2><button type="button" onClick={()=>bulkDialog.current?.close()}>Đóng</button></div>
 <p>Mỗi tài khoản nhận lời mời đặt mật khẩu có hiệu lực 24 giờ. Quyền đến từ chức vụ được chọn.</p>
 <fieldset disabled={bulkBusy}>
 <div className="users-fields">
  <label>Phòng ban<select value={bulkDepartment} onChange={e=>{setBulkDepartment(e.target.value);setBulkPosition('');}} required>
   <option value="">Chọn phòng ban</option>
   {catalog?.departments.filter(d=>d.isActive).map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
  </select></label>
  <label>Chức vụ<select value={bulkPosition} required disabled={!bulkDepartment} onChange={e=>{setBulkPosition(e.target.value);
    const next=policies.find(p=>p.positionId===Number(e.target.value));setBulkEmployment(next?.activeEmploymentTypes?.[0]??'FULL_TIME');}}>
   <option value="">{bulkDepartment?'Chọn chức vụ':'Chọn phòng ban trước'}</option>
   {policies.filter(p=>p.departmentId===Number(bulkDepartment)&&p.isActive).map(p=><option key={p.positionId} value={p.positionId} disabled={!p.activeVersion}>{p.position}{p.activeVersion?'':' · Cần cấu hình quyền'}</option>)}
  </select></label>
  <label>Loại hình làm việc<select value={bulkEmployment} disabled={!bulkPosition} onChange={e=>setBulkEmployment(e.target.value)}>
   {(policies.find(p=>p.positionId===Number(bulkPosition))?.activeEmploymentTypes??['FULL_TIME']).map(type=><option key={type} value={type}>{employmentLabels[type]??type}</option>)}
  </select></label>
 </div>
 <div className="users-bulk-tabs" role="tablist" aria-label="Nguồn danh sách tài khoản">
  <button type="button" role="tab" aria-selected={bulkSource==='paste'} className={bulkSource==='paste'?'is-active':''} onClick={()=>setBulkSource('paste')}>Dán danh sách email</button>
  <button type="button" role="tab" aria-selected={bulkSource==='excel'} className={bulkSource==='excel'?'is-active':''} onClick={()=>setBulkSource('excel')}>Nhập từ Excel</button>
 </div>
 {bulkSource==='paste'
  ? <label className="users-bulk-text">Danh sách email<textarea value={bulkText} onChange={e=>updateBulkText(e.target.value)} rows={8}
     aria-describedby="users-bulk-help" placeholder={'giao.vien@example.edu.vn, Nguyễn Văn A\nphu.vien@example.edu.vn, Trần Thị B'}/></label>
  : <div className="users-bulk-file"><label>Chọn file .xlsx<input type="file" accept=".xlsx" onChange={e=>{const file=e.target.files?.[0];if(file)void readBulkFile(file);}}/></label>
    <button type="button" onClick={()=>void downloadTemplate()}>Tải file mẫu</button></div>}
 <p id="users-bulk-help" className="users-bulk-help">Mỗi dòng một tài khoản. Có thể ghi <code>email, Họ tên</code> để đặt sẵn tên hiển thị.</p>
 {bulkRows.length>0&&<div className="users-bulk-preview"><table><caption>Danh sách xem trước ({bulkRows.filter(r=>r.valid).length}/{bulkRows.length} dòng hợp lệ)</caption>
  <thead><tr><th>Email</th><th>Họ tên</th><th>Trạng thái</th></tr></thead>
  <tbody>{bulkRows.map((row,index)=><tr key={`${row.email}-${index}`}><td>{row.email||'—'}</td><td>{row.fullName||'—'}</td>
   <td>{row.valid?<span className="users-bulk-ok">Hợp lệ</span>:<span className="users-bulk-bad">{row.reason}</span>}</td></tr>)}</tbody></table></div>}
 {bulkResult&&<div className="users-bulk-result" role="status">
  <h4>Đã tạo {bulkResult.created} tài khoản</h4>
  <ul>{bulkResult.rows.map((row,index)=><li key={`${row.email}-${index}`} className={row.status==='Created'?'is-ok':'is-bad'}>
   <strong>{row.email||row.row}</strong> — {row.status==='Created'?'Đã tạo':row.message}</li>)}</ul></div>}
 {bulkError&&<p role="alert" className="users-error">{bulkError}</p>}
 <div className="users-dialog-actions"><button type="button" onClick={()=>bulkDialog.current?.close()}>Hủy</button>
  <button className="users-primary" type="button" disabled={bulkBusy||!bulkRows.some(r=>r.valid)||!bulkDepartment||!bulkPosition} onClick={()=>void submitBulk()}>{bulkBusy?'Đang tạo…':'Tạo tài khoản'}</button></div>
 </fieldset></dialog>
 <dialog ref={detailDialog} className="users-dialog users-detail-dialog" aria-labelledby="users-detail-title" onClose={()=>setSelected(null)}>
 <button type="button" className="users-detail-close" aria-label="Đóng chi tiết tài khoản" onClick={()=>detailDialog.current?.close()}><IconX size={18} aria-hidden="true"/><span>Đóng</span></button>
 <div className="users-detail-panel"><div className="users-dialog-heading users-detail-heading"><h2 id="users-detail-title">{u?.fullName||'Chi tiết tài khoản'}</h2></div>
 <div ref={detailBody} className="users-detail-body" role="region" aria-label="Nội dung chi tiết tài khoản" tabIndex={0}>{busy&&<p role="status">Đang xử lý…</p>}{error&&<p role="alert" className="users-error">{error}</p>}{message&&<p role="status" className="users-success">{message}</p>}{u&&<fieldset disabled={busy}>
 <p>{u.email} · {statuses[u.status]}</p><form key={`profile-${u.userId}-${u.version}`} onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);await mutate('',{fullName:f.get('fullName'),phone:f.get('phone')||null},'PATCH');}}><div className="users-fields"><label>Họ tên<input name="fullName" required maxLength={120} defaultValue={u.fullName}/></label><label>Điện thoại<input name="phone" type="tel" maxLength={20} defaultValue={u.phone||''}/></label></div><button>Lưu hồ sơ</button></form>
 <h3>Trạng thái tài khoản</h3><div className="users-actions"><button onClick={()=>{const reason=window.prompt('Lý do thay đổi trạng thái? Phiên đăng nhập hiện tại của user sẽ kết thúc.');if(reason)void mutate('/status',{status:u.status==='Locked'?'Active':'Locked',reason},'PUT');}}>{u.status==='Locked'?'Mở khóa':'Khóa tài khoản'}</button>{u.activationPending&&u.status==='Pending'&&<button onClick={()=>void mutate('/invitations',{})}>Gửi lại lời mời</button>}<button onClick={()=>window.open('/forgot-password','_blank','noopener')}>Hướng dẫn đặt lại mật khẩu</button></div>
 {detail?.invitation&&<p>Lời mời hết hạn: {new Date(detail.invitation.expiresAt).toLocaleString('vi-VN')}. Email: {detail.delivery?.sentAt?'Đã gửi':detail.delivery?.attempts?'Gửi lỗi, đang thử lại':'Đang chờ gửi'}.</p>}
 <h3>Quyền đang có</h3><p>Trang mở sau đăng nhập chỉ chọn màn hình đầu tiên; các chức năng được cấp vẫn cùng có hiệu lực.</p>
 <ul className="users-grants">{u.roles.filter(g=>!g.revokedAt).map(g=><li key={g.grantId}><div><strong>{labels[g.roleId]}</strong><small>{scope(g)} · {u.primaryRoleId===g.roleId?'Trang mở sau đăng nhập':'Đang có hiệu lực'}</small>
 {detail?.staffAccess.sources.filter(source=>source.grantId===g.grantId).map(source=><small key={source.sourceId}>{source.kind==='APPOINTMENT'?`Từ chức danh: ${source.position}`:source.kind==='LEGACY'?'Quyền cũ cần đối soát':source.kind==='EXCEPTION'?`Quyền bổ sung: ${source.reason}`:source.kind==='SYSTEM_ADMIN'?'Quyền quản trị đặc biệt':'Quyền tài khoản cá nhân'}</small>)}</div>
 {isStaff(u.primaryRoleId)&&<div className="users-actions"><button type="button" disabled={u.primaryRoleId===g.roleId} onClick={()=>void mutate('/primary-role',{primaryRoleId:g.roleId},'PUT')}>Mở đầu khi đăng nhập</button>
 {g.roleId===3&&<button type="button" onClick={()=>{const active=u.roles.filter(x=>!x.revokedAt&&x.grantId!==g.grantId);const replacement=active.some(x=>x.roleId===u.primaryRoleId)?u.primaryRoleId:active[0]?.roleId;if(window.confirm('Thu hồi quyền Quản trị hệ thống?'))void mutate(`/role-grants/${g.grantId}/revoke`,{primaryRoleId:replacement});}}>Thu hồi quản trị</button>}</div>}</li>)}</ul>
 {detail?.access&&<UserAccessSummary access={detail.access}/>}
 {detail&&isStaff(u.primaryRoleId)&&<StaffAccessEditor key={`${u.userId}-${u.version}`} detail={detail} policies={policies} reload={()=>{setMessage('Đã đồng bộ bổ nhiệm và quyền.');setRevision(value=>value+1);}}/>}
 {isStaff(u.primaryRoleId)&&!u.roles.some(role=>role.roleId===3&&!role.revokedAt)&&<details><summary>Cấp quyền quản trị đặc biệt</summary><p>Quyền này được cấp riêng và không tự phát sinh từ chức danh.</p><button type="button" onClick={()=>{const reason=window.prompt('Lý do cấp quyền Quản trị hệ thống?');if(reason)void mutate('/role-grants',{grant:{roleId:3,scopeType:'GLOBAL',departmentId:null},reason});}}>Cấp Quản trị hệ thống</button></details>}
 <details><summary>Lịch sử thu hồi quyền</summary><ul>{u.roles.filter(g=>g.revokedAt).map(g=><li key={g.grantId}>{labels[g.roleId]} · {scope(g)} · {new Date(g.revokedAt!).toLocaleString('vi-VN')}</li>)}</ul></details>
 <h3>Lịch sử thay đổi</h3><UserAuditHistory events={audit} catalog={catalog} appointments={detail?.appointments??[]}/><div className="users-actions"><button disabled={busy||auditSkip===0} onClick={()=>setAuditSkip(v=>Math.max(0,v-20))}>Lịch sử trước</button><button disabled={busy||auditSkip+20>=auditTotal} onClick={()=>setAuditSkip(v=>v+20)}>Lịch sử sau</button></div>
 </fieldset>}</div></div></dialog>
 </main>;
}
