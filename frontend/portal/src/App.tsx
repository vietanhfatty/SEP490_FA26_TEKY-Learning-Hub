import { AccountPage } from '@teky/shared/account/AccountPage';
import { RecoveryPage } from '@teky/shared/account/RecoveryPage';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { HomePage } from './pages/home/HomePage';
import { LoginPage } from './pages/auth/LoginPage';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { ParentDashboard } from './pages/parent/ParentDashboard';
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
  return <RoleGuard allowedRoles={['student', 'parent']}><Navigate to={target.path} replace /></RoleGuard>;
}

export function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);
  const navigate = useNavigate();
  const isAccountVisible = useAuth().isLoggedIn;
  const { isLoggedIn, role, accessToken, refreshToken, user, logout } = useAuth();

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {isAccountVisible && <a href="/account" className="fixed bottom-4 left-4 z-50 rounded-xl bg-blue-700 px-4 py-3 text-white shadow-md focus-visible:ring-2">Tài khoản</a>}
      <Routes>
        <Route path="/account" element={<AccountPage />} />
        <Route path="/forgot-password" element={<RecoveryPage />} />
        {/* Trang chủ dùng chung cho mọi khách ghé thăm */}
        <Route
          path="/"
          element={
            <HomePage
              isLoggedIn={isLoggedIn}
              onNavigate={(view) => {
                if (view === 'dashboard') {
                  if (role) {
                    navigateToShell(role);
                  } else {
                    navigate('/login');
                  }
                } else if (view === 'login') {
                  navigate('/login');
                } else {
                  navigate('/');
                }
              }}
            />
          }
        />

        {/* Cổng đăng nhập Universal Login - dùng chung cho mọi vai trò */}
        <Route
          path="/login"
          element={
            <LoginPage
              onNavigateHome={() => navigate('/')}
              onLoginSuccess={(resolvedRole, token) => navigateToShell(resolvedRole, token)}
            />
          }
        />

        {/* Dashboard Học sinh - chỉ dành cho role student */}
        <Route
          path="/student"
          element={
            <RoleGuard
              allowedRoles={['student']}
              fallback={
                <Forbidden
                  currentRoleLabel={role ? resolveShellForRole(role).label : undefined}
                  targetShellLabel={resolveShellForRole('student').label}
                  onRedirect={() => role ? navigateToShell(role) : navigate('/login')}
                />
              }
            >
              <LmsShell
                currentRole="student"
                userName={user?.fullName}
                userEmail={user?.email}
                isDarkMode={isDarkMode}
                onToggleTheme={() => setIsDarkMode((previous) => !previous)}
                onLogout={logout}
              >
                {(activeNavId, onSelectNav) => <StudentDashboard key={activeNavId} activeNavId={activeNavId} onSelectNav={onSelectNav} />}
              </LmsShell>
            </RoleGuard>
          }
        />

        {/* Dashboard Phụ huynh - chỉ dành cho role parent */}
        <Route
          path="/parent"
          element={
            <RoleGuard
              allowedRoles={['parent']}
              fallback={
                <Forbidden
                  currentRoleLabel={role ? resolveShellForRole(role).label : undefined}
                  targetShellLabel={resolveShellForRole('parent').label}
                  onRedirect={() => role ? navigateToShell(role) : navigate('/login')}
                />
              }
            >
              <LmsShell
                currentRole="parent"
                userName={user?.fullName}
                userEmail={user?.email}
                isDarkMode={isDarkMode}
                onToggleTheme={() => setIsDarkMode((previous) => !previous)}
                onLogout={logout}
              >
                {(activeNavId) => <ParentDashboard activeNavId={activeNavId} />}
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
