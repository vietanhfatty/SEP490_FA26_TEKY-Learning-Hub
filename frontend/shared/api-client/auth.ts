import type { UserRole } from '../types';

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

export function normalizeRole(backendRole: string): UserRole {
  const lower = backendRole.toLowerCase().trim();
  // Mapping role_id theo enum Domain UserRole: Student=1, Teacher=2, Admin=3, Parent=4, Staff=5, AcademicManager=6
  if (lower.includes('parent') || lower === '4') return 'parent';
  if (lower.includes('teach') || lower.includes('tutor') || lower.includes('gv') || lower === '2') return 'teacher';
  if (lower.includes('manager') || lower.includes('academic') || lower === '6') return 'academic_manager';
  if (lower.includes('staff') || lower.includes('giao_vu') || lower === '5') return 'staff';
  if (lower.includes('admin') || lower === '3') return 'admin';
  return 'student';
}

export async function loginApi(
  emailOrUsername: string,
  password: string,
  rememberMe = true
): Promise<LoginResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
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
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('teky_access_token', data.data.accessToken);
      storage.setItem('teky_refresh_token', data.data.refreshToken);
      storage.setItem('teky_user', JSON.stringify(data.data.user));
      const clientRole = normalizeRole(data.data.user.role);
      storage.setItem('teky_role', clientRole);
      localStorage.setItem('teky_token', data.data.accessToken);
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
      message: 'Không thể kết nối đến máy chủ API xác thực (https://localhost:7001). Đang chuyển sang chế độ dự phòng kiểm thử.',
      errors: [error instanceof Error ? error.message : 'Network error'],
    };
  }
}

export async function refreshTokenApi(): Promise<boolean> {
  const refreshToken =
    localStorage.getItem('teky_refresh_token') || sessionStorage.getItem('teky_refresh_token');

  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return false;
    const data = await response.json();
    if (data?.success && data?.data) {
      localStorage.setItem('teky_access_token', data.data.accessToken);
      localStorage.setItem('teky_refresh_token', data.data.refreshToken);
      localStorage.setItem('teky_token', data.data.accessToken);
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export async function logoutApi(): Promise<void> {
  const refreshToken =
    localStorage.getItem('teky_refresh_token') || sessionStorage.getItem('teky_refresh_token');

  if (refreshToken) {
    try {
      await fetch(`${API_BASE_URL}/auth/revoke-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // ignore
    }
  }

  localStorage.removeItem('teky_access_token');
  localStorage.removeItem('teky_refresh_token');
  localStorage.removeItem('teky_user');
  localStorage.removeItem('teky_role');
  localStorage.removeItem('teky_token');
  sessionStorage.clear();
}

