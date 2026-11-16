import { AcceptInvitationPage } from '@teky/shared/account/AcceptInvitationPage';
import { RecoveryPage } from '@teky/shared/account/RecoveryPage';
import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from '@teky/shared/auth/AuthProvider';
import { useAuth } from '@teky/shared/auth/authContext';
import { resolveShellForRole, shellOrigin } from '@teky/shared/auth/shellConfig';
import { buildCrossAppUrl } from '@teky/shared/auth/shellTransfer';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { HomePage } from './components/pages/HomePage';
import { CourseCatalogPage, CourseDetailPage } from '@teky/shared/public/CourseCatalogPage';
import { LoginPage } from './components/pages/LoginPage';

/** Old dashboard links enter the same session handoff as a successful login. */
function DashboardRedirect() {
  const { isLoggedIn, role, accessToken, refreshToken } = useAuth();
  const location = useLocation();
  useEffect(() => {
    if (!isLoggedIn || !role || !accessToken) return;
    const target = resolveShellForRole(role);
    const path = role === 'system_admin' && location.pathname === '/dashboard/admin/directory'
      ? '/admin/directory' : target.path;
    const search = role === 'system_admin' && location.pathname === '/dashboard/admin' ? location.search : '';
    window.location.replace(buildCrossAppUrl(shellOrigin(target.app), path + search, {
      accessToken, refreshToken: refreshToken ?? undefined,
    }));
  }, [isLoggedIn, role, accessToken, refreshToken, location.pathname, location.search]);
  if (!isLoggedIn || !role) return <Navigate to="/login" replace />;
  return <p role="status">Đang chuyển đến giao diện của bạn…</p>;
}

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { isLoggedIn, role: currentRole, user: currentUser, logout } = useAuth();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (location.pathname === '/login') document.title = 'Đăng nhập | TEKY Learning Hub';
    if (location.pathname === '/forgot-password') document.title = 'Khôi phục mật khẩu | TEKY Learning Hub';
  }, [location.pathname]);
  useEffect(() => { document.documentElement.classList.toggle('dark', isDarkMode); }, [isDarkMode]);

  const openDashboard = useCallback(() => { navigate('/dashboard', { replace: true }); }, [navigate]);
  const handleNavigate = useCallback((view: string) => {
    if (view === 'dashboard') navigate(isLoggedIn ? '/dashboard' : '/login');
    else if (view === 'courses') navigate('/courses');
    else if (view === 'login') navigate('/login');
    else navigate('/landing');
  }, [isLoggedIn, navigate]);

  return <div className={`public-site${isDarkMode ? ' public-dark' : ''}`}>
    <Navbar currentView={location.pathname} onNavigate={handleNavigate} currentRole={currentRole}
      userName={currentUser?.fullName} isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode(value => !value)}
      isLoggedIn={isLoggedIn} onLogout={logout} />
    <main id="public-content" className="public-main">
      <Routes>
        <Route path="/" element={<Navigate to="/landing" replace />} />
        <Route path="/landing" element={<HomePage onNavigate={handleNavigate} isLoggedIn={isLoggedIn} />} />
        <Route path="/courses" element={<CourseCatalogPage />} />
        <Route path="/courses/:courseId" element={<CourseDetailPage isLoggedIn={isLoggedIn} onAccessLearning={() => handleNavigate('dashboard')} />} />
        <Route path="/login" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <LoginPage onLoginSuccess={openDashboard} onNavigateHome={() => navigate('/landing')} />} />
        <Route path="/forgot-password" element={<RecoveryPage />} />
        <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
        <Route path="/dashboard/*" element={<DashboardRedirect />} />
        <Route path="*" element={<Navigate to="/landing" replace />} />
      </Routes>
    </main>
    <Footer />
  </div>;
}

export function App() {
  return <BrowserRouter><AuthProvider><AppRoutes /></AuthProvider></BrowserRouter>;
}
export default App;
