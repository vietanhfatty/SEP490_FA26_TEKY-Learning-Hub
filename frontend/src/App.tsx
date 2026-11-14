import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import type { UserRole } from './types';
import { AuthProvider } from '@teky/shared/auth/AuthProvider';
import { useAuth } from '@teky/shared/auth/authContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { LmsShell } from './components/common/LmsShell';
import { HomePage } from './components/pages/HomePage';
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
  const isDashboardRoute = location.pathname.startsWith('/dashboard') || location.pathname === '/';

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
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-150">
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <Routes>
          {/* Trang chủ giới thiệu */}
          <Route path="/" element={<Navigate to={currentRole ? DASHBOARD_PATH_BY_ROLE[currentRole] : "/login"} replace />} />
          <Route path="/landing" element={<HomePage onNavigate={handleNavigate} isLoggedIn={isLoggedIn} />} />

          {/* Trang đăng nhập */}
          <Route
            path="/login"
            element={<LoginPage onLoginSuccess={handleLoginSuccess} onNavigateHome={() => navigate('/landing')} />}
          />

          <Route path="/dashboard/*" element={<Navigate to="/login" replace />} />

          {/* Đường dẫn lạ */}
          <Route path="*" element={<Navigate to={currentRole ? DASHBOARD_PATH_BY_ROLE[currentRole] : "/login"} replace />} />
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
