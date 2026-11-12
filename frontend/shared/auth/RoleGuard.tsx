import React from 'react';
import { useAuth } from './AuthProvider';
import type { UserRole } from '../types';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  children,
  fallback = <div className="p-8 text-center text-rose-500 font-semibold">Bạn không có quyền truy cập trang này.</div>,
}) => {
  const { role, isLoggedIn } = useAuth();

  if (!isLoggedIn || !role || !allowedRoles.includes(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

