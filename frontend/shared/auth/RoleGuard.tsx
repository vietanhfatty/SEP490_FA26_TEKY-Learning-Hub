import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
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
  const { role, isLoggedIn, isInitializing, accessToken, refreshToken, user } = useAuth();
  const target = resolveShellForRole(role);
  const shouldTransfer = isLoggedIn && !!role && !allowedRoles.includes(role) && detectCurrentShell() !== target.app;
  useEffect(() => {
    if (!shouldTransfer || !accessToken) return;
    window.location.assign(buildCrossAppUrl(shellOrigin(target.app), target.path, {
      accessToken, refreshToken: refreshToken ?? undefined, role: role ?? undefined, user: user ?? undefined,
    }));
  }, [shouldTransfer, accessToken, refreshToken, role, user, target.app, target.path]);

  if (isInitializing) return <div role="status">Đang xác thực phiên đăng nhập…</div>;

  if (!isLoggedIn || !role) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    if (shouldTransfer) return <div role="status">Đang chuyển đến giao diện của bạn…</div>;

    return <>{fallback}</>;
  }

  return <>{children}</>;
};
