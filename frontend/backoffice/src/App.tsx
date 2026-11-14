import { AccountPage } from '@teky/shared/account/AccountPage';
import { RecoveryPage } from '@teky/shared/account/RecoveryPage';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { AcademicManagerDashboard } from './pages/academic-manager/AcademicManagerDashboard';
import { AdminDashboard } from './pages/system-admin/AdminDashboard';
import { StaffDashboard } from './pages/staff/StaffDashboard';
import { LoginPage } from './pages/auth/LoginPage';
import { RoleGuard } from '@teky/shared/auth/RoleGuard';
import { useAuth } from '@teky/shared/auth/authContext';
import { detectCurrentShell, resolveShellForRole, shellOrigin } from '@teky/shared/auth/shellConfig';
import { buildCrossAppUrl } from '@teky/shared/auth/shellTransfer';
import { Forbidden } from '@teky/shared/ui/Forbidden';
import { LmsShell } from '@teky/shared/ui/LmsShell';
import type { UserRole } from '@teky/shared/types';

/**
 * Trang đích khi truy cập một đường dẫn không xác định:
 * đọc vai trò từ claim trong JWT (AuthProvider đã suy ra) rồi điều hướng tới đúng Shell.
 */
function RoleRedirect() {
  const { role } = useAuth();
  const target = resolveShellForRole(role);
  return <RoleGuard allowedRoles={['teacher', 'staff', 'academic_manager', 'admin']}><Navigate to={target.path} replace /></RoleGuard>;
}

export function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  useEffect(() => { document.documentElement.classList.toggle('dark', isDarkMode); }, [isDarkMode]);
  const navigate = useNavigate();
  const isAccountVisible = useAuth().isLoggedIn;
  const { role, accessToken, refreshToken, user, logout } = useAuth();

  /**
   * Điều hướng tới Shell đúng của vai trò.
   *
   * - Nếu Shell nằm trong ứng dụng hiện tại -> điều hướng nội bộ (không reload trang).
   * - Nếu Shell thuộc ứng dụng khác -> full-page redirect sang origin của ứng dụng đó,
   *   mang theo phiên đăng nhập qua hash fragment (origin khác nhau không dùng chung storage).
   */
  const navigateToShell = useCallback(
    (targetRole: UserRole, tokenOverride?: string) => {
      const target = resolveShellForRole(targetRole);
      const token = tokenOverride ?? accessToken;

      if (detectCurrentShell() !== target.app) {
        const redirectUrl = token
          ? buildCrossAppUrl(shellOrigin(target.app), target.path, {
              accessToken: token,
              refreshToken: refreshToken ?? undefined,
              role: targetRole,
              user: user ?? undefined,
            })
          : `${shellOrigin(target.app)}${target.path}`;

        window.location.assign(redirectUrl);
        return;
      }

      navigate(target.path);
    },
    [navigate, accessToken, refreshToken, user]
  );

  const forbidden = (allowedLabel: string) => (
    <Forbidden
      currentRoleLabel={role ? resolveShellForRole(role).label : undefined}
      targetShellLabel={allowedLabel}
      onRedirect={() => (role ? navigateToShell(role) : navigate('/login'))}
    />
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans">
      {isAccountVisible && <a href="/account" className="fixed bottom-4 left-4 z-50 rounded-xl bg-blue-700 px-4 py-3 text-white shadow-md focus-visible:ring-2">Tài khoản</a>}
      <Routes>
        <Route path="/account" element={<AccountPage />} />
        <Route path="/forgot-password" element={<RecoveryPage />} />
        {/* Cổng đăng nhập Backoffice */}
        <Route
          path="/login"
          element={
            <LoginPage
              onNavigateHome={() => navigate('/')}
              onLoginSuccess={(resolvedRole, token) => navigateToShell(resolvedRole, token)}
            />
          }
        />

        {/* Trang chủ dùng chung - dẫn tới dashboard theo vai trò */}
        <Route path="/" element={<RoleRedirect />} />

        {/* Dashboard Giáo viên - chỉ dành cho role teacher */}
        <Route
          path="/teacher"
          element={
            <RoleGuard allowedRoles={['teacher']} fallback={forbidden('Giáo viên')}>
              <LmsShell
                currentRole="teacher"
                userName={user?.fullName}
                userEmail={user?.email}
                isDarkMode={isDarkMode}
                onToggleTheme={() => setIsDarkMode((value) => !value)}
                onLogout={logout}
              >
                {(activeNavId) => <TeacherDashboard activeNavId={activeNavId} />}
              </LmsShell>
            </RoleGuard>
          }
        />

        {/* Dashboard Giáo vụ - chỉ dành cho role staff */}
        <Route
          path="/staff"
          element={
            <RoleGuard allowedRoles={['staff']} fallback={forbidden('Giáo vụ')}>
              <LmsShell
                currentRole="staff"
                userName={user?.fullName}
                userEmail={user?.email}
                isDarkMode={isDarkMode}
                onToggleTheme={() => setIsDarkMode((value) => !value)}
                onLogout={logout}
              >
                {(activeNavId) => <StaffDashboard activeNavId={activeNavId} />}
              </LmsShell>
            </RoleGuard>
          }
        />

        {/* Dashboard Quản lý học thuật - chỉ dành cho role academic_manager */}
        <Route
          path="/academic-manager"
          element={
            <RoleGuard allowedRoles={['academic_manager']} fallback={forbidden('Quản lý học thuật')}>
              <LmsShell
                currentRole="academic_manager"
                userName={user?.fullName}
                userEmail={user?.email}
                isDarkMode={isDarkMode}
                onToggleTheme={() => setIsDarkMode((value) => !value)}
                onLogout={logout}
              >
                {(activeNavId) => <AcademicManagerDashboard activeNavId={activeNavId} />}
              </LmsShell>
            </RoleGuard>
          }
        />

        {/* Dashboard Quản trị hệ thống - chỉ dành cho role admin */}
        <Route
          path="/admin"
          element={
            <RoleGuard allowedRoles={['admin']} fallback={forbidden('Quản trị hệ thống')}>
              <LmsShell
                currentRole="admin"
                userName={user?.fullName}
                userEmail={user?.email}
                isDarkMode={isDarkMode}
                onToggleTheme={() => setIsDarkMode((value) => !value)}
                onLogout={logout}
              >
                {(activeNavId, onSelectNav) => <AdminDashboard activeNavId={activeNavId} userName={user?.fullName} onSelectNav={onSelectNav} />}
              </LmsShell>
            </RoleGuard>
          }
        />

        {/* Bất kỳ đường dẫn nào khác -> điều hướng theo vai trò trong claim JWT */}
        <Route path="*" element={<RoleRedirect />} />
      </Routes>
    </div>
  );
}

export default App;
