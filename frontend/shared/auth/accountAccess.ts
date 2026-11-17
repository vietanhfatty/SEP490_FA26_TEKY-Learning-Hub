export type AccessGrant = {
  grantId: number;
  roleId: number;
  role: string;
  scopeType: 'GLOBAL' | 'DEPARTMENT';
  departmentId: number | null;
  departmentName: string | null;
  permissions: string[];
};
export type ScopedPermission = {
  code: string;
  description: string;
  isGlobal: boolean;
  departmentIds: number[];
};
export type AccountAccess = { grants: AccessGrant[]; permissions: ScopedPermission[] };

export function allowsPermission(access: AccountAccess | undefined, code: string, departmentId?: number | null): boolean {
  return access?.permissions.some(permission => permission.code === code &&
    (permission.isGlobal || departmentId != null && permission.departmentIds.includes(departmentId))) ?? false;
}

export function hasPermission(access: AccountAccess | undefined, code: string): boolean {
  return access?.permissions.some(permission => permission.code === code &&
    (permission.isGlobal || permission.departmentIds.length > 0)) ?? false;
}

export function isAccountAccess(value: unknown): value is AccountAccess {
  if (!value || typeof value !== 'object') return false;
  const { grants, permissions } = value as Partial<AccountAccess>;
  return Array.isArray(grants) && grants.every(grant => grant && Number.isSafeInteger(grant.grantId) &&
    Number.isInteger(grant.roleId) && grant.roleId >= 1 && grant.roleId <= 6 && typeof grant.role === 'string' &&
    (grant.scopeType === 'GLOBAL' && grant.departmentId === null ||
      grant.scopeType === 'DEPARTMENT' && Number.isInteger(grant.departmentId) && grant.departmentId! > 0) &&
    (grant.departmentName === null || typeof grant.departmentName === 'string') &&
    Array.isArray(grant.permissions) && grant.permissions.every(code => typeof code === 'string')) &&
    Array.isArray(permissions) && permissions.every(permission => permission && typeof permission.code === 'string' &&
      typeof permission.description === 'string' && typeof permission.isGlobal === 'boolean' &&
      Array.isArray(permission.departmentIds) && permission.departmentIds.every(id => Number.isInteger(id) && id > 0));
}
