import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import type { UserRole } from './types';
import { AuthProvider } from '@teky/shared/auth/AuthProvider';
import { useAuth } from '@teky/shared/auth/authContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { LmsShell } from './components/common/LmsShell';
import { HomePage } from './components/pages/HomePage';
import { CourseCatalogPage, CourseDetailPage } from '@teky/shared/public/CourseCatalogPage';
import { LoginPage } from './components/pages/LoginPage';
import { StudentDashboard } from './components/pages/StudentDashboard';
import { ParentDashboard } from './components/pages/ParentDashboard';
import { TeacherDashboard } from './components/pages/TeacherDashboard';
import { AcademicManagerDashboard } from './components/pages/AcademicManagerDashboard';
import { StaffDashboard } from './components/pages/StaffDashboard';
import { AdminDashboard } from './components/pages/AdminDashboard';

/** Đường dẫn dashboard của từng vai trò trong app hợp nhất. */
const DASHBOARD_PATH_BY_ROLE: Record<UserRole, string> = {
  student: '/dashboard/student',
  parent: '/dashboard/parent',
  teacher: '/dashboard/teacher',
  staff: '/dashboard/staff',
  academic_manager: '/dashboard/academic-manager',
  admin: '/dashboard/admin',
};

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { isLoggedIn, role: currentRole, user: currentUser, logout } = useAuth();
  const isDashboardRoute = location.pathname.startsWith('/dashboard');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (location.pathname === '/login') document.title = 'Đăng nhập | TEKY Learning Hub';
    if (location.pathname === '/forgot-password') document.title = 'Khôi phục mật khẩu | TEKY Learning Hub';
  }, [location.pathname]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  /** Điều hướng tới dashboard đúng của vai trò hiện tại. */
  const goToDashboard = useCallback(
    (targetRole: UserRole) => {
      navigate(DASHBOARD_PATH_BY_ROLE[targetRole] ?? '/dashboard/student');
    },
    [navigate]
  );

  const handleLoginSuccess = useCallback(
    (resolvedRole: UserRole) => {
      goToDashboard(resolvedRole);
    },
    [goToDashboard]
  );

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/login');
  }, [logout, navigate]);

  /** Điều hướng dùng chung cho Navbar / HomePage */
  const handleNavigate = useCallback(
    (view: string) => {
      if (view === 'dashboard') {
        if (currentRole) goToDashboard(currentRole);
        else navigate('/login');
      } else if (view === 'courses') {
        navigate('/courses');
      } else if (view === 'login') {
        navigate('/login');
      } else {
        navigate('/landing');
      }
    },
    [currentRole, goToDashboard, navigate]
  );

  // Reject unauthorized URLs before mounting any dashboard or its data requests.
  if (isDashboardRoute && (!isLoggedIn || !currentRole)) return <Navigate to="/login" replace />;
  if (isDashboardRoute && currentRole && location.pathname !== '/' && location.pathname !== DASHBOARD_PATH_BY_ROLE[currentRole]) {
    return <Navigate to={DASHBOARD_PATH_BY_ROLE[currentRole]} replace />;
  }
  if (isLoggedIn && currentRole && isDashboardRoute) {
    return (
      <LmsShell
        currentRole={currentRole}
        userName={currentUser?.fullName}
        userEmail={currentUser?.email}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        onLogout={handleLogout}
      >
        {(activeNavId, onSelectNav) => (
          <Routes>
            <Route path="/" element={<Navigate to={DASHBOARD_PATH_BY_ROLE[currentRole] ?? '/dashboard/student'} replace />} />
            <Route path="/dashboard/student" element={<StudentDashboard key={activeNavId} activeNavId={activeNavId} onSelectNav={onSelectNav} />} />
            <Route path="/dashboard/parent" element={<ParentDashboard activeNavId={activeNavId} />} />
            <Route path="/dashboard/teacher" element={<TeacherDashboard activeNavId={activeNavId} />} />
            <Route path="/dashboard/staff" element={<StaffDashboard activeNavId={activeNavId} />} />
            <Route
              path="/dashboard/academic-manager"
              element={<AcademicManagerDashboard activeNavId={activeNavId} />}
            />
            <Route path="/dashboard/admin" element={<AdminDashboard activeNavId={activeNavId} userName={currentUser?.fullName} onSelectNav={onSelectNav} />} />
            <Route
              path="*"
              element={<Navigate to={DASHBOARD_PATH_BY_ROLE[currentRole] ?? '/dashboard/student'} replace />}
            />
          </Routes>
        )}
      </LmsShell>
    );
  }

  // 2. GIAO DIỆN TRANG CHỦ & ĐĂNG NHẬP (Công khai khi chủ động đăng xuất hoặc xem trang Landing)
  return (
    <div className={`public-site${isDarkMode ? ' public-dark' : ''}`}>
      {/* Universal Polished Navbar */}
      <Navbar
        currentView={location.pathname}
        onNavigate={handleNavigate}
        currentRole={currentRole}
        userName={currentUser?.fullName}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main id="public-content" className="public-main">
        <Routes>
          {/* Trang chủ giới thiệu */}
          <Route path="/" element={<Navigate to="/landing" replace />} />
          <Route path="/landing" element={<HomePage onNavigate={handleNavigate} isLoggedIn={isLoggedIn} />} />
          <Route path="/courses" element={<CourseCatalogPage />} />
          <Route path="/courses/:courseId" element={<CourseDetailPage isLoggedIn={isLoggedIn} onAccessLearning={() => handleNavigate('dashboard')} />} />

          {/* Trang đăng nhập */}
          <Route
            path="/login"
            element={<LoginPage onLoginSuccess={handleLoginSuccess} onNavigateHome={() => navigate('/landing')} />}
          />

          <Route path="/dashboard/*" element={<Navigate to="/login" replace />} />

          {/* Đường dẫn lạ */}
          <Route path="*" element={<Navigate to="/landing" replace />} />
        </Routes>
      </main>

      {/* Universal Footer */}
      <Footer />
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider><AppRoutes /></AuthProvider>
    </BrowserRouter>
  );
}

export default App;
