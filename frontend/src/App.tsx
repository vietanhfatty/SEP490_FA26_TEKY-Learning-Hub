import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import type { UserRole } from './types';
import { logoutApi } from './services/auth';
import { decodeJwtClaims, roleFromClaims } from '@teky/shared/auth/jwt';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { Badge } from './components/common/Badge';
import { IconShieldCheck } from './components/common/Icons';
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

const ROLE_LABELS: Record<UserRole, string> = {
  student: 'Học sinh',
  parent: 'Phụ huynh',
  teacher: 'Giáo viên',
  staff: 'Giáo vụ / Staff',
  academic_manager: 'Quản lý học thuật',
  admin: 'Quản trị hệ thống',
};

const ROLE_BADGES: Record<UserRole, 'info' | 'accent' | 'success' | 'warning' | 'neutral'> = {
  student: 'info',
  parent: 'accent',
  teacher: 'success',
  staff: 'info',
  academic_manager: 'warning',
  admin: 'neutral',
};

interface SessionUser {
  fullName?: string;
  email?: string;
}

/**
 * Đọc phiên đăng nhập hiện tại từ token lưu trong storage.
 * Vai trò luôn được suy ra từ CLAIM trong JWT, fallback về `localStorage` cho token demo.
 */
function readSession(): { isLoggedIn: boolean; role: UserRole; user: SessionUser | null } {
  const token = localStorage.getItem('teky_access_token') || localStorage.getItem('teky_token');

  let user: SessionUser | null = null;
  try {
    const raw = localStorage.getItem('teky_user');
    if (raw) {
      user = JSON.parse(raw) as SessionUser;
    }
  } catch {
    // Dữ liệu `teky_user` bị hỏng -> bỏ qua, coi như chưa đăng nhập có thông tin người dùng.
  }

  const claimRole = roleFromClaims(decodeJwtClaims(token));
  const storedRole = localStorage.getItem('teky_role') as UserRole | null;

  return {
    isLoggedIn: !!token,
    role: claimRole ?? storedRole ?? 'student',
    user,
  };
}

function AppRoutes() {
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [session, setSession] = useState(() => readSession());

  const { isLoggedIn, role: currentRole, user: currentUser } = session;

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
      setSession(readSession());
      goToDashboard(resolvedRole);
    },
    [goToDashboard]
  );

  const handleLogout = useCallback(async () => {
    await logoutApi();
    setSession({ isLoggedIn: false, role: 'student', user: null });
    navigate('/login');
  }, [navigate]);

  /** Điều hướng dùng chung cho Navbar / HomePage (view: 'home' | 'login' | 'dashboard'). */
  const handleNavigate = useCallback(
    (view: string) => {
      if (view === 'dashboard') {
        if (isLoggedIn) {
          goToDashboard(currentRole);
        } else {
          navigate('/login');
        }
      } else if (view === 'login') {
        navigate('/login');
      } else {
        navigate('/');
      }
    },
    [isLoggedIn, currentRole, goToDashboard, navigate]
  );

  /** Bảo vệ RBAC: chỉ render dashboard khi đã đăng nhập. */
  const renderGuardedDashboard = (allowedRole: UserRole, dashboard: React.ReactNode) => {
    if (!isLoggedIn) {
      return (
        <div className="max-w-md mx-auto my-16 p-8 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center mb-4">
            <IconShieldCheck size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Bảo vệ quyền truy cập (RBAC Guard)
          </h3>
          <p className="text-xs text-slate-500 mt-2 mb-6">
            Bạn cần đăng nhập bằng tài khoản được phân quyền hợp lệ để truy cập Bảng điều khiển nghiệp vụ.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm"
          >
            Đăng nhập tài khoản
          </button>
        </div>
      );
    }

    if (currentRole !== allowedRole) {
      // Sai vai trò -> chuyển tới dashboard đúng của vai trò đang có trong claim JWT.
      return <Navigate to={DASHBOARD_PATH_BY_ROLE[currentRole] ?? '/dashboard/student'} replace />;
    }

    return dashboard;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-150">
      {/* Universal Polished Navbar (Shared for public and auth) */}
      <Navbar
        currentView={
          typeof window !== 'undefined' ? window.location.pathname : 'home'
        }
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
          {/* 1. Trang chủ dùng chung */}
          <Route
            path="/"
            element={
              <HomePage onNavigate={handleNavigate} isLoggedIn={isLoggedIn} />
            }
          />

          {/* 2. Trang đăng nhập dùng chung */}
          <Route
            path="/login"
            element={
              <LoginPage
                onLoginSuccess={handleLoginSuccess}
                onNavigateHome={() => navigate('/')}
              />
            }
          />

          {/* 3. Bảng điều khiển được bảo vệ nghiêm ngặt theo phân quyền RBAC */}
          <Route
            path="/dashboard/student"
            element={renderGuardedDashboard('student', <StudentDashboard />)}
          />
          <Route
            path="/dashboard/parent"
            element={renderGuardedDashboard('parent', <ParentDashboard />)}
          />
          <Route
            path="/dashboard/teacher"
            element={renderGuardedDashboard('teacher', <TeacherDashboard />)}
          />
          <Route
            path="/dashboard/staff"
            element={renderGuardedDashboard('staff', <StaffDashboard />)}
          />
          <Route
            path="/dashboard/academic-manager"
            element={
              renderGuardedDashboard('academic_manager', <AcademicManagerDashboard />)
            }
          />
          <Route
            path="/dashboard/admin"
            element={renderGuardedDashboard('admin', <AdminDashboard />)}
          />

          {/* Đường dẫn lạ -> dẫn về dashboard theo vai trò trong claim JWT */}
          <Route
            path="*"
            element={
              isLoggedIn ? (
                <Navigate to={DASHBOARD_PATH_BY_ROLE[currentRole] ?? '/dashboard/student'} replace />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Routes>

        {/* Banner nhận diện phiên RBAC - chỉ hiển thị khi đã đăng nhập */}
        {isLoggedIn && (
          <div className="mt-6 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <IconShieldCheck size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Bảng điều khiển {ROLE_LABELS[currentRole]}
                  </h2>
                  <Badge variant={ROLE_BADGES[currentRole]}>Phân quyền RBAC</Badge>
                </div>
                <p className="text-xs text-slate-500">
                  Phiên làm việc:{' '}
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {currentUser?.fullName ?? 'Người dùng TEKY'}
                  </span>{' '}
                  ({currentUser?.email ?? '—'})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleLogout}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 transition"
              >
                Đăng xuất tài khoản
              </button>
            </div>
          </div>
        )}
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
