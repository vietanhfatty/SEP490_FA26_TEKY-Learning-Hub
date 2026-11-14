import { AccountPage } from '@teky/shared/account/AccountPage';
import { RecoveryPage } from '@teky/shared/account/RecoveryPage';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { HomePage } from './pages/home/HomePage';
import { CourseCatalogPage, CourseDetailPage } from '@teky/shared/public/CourseCatalogPage';
import { Navbar } from '@teky/shared/ui/Navbar';
import { Footer } from '@teky/shared/ui/Footer';
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
  const location = useLocation();
  const isPublicRoute = ['/', '/landing', '/login', '/forgot-password'].includes(location.pathname) || location.pathname.startsWith('/courses');
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (location.pathname === '/login') document.title = 'Đăng nhập | TEKY Learning Hub';
    if (location.pathname === '/forgot-password') document.title = 'Khôi phục mật khẩu | TEKY Learning Hub';
  }, [location.pathname]);
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

  const handlePublicNavigate = (view: string) => {
    if (view === 'dashboard') {
      if (role) navigateToShell(role);
      else navigate('/login');
    } else if (view === 'login') navigate('/login');
    else if (view === 'courses') navigate('/courses');
    else navigate('/');
  };
  const content = (
      <Routes>
        <Route path="/account" element={<AccountPage />} />
        <Route path="/forgot-password" element={<RecoveryPage />} />
        <Route path="/" element={<HomePage isLoggedIn={isLoggedIn} onNavigate={handlePublicNavigate} />} />
        <Route path="/landing" element={<Navigate to="/" replace />} />
        <Route path="/courses" element={<CourseCatalogPage />} />
        <Route path="/courses/:courseId" element={<CourseDetailPage isLoggedIn={isLoggedIn} onAccessLearning={() => handlePublicNavigate('dashboard')} />} />

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
        {['/student', '/dashboard/timetable/*'].map(path => (
          <Route key={path} path={path} element={
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
                onSelectNav={() => {
                  if (location.pathname.startsWith('/dashboard/timetable')) navigate('/student');
                }}
              >
                {(activeNavId, onSelectNav) => <StudentDashboard activeNavId={location.pathname.startsWith('/dashboard/timetable') ? 'overview' : activeNavId} onSelectNav={onSelectNav} />}
              </LmsShell>
            </RoleGuard>
          } />
        ))}

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
  );
  return <div className={isPublicRoute ? `public-site${isDarkMode ? ' public-dark' : ''}` : 'min-h-screen bg-slate-50 text-slate-900 font-sans'}>
    {isPublicRoute && <Navbar homePath="/" currentView={location.pathname} onNavigate={handlePublicNavigate} currentRole={role} userName={user?.fullName} isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode(previous => !previous)} isLoggedIn={isLoggedIn} onLogout={logout} />}
    {!isPublicRoute && isLoggedIn && <a href="/account" className="fixed bottom-4 left-4 z-50 rounded-xl bg-blue-700 px-4 py-3 text-white shadow-md focus-visible:ring-2">Tài khoản</a>}
    {isPublicRoute ? <main id="public-content" className="public-main">{content}</main> : content}
    {isPublicRoute && <Footer homePath="/" />}
  </div>;
}

export default App;
