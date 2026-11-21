import type { AccountAccess } from '../auth/accountAccess';
import { API_BASE_URL } from './auth';
export type Grant = {roleId:number;scopeType:string;departmentId:number|null;grantId?:number;role?:string;revokedAt?:string|null};
export type AdminUser = {userId:number;email:string;fullName:string;phone:string|null;status:string;activationPending:boolean;primaryRoleId:number;primaryRole:string;version:number;roles:Grant[]};
export type DepartmentFunction='ACADEMIC'|'TRAINING';
export type DirectoryEntry={id:number;code:string;name:string;isActive:boolean;functionCode:DepartmentFunction;departmentId:number|null;departmentName:string;
 positionCount:number;activeAppointmentCount:number;canDelete:boolean;deleteBlockedReason:string|null};
export type PermissionCatalog={code:string;description:string};
export type Catalog={roles:{roleId:number;roleName:string}[];permissions:{roleId:number;code:string;description:string}[];
 departments:DirectoryEntry[];positions:DirectoryEntry[];availablePermissions:PermissionCatalog[];templates:PositionTemplate[]};
/** Role and permission bundle offered for job titles of one department function. */
export type PositionTemplate={functionCode:DepartmentFunction;code:string;name:string;roleIds:number[];permissionCodes:string[]};
export type BulkRowPreview={email:string;fullName:string;valid:boolean;reason:string};
export type Detail={staffAccess:StaffAccessState;access:AccountAccess;user:AdminUser;appointments:{appointmentId:number;department:string;position:string;employmentType:string;validFrom:string;validTo:string|null}[];invitation:{expiresAt:string;usedAt:string|null;revokedAt:string|null}|null;delivery:{sentAt:string|null;attempts:number;nextAttemptAt:string}|null};
export type AuditEvent={actorUserId:number|null;action:string;oldValue:string|null;newValue:string|null;createdAt:string};
export async function adminRequest<T>(path:string,body?:unknown,method=body===undefined?'GET':'POST'):Promise<T>{
 const token=localStorage.getItem('teky_access_token')||sessionStorage.getItem('teky_access_token')||'';
 const r=await fetch(`${API_BASE_URL}/admin${path}`,{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:body===undefined?undefined:JSON.stringify(body)});
 const d=await r.json().catch(()=>null);if(!r.ok)throw new Error(d?.message||d?.title||(r.status===403?'Bạn không có quyền quản lý tài khoản.':r.status===401?'Phiên đăng nhập đã hết hạn.':'Không thể thực hiện thao tác.'));
 return d as T;
}
export function getAdminUsers(params:{q?:string;status?:string;skip?:number;take?:number;roleId?:number;departmentId?:number}={}){const q=new URLSearchParams();Object.entries(params).forEach(([k,v])=>v!==undefined&&v!==''&&q.set(k,String(v)));return adminRequest<{total:number;items:AdminUser[]}>(`/users?${q}`);}

/** Removes a department or job title. The API refuses while anything still references it. */
export function deleteDirectoryEntry(kind:'departments'|'positions',id:number){return adminRequest(`/directory/${kind}/${id}`,undefined,'DELETE');}

/** Activates or deactivates a department or job title. Existing appointments keep their permissions. */
export function setDirectoryStatus(kind:'departments'|'positions',id:number,isActive:boolean){return adminRequest(`/directory/${kind}/${id}/status`,{isActive},'PUT');}

/** Creates several staff accounts in one call. */
export function bulkCreateUsers(body:{departmentId:number;positionId:number;rows:string[];employmentType:string}){return adminRequest<BulkCreateResult>('/users/bulk',body,'POST');}

/** Downloads the Excel template the administrator fills in for a bulk import. */
export async function downloadBulkTemplate(){const token=localStorage.getItem('teky_access_token')||sessionStorage.getItem('teky_access_token')||'';
 const r=await fetch(`${API_BASE_URL}/admin/users/bulk-template`,{headers:{Authorization:`Bearer ${token}`}});
 if(!r.ok){const d=await r.json().catch(()=>null);throw new Error(d?.message||'Không thể tải file mẫu.');}
 const blob=await r.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');
 a.href=url;a.download='mau-nhan-su-teky.xlsx';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);}

/** Reads an uploaded Excel file so the administrator can preview the rows before creating them. */
export async function previewBulkFile(file:File){const token=localStorage.getItem('teky_access_token')||sessionStorage.getItem('teky_access_token')||'';
 const body=new FormData();body.append('file',file);
 const r=await fetch(`${API_BASE_URL}/admin/users/bulk-preview`,{method:'POST',headers:{Authorization:`Bearer ${token}`},body});
 const d=await r.json().catch(()=>null);
 if(!r.ok)throw new Error(d?.message||d?.title||'Không đọc được file Excel.');
 return d as BulkRowPreview[];}

export type AppointmentInput = {departmentId:number;positionId:number;policyVersion:number;employmentType:string};
export type PositionPolicy = {positionId:number;departmentId:number;position:string;department:string;isActive:boolean;
 version:number;isPublished:boolean;roleIds:number[];employmentTypes:string[];activeAppointments:number;
 activeVersion:number|null;activeRoleIds:number[]|null;activeEmploymentTypes:string[]|null;
 permissionCodes:string[];activePermissionCodes:string[]|null;departmentFunction:DepartmentFunction;activeTemplateCode:string|null};
export type AppointmentAccess = {appointmentId:number;departmentId:number;positionId:number;department:string;position:string;
 employmentType:string;validFrom:string;validTo:string|null;policyVersion:number;roleIds:number[]};
export type GrantSource = {grantId:number;sourceId:number;kind:string;appointmentId:number|null;position:string|null;department:string|null;reason:string};
export type StaffAccessState = {isManaged:boolean;needsReconciliation:boolean;appointments:AppointmentAccess[];sources:GrantSource[]};
export type StaffPreview = {before:Grant[];after:Grant[];availablePrimaryRoles:number[];warnings:string[];affectedUserIds:number[];
 userChanges?:{userId:number;name:string;before:Grant[];after:Grant[]}[]};
export type StaffChange = {version:number;endAppointmentId?:number;appointment?:AppointmentInput;primaryRoleId?:number;disableAccess:boolean;reason:string};
export type StaffReconcile = {version:number;appointments:AppointmentInput[];retainGrantIds:number[];primaryRoleId?:number;disableAccess:boolean;reason:string};
export type PolicyRequest = {version:number;roleIds:number[];permissionCodes:string[];employmentTypes:string[];publish:boolean;reason:string};
export type BulkCreateRow={row:string;email:string|null;fullName:string|null;status:string;message:string|null;userId:number|null};
export type BulkCreateResult={created:number;rows:BulkCreateRow[]};
