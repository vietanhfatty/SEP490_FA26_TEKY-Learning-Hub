import { API_BASE_URL } from './auth';
export type Grant = {roleId:number;scopeType:string;departmentId:number|null;grantId?:number;role?:string;revokedAt?:string|null};
export type AdminUser = {userId:number;email:string;fullName:string;phone:string|null;status:string;activationPending:boolean;primaryRoleId:number;primaryRole:string;version:number;roles:Grant[]};
export type DirectoryEntry={id:number;code:string;name:string;isActive:boolean;departmentId:number|null;departmentName:string};
export type Catalog={roles:{roleId:number;roleName:string}[];permissions:{roleId:number;code:string;description:string}[];departments:DirectoryEntry[];positions:DirectoryEntry[]};
export type Detail={user:AdminUser;appointments:{appointmentId:number;department:string;position:string;employmentType:string;validFrom:string;validTo:string|null}[];invitation:{expiresAt:string;usedAt:string|null;revokedAt:string|null}|null;delivery:{sentAt:string|null;attempts:number;nextAttemptAt:string}|null};
export type AuditEvent={actorUserId:number;action:string;oldValue:string|null;newValue:string|null;createdAt:string};
export async function adminRequest<T>(path:string,body?:unknown,method=body===undefined?'GET':'POST'):Promise<T>{
 const token=localStorage.getItem('teky_access_token')||sessionStorage.getItem('teky_access_token')||'';
 const r=await fetch(`${API_BASE_URL}/admin${path}`,{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:body===undefined?undefined:JSON.stringify(body)});
 const d=await r.json().catch(()=>null);if(!r.ok)throw new Error(d?.message||d?.title||(r.status===403?'Bạn không có quyền quản lý tài khoản.':r.status===401?'Phiên đăng nhập đã hết hạn.':'Không thể thực hiện thao tác.'));
 return d as T;
}
export function getAdminUsers(params:{q?:string;status?:string;skip?:number;take?:number;roleId?:number;departmentId?:number}={}){const q=new URLSearchParams();Object.entries(params).forEach(([k,v])=>v!==undefined&&v!==''&&q.set(k,String(v)));return adminRequest<{total:number;items:AdminUser[]}>(`/users?${q}`);}
