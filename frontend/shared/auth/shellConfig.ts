import type { UserRole } from '../types';

/**
 * Loại ứng dụng (Shell) chịu trách nhiệm hiển thị giao diện cho từng nhóm vai trò.
 * - `portal`:    Học sinh & Phụ huynh (localhost:3000)
 * - `backoffice`: Giáo viên, Giáo vụ, QL Học thuật, Quản trị hệ thống (localhost:3001)
 */
export type ShellApp = 'portal' | 'backoffice';

export interface ShellTarget {
  /** Ứng dụng nào chịu trách nhiệm render giao diện cho vai trò này. */
  app: ShellApp;
  /** Đường dẫn nội bộ của dashboard tương ứng trong ứng dụng đó. */
  path: string;
  /** Nhãn hiển thị cho vai trò (tiếng Việt). */
  label: string;
  /** Nhãn tiếng Anh dùng cho tiêu đề tài liệu / breadcrumb. */
  labelEn: string;
}

/**
 * Bảng ánh xạ vai trò -> Shell đích.
 * Nguồn sự thật về ID là enum Domain `UserRole` (Student=1, Teacher=2, Admin=3, Parent=4, Staff=5, AcademicManager=6).
 */
export const SHELL_BY_ROLE: Record<UserRole, ShellTarget> = {
  student: { app: 'portal', path: '/student', label: 'Học sinh', labelEn: 'Student' },
  parent: { app: 'portal', path: '/parent', label: 'Phụ huynh', labelEn: 'Parent' },
  teacher: { app: 'backoffice', path: '/teacher', label: 'Giáo viên', labelEn: 'Teacher' },
  staff: { app: 'backoffice', path: '/staff', label: 'Giáo vụ', labelEn: 'Staff' },
  academic_manager: { app: 'backoffice', path: '/academic-manager', label: 'Quản lý học thuật', labelEn: 'Academic Manager' },
  admin: { app: 'backoffice', path: '/admin', label: 'Quản trị hệ thống', labelEn: 'System Admin' },
};

/**
 * Danh sách vai trò thuộc mỗi Shell, dùng cho `RoleGuard`.
 */
export const ROLES_BY_SHELL: Record<ShellApp, UserRole[]> = {
  portal: ['student', 'parent'],
  backoffice: ['teacher', 'staff', 'academic_manager', 'admin'],
};

function readEnv(key: string): string | undefined {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return env?.[key];
}

/** Origin của Portal (Học sinh & Phụ huynh). */
export const PORTAL_ORIGIN = readEnv('VITE_PORTAL_ORIGIN') ?? 'http://localhost:3000';

/** Origin của Backoffice (Giáo viên, Giáo vụ, QL Học thuật, Quản trị). */
export const BACKOFFICE_ORIGIN = readEnv('VITE_BACKOFFICE_ORIGIN') ?? 'http://localhost:3001';

/**
 * Trả về Shell đích cho một vai trò.
 * Vai trò không xác định sẽ mặc định về dashboard của Học sinh.
 */
export function resolveShellForRole(role: UserRole | null | undefined): ShellTarget {
  if (!role) {
    return { app: 'portal', path: '/login', label: 'Đăng nhập', labelEn: 'Login' };
  }
  return SHELL_BY_ROLE[role] ?? { app: 'portal', path: '/login', label: 'Đăng nhập', labelEn: 'Login' };
}

/**
 * Origin của ứng dụng chứa Shell đích.
 */
export function shellOrigin(app: ShellApp): string {
  return app === 'portal' ? PORTAL_ORIGIN : BACKOFFICE_ORIGIN;
}

/**
 * Kiểm tra Shell đích có thuộc ứng dụng hiện tại hay không.
 *
 * @param currentApp ứng dụng đang chạy (xác định qua biến môi trường build).
 */
export function isShellInCurrentApp(currentApp: ShellApp, target: ShellTarget): boolean {
  return currentApp === target.app;
}

/**
 * Xác định ứng dụng hiện tại từ biến môi trường `VITE_APP_SHELL`.
 * Mặc định suy ra từ hostname: cổng 3001 -> backoffice, còn lại -> portal.
 */
export function detectCurrentShell(): ShellApp {
  const configured = readEnv('VITE_APP_SHELL');
  if (configured === 'portal' || configured === 'backoffice') {
    return configured;
  }

  if (typeof window !== 'undefined') {
    if (window.location.port === '3001') {
      return 'backoffice';
    }
    if (window.location.port === '3000') {
      return 'portal';
    }
  }

  return 'portal';
}
