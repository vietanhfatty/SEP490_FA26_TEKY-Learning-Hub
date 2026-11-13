import React from 'react';
import { useAuth } from './authContext';
import type { UserRole } from '../types';
import { detectCurrentShell, resolveShellForRole, shellOrigin } from './shellConfig';
import { buildCrossAppUrl } from './shellTransfer';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Chặn truy cập theo vai trò.
 *
 * - Nếu chưa đăng nhập -> hiển thị `fallback` (mặc định thông báo từ chối).
 * - Nếu vai trò không được phép -> chuyển hướng tới Shell đúng của vai trò đó.
 *   Khi Shell đích nằm ở ứng dụng khác, thực hiện full-page redirect kèm phiên đăng nhập.
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  children,
  fallback = (
    <div className="p-8 text-center text-rose-500 font-semibold">Bạn không có quyền truy cập trang này.</div>
  ),
}) => {
  const { role, isLoggedIn, accessToken, refreshToken, user } = useAuth();

  if (!isLoggedIn || !role) {
    return <>{fallback}</>;
  }

  if (!allowedRoles.includes(role)) {
    const target = resolveShellForRole(role);
    const currentApp = detectCurrentShell();

    if (currentApp !== target.app && typeof window !== 'undefined') {
      const redirectUrl = accessToken
        ? buildCrossAppUrl(shellOrigin(target.app), target.path, {
            accessToken,
            refreshToken: refreshToken ?? undefined,
            role,
            user: user ?? undefined,
          })
        : `${shellOrigin(target.app)}${target.path}`;

      window.location.assign(redirectUrl);
      return null;
    }

    return <>{fallback}</>;
  }

  return <>{children}</>;
};
