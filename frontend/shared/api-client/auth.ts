import type { UserRole } from '../types';
import { decodeJwtClaims, isTokenExpired, normalizeRoleString, roleFromClaims } from '../auth/jwt';
import type { JwtClaims } from '../auth/jwt';

export interface AuthUserData {
  userId: number;
  email: string;
  fullName: string;
  role: string;
  roleId: number;
  avatarUrl?: string;
  phone?: string;
  status: string;
  themeMode: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data?: {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
    user: AuthUserData;
  };
  errors?: string[];
}

/**
 * Base URL của backend API.
 *
 * Ưu tiên `VITE_API_BASE_URL` từ biến môi trường của Vite, sau đó tới `window._env_`
 * (cơ chế runtime config), cuối cùng là đường dẫn tương đối `/api` để đi qua
 * dev-server proxy của từng app (portal: 3000, backoffice: 3001, app gốc: 5173).
 */
export const API_BASE_URL =
  (import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' &&
    (window as unknown as { _env_?: { VITE_API_BASE_URL?: string } })._env_?.VITE_API_BASE_URL) ||
  '/api';

export function normalizeRole(backendRole: string): UserRole | null {
  return normalizeRoleString(backendRole);
}

export function clearAuthSession(): void {
  for (const storage of [localStorage, sessionStorage]) {
    for (const key of ['teky_access_token', 'teky_refresh_token', 'teky_user', 'teky_role', 'teky_token', 'teky_logged_out']) storage.removeItem(key);
  }
}

export interface VerifiedSession {
  accessToken: string;
  refreshToken: string | null;
  claims: JwtClaims;
  role: UserRole;
  user: AuthUserData;
}

/** Decoding is only a format check. /auth/me verifies the signature and live account on the server. */
export async function verifySession(accessToken: string, refreshToken: string | null): Promise<VerifiedSession> {
  const claims = decodeJwtClaims(accessToken);
  const role = roleFromClaims(claims);
  if (!claims || !role || !claims.userId || isTokenExpired(accessToken)) throw new Error('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
  const response = await fetch(`${API_BASE_URL}/auth/me`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store', signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('Không thể xác thực phiên đăng nhập. Vui lòng đăng nhập lại.');
  const result = await response.json();
  const user = result?.data as AuthUserData | undefined;
  if (!result?.success || !user || user.status !== 'Active' || String(user.userId) !== claims.userId ||
      roleFromClaims({ roleId: user.roleId }) !== role || normalizeRole(user.role) !== role || isTokenExpired(accessToken)) {
    throw new Error('Quyền tài khoản đã thay đổi hoặc không hợp lệ. Vui lòng đăng nhập lại.');
  }
  return { accessToken, refreshToken, claims, role, user };
}

export async function loginApi(
  emailOrUsername: string,
  password: string,
  rememberMe = true
): Promise<LoginResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emailOrUsername: emailOrUsername.trim(),
        password,
        rememberMe,
      }),
    });

    const data = await response.json().catch(() => null);

    if (response.ok && data?.success && data?.data) {
      clearAuthSession();
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('teky_access_token', data.data.accessToken);
      storage.setItem('teky_refresh_token', data.data.refreshToken);
      storage.setItem('teky_user', JSON.stringify(data.data.user));
      storage.setItem('teky_token', data.data.accessToken);
      return data;
    }

    return {
      success: false,
      message: data?.message || `Đăng nhập không thành công (HTTP ${response.status})`,
      errors: data?.errors,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: 'Không thể kết nối đến máy chủ xác thực. Vui lòng thử lại sau.',
      errors: [error instanceof Error ? error.message : 'Network error'],
    };
  }
}

let pendingRefresh: Promise<boolean> | null = null;
export function refreshTokenApi(): Promise<boolean> {
  pendingRefresh ??= performRefresh().finally(() => { pendingRefresh = null; });
  return pendingRefresh;
}

async function performRefresh(): Promise<boolean> {
  const refreshToken =
    localStorage.getItem('teky_refresh_token') || sessionStorage.getItem('teky_refresh_token');

  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return false;
    const data = await response.json();
    if (data?.success && data?.data) {
      // A logout or a newer login must not be overwritten by an old refresh response.
      if ((localStorage.getItem('teky_refresh_token') || sessionStorage.getItem('teky_refresh_token')) !== refreshToken) return false;
      const storage = localStorage.getItem('teky_refresh_token') ? localStorage : sessionStorage;
      storage.setItem('teky_access_token', data.data.accessToken);
      storage.setItem('teky_refresh_token', data.data.refreshToken);
      storage.setItem('teky_user', JSON.stringify(data.data.user));
      storage.setItem('teky_token', data.data.accessToken);
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export interface LogoutOptions {
  allDevices?: boolean;
}

export async function logoutApi(options?: LogoutOptions): Promise<void> {
  const refreshToken =
    localStorage.getItem('teky_refresh_token') || sessionStorage.getItem('teky_refresh_token');
  const accessToken =
    localStorage.getItem('teky_access_token') ||
    sessionStorage.getItem('teky_access_token') ||
    localStorage.getItem('teky_token') ||
    sessionStorage.getItem('teky_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // End the local session before network I/O; an old logout must not erase a newer login.
  clearAuthSession();
  try {
    localStorage.setItem('teky_logout_event', Date.now().toString());
    localStorage.removeItem('teky_logout_event');
  } catch {
    // Storage notifications are best effort.
  }

  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers,
      body: JSON.stringify({
        refreshToken: refreshToken || null,
        allDevices: options?.allDevices ?? false,
      }),
    });
  } catch {
    if (refreshToken) {
      try {
        await fetch(`${API_BASE_URL}/auth/revoke-token`, {
          method: 'POST',
          signal: AbortSignal.timeout(15000),
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // ignore
      }
    }
  }
}
