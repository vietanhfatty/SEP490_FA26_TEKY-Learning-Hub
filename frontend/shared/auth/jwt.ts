import type { UserRole } from '../types';

/**
 * Cấu trúc claim rút gọn từ JWT Access Token do backend phát.
 * Backend phát: nameid, email, unique_name (ClaimTypes.Name), role, role_id, role_name, jti, exp.
 */
export interface JwtClaims {
  userId?: string;
  email?: string;
  fullName?: string;
  role?: string;
  roleId?: number;
  roleName?: string;
  expiresAt?: number;
  jwtId?: string;
}

/**
 * Key URI đầy đủ của ClaimTypes.Role do ASP.NET Core sinh ra khi map claim.
 * Khi token được serialize, key này thường bị rút gọn thành "role" nhưng không phải lúc nào cũng.
 */
const ROLE_CLAIM_URI = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
const NAME_ID_CLAIM_URI = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier';
const EMAIL_CLAIM_URI = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress';
const UNIQUE_NAME_CLAIM_URI = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name';

/**
 * Mapping role_id -> vai trò. Nguồn sự thật là enum Domain `UserRole`:
 * Student=1, Teacher=2, Admin=3, Parent=4, Staff=5, AcademicManager=6.
 */
const ROLE_ID_MAP: Record<number, UserRole> = {
  1: 'student',
  2: 'teacher',
  3: 'admin',
  4: 'parent',
  5: 'staff',
  6: 'academic_manager',
};

/**
 * Chuyển base64url thành base64 chuẩn để `atob` giải mã được.
 */
function base64UrlDecode(segment: string): string {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');

  const binary = atob(padded);

  // Giải mã UTF-8 để hỗ trợ tiếng Việt trong FullName
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new TextDecoder('utf-8').decode(bytes);
}

function readClaim(payload: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

/**
 * Giải mã payload của JWT Access Token mà không cần thêm thư viện ngoài.
 *
 * Lưu ý: hàm này CHỈ giải mã (decode), KHÔNG xác thực chữ ký.
 * Việc xác thực chữ ký vẫn do backend thực hiện khi xử lý request.
 *
 * @returns đối tượng claim, hoặc `null` nếu token không hợp lệ / không phải JWT.
 */
export function decodeJwtClaims(token: string | null | undefined): JwtClaims | null {
  if (!token) {
    return null;
  }

  const segments = token.split('.');
  if (segments.length < 2) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(segments[1])) as Record<string, unknown>;

    const roleIdRaw = readClaim(payload, 'role_id');
    const parsedRoleId = roleIdRaw !== undefined ? Number(roleIdRaw) : typeof payload.role_id === 'number' ? payload.role_id : Number.NaN;

    const expRaw = readClaim(payload, 'exp');
    const parsedExp = expRaw !== undefined ? Number(expRaw) : typeof payload.exp === 'number' ? payload.exp : Number.NaN;

    return {
      userId: readClaim(payload, 'nameid', 'user_id', NAME_ID_CLAIM_URI),
      email: readClaim(payload, 'email', EMAIL_CLAIM_URI),
      fullName: readClaim(payload, 'unique_name', 'name', UNIQUE_NAME_CLAIM_URI),
      role: readClaim(payload, 'role', ROLE_CLAIM_URI),
      roleId: Number.isNaN(parsedRoleId) ? undefined : parsedRoleId,
      roleName: readClaim(payload, 'role_name'),
      expiresAt: Number.isNaN(parsedExp) ? undefined : parsedExp,
      jwtId: readClaim(payload, 'jti'),
    };
  } catch {
    return null;
  }
}

/**
 * Kiểm tra token đã hết hạn chưa.
 * Token demo (không phải JWT) sẽ được coi là hết hạn vì không đọc được `exp`.
 */
export function isTokenExpired(token: string | null | undefined, clockSkewSeconds = 0): boolean {
  const claims = decodeJwtClaims(token);
  if (!claims?.expiresAt) {
    return true;
  }

  const expiresAtMs = claims.expiresAt * 1000;
  return Date.now() >= expiresAtMs - clockSkewSeconds * 1000;
}

/**
 * Suy ra vai trò từ claim trong JWT.
 *
 * Thứ tự ưu tiên:
 * 1. `role_id` -> map theo enum Domain (đáng tin cậy nhất).
 * 2. `role_name` -> chuẩn hoá chuỗi.
 * 3. `role` -> chuẩn hoá chuỗi.
 */
export function roleFromClaims(claims: JwtClaims | null | undefined): UserRole | null {
  if (!claims) {
    return null;
  }

  if (claims.roleId !== undefined) {
    const mapped = ROLE_ID_MAP[claims.roleId];
    if (mapped) {
      return mapped;
    }
  }

  const fromName = normalizeRoleString(claims.roleName);
  if (fromName) {
    return fromName;
  }

  return normalizeRoleString(claims.role);
}

/**
 * Chuẩn hoá chuỗi vai trò về `UserRole`.
 * Nhận cả dạng PascalCase từ bảng Roles ("AcademicManager") lẫn snake_case ("academic_manager").
 */
export function normalizeRoleString(raw: string | null | undefined): UserRole | null {
  if (!raw) {
    return null;
  }

  const normalized = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');

  switch (normalized) {
    case 'student':
    case 'hocsinh':
    case 'học_sinh':
      return 'student';
    case 'teacher':
    case 'tutor':
    case 'gv':
    case 'giangvien':
    case 'giảng_viên':
      return 'teacher';
    case 'admin':
    case 'administrator':
    case 'systemadmin':
    case 'quantri':
    case 'quản_trị':
      return 'admin';
    case 'parent':
    case 'guardian':
    case 'phuhuynh':
    case 'phụ_huynh':
      return 'parent';
    case 'staff':
    case 'giao_vu':
    case 'operations':
      return 'staff';
    case 'academicmanager':
    case 'academic_manager':
    case 'manager':
    case 'academic':
    case 'qlhocthuat':
    case 'ql_hoc_thuat':
      return 'academic_manager';
    default:
      return null;
  }
}
