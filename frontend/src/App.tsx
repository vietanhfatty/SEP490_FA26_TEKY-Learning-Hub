import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import type { UserRole } from './types';
import { logoutApi } from './services/auth';
import { decodeJwtClaims, roleFromClaims } from '@teky/shared/auth/jwt';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { IconShieldCheck } from './components/common/Icons';
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

interface SessionUser {
  fullName?: string;
  email?: string;
}

/**
 * Đọc phiên đăng nhập hiện tại từ token lưu trong storage.
 * Hỗ trợ chế độ demo mặc định để người dùng mở localhost:5173 là vào ngay LMS nguyên bản.
 */
function readSession(): { isLoggedIn: boolean; role: UserRole; user: SessionUser | null } {
  const isExplicitlyLoggedOut = localStorage.getItem('teky_logged_out') === 'true';
  const token =
    localStorage.getItem('teky_access_token') ||
    sessionStorage.getItem('teky_access_token') ||
    localStorage.getItem('teky_token') ||
    sessionStorage.getItem('teky_token');

  let user: SessionUser | null = null;
  try {
    const raw = localStorage.getItem('teky_user') || sessionStorage.getItem('teky_user');
    if (raw) {
      user = JSON.parse(raw) as SessionUser;
    }
  } catch {
    // ignore
  }

  const claimRole = roleFromClaims(decodeJwtClaims(token));
  const storedRole = (localStorage.getItem('teky_role') || sessionStorage.getItem('teky_role')) as UserRole | null;

  // Nếu người dùng chủ động đăng xuất -> chuyển về trạng thái khách chưa đăng nhập
  if (isExplicitlyLoggedOut) {
    return {
      isLoggedIn: false,
      role: 'student',
      user: null,
    };
  }

  // Mặc định cung cấp phiên trải nghiệm LMS với quyền Học sinh (hoặc vai trò đã lưu)
  return {
    isLoggedIn: true,
    role: claimRole ?? storedRole ?? 'student',
    user: user ?? {
      fullName: 'Nguyễn Minh Quân (Học sinh)',
      email: 'quan.nm@teky.edu.vn',
    },
  };
}

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [session, setSession] = useState(() => readSession());

  const { isLoggedIn, role: currentRole, user: currentUser } = session;
  const isDashboardRoute = location.pathname.startsWith('/dashboard') || location.pathname === '/';

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Đồng bộ đa tab: Nhận diện sự kiện đăng xuất từ tab trình duyệt khác
  useEffect(() => {
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'teky_logout_event' || (e.key === 'teky_access_token' && !e.newValue)) {
        localStorage.setItem('teky_logged_out', 'true');
        setSession({ isLoggedIn: false, role: 'student', user: null });
        navigate('/login');
      }
    };
    window.addEventListener('storage', handleStorageEvent);
    return () => window.removeEventListener('storage', handleStorageEvent);
  }, [navigate]);

  /** Điều hướng tới dashboard đúng của vai trò hiện tại. */
  const goToDashboard = useCallback(
    (targetRole: UserRole) => {
      navigate(DASHBOARD_PATH_BY_ROLE[targetRole] ?? '/dashboard/student');
    },
    [navigate]
  );

  const handleLoginSuccess = useCallback(
    (resolvedRole: UserRole) => {
      localStorage.removeItem('teky_logged_out');
      setSession(readSession());
      goToDashboard(resolvedRole);
    },
    [goToDashboard]
  );

  const handleLogout = useCallback(async () => {
    localStorage.setItem('teky_logged_out', 'true');
    await logoutApi();
    setSession({ isLoggedIn: false, role: 'student', user: null });
    navigate('/login');
  }, [navigate]);

  /** Chuyển đổi vai trò linh hoạt cho trải nghiệm đánh giá toàn diện */
  const handleRoleChange = useCallback(
    (newRole: UserRole) => {
      localStorage.removeItem('teky_logged_out');
      localStorage.setItem('teky_role', newRole);
      setSession((prev) => ({ ...prev, role: newRole, isLoggedIn: true }));
      goToDashboard(newRole);
    },
    [goToDashboard]
  );

  /** Điều hướng dùng chung cho Navbar / HomePage */
  const handleNavigate = useCallback(
    (view: string) => {
      if (view === 'dashboard') {
        goToDashboard(currentRole);
      } else if (view === 'login') {
        navigate('/login');
      } else {
        navigate('/landing');
      }
    },
    [currentRole, goToDashboard, navigate]
  );

  // 1. GIAO DIỆN HỆ THỐNG LMS: Mặc định hiển thị không gian LMS chuyên nghiệp
  if (isLoggedIn && isDashboardRoute) {
    return (
      <LmsShell
        currentRole={currentRole}
        userName={currentUser?.fullName}
        userEmail={currentUser?.email}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        onLogout={handleLogout}
        onRoleChange={handleRoleChange}
      >
        {(activeNavId) => (
          <Routes>
            <Route path="/" element={<Navigate to={DASHBOARD_PATH_BY_ROLE[currentRole] ?? '/dashboard/student'} replace />} />
            <Route path="/dashboard/student" element={<StudentDashboard activeNavId={activeNavId} />} />
            <Route path="/dashboard/parent" element={<ParentDashboard activeNavId={activeNavId} />} />
            <Route path="/dashboard/teacher" element={<TeacherDashboard activeNavId={activeNavId} />} />
            <Route path="/dashboard/staff" element={<StaffDashboard activeNavId={activeNavId} />} />
            <Route
              path="/dashboard/academic-manager"
              element={<AcademicManagerDashboard activeNavId={activeNavId} />}
            />
            <Route path="/dashboard/admin" element={<AdminDashboard activeNavId={activeNavId} />} />
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
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <Routes>
          {/* Trang chủ giới thiệu */}
          <Route path="/" element={<Navigate to="/dashboard/student" replace />} />
          <Route path="/landing" element={<HomePage onNavigate={handleNavigate} isLoggedIn={isLoggedIn} />} />

          {/* Trang đăng nhập */}
          <Route
            path="/login"
            element={<LoginPage onLoginSuccess={handleLoginSuccess} onNavigateHome={() => navigate('/landing')} />}
          />

          {/* Khi chưa đăng nhập cố truy cập dashboard */}
          <Route
            path="/dashboard/*"
            element={
              <div className="max-w-md mx-auto my-16 p-8 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center mb-4">
                  <IconShieldCheck size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Bảo vệ quyền truy cập (RBAC Guard)</h3>
                <p className="text-xs text-slate-500 mt-2 mb-6">
                  Bạn đã đăng xuất an toàn khỏi hệ thống LMS. Vui lòng đăng nhập lại để tiếp tục phiên làm việc.
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm"
                >
                  Đăng nhập tài khoản
                </button>
              </div>
            }
          />

          {/* Đường dẫn lạ */}
          <Route path="*" element={<Navigate to="/dashboard/student" replace />} />
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
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
