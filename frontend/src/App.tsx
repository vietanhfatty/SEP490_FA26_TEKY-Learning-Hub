import { useState, useEffect } from 'react';
import type { UserRole } from './types';
import { logoutApi } from './services/auth';
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

export function App() {
  const [currentView, setCurrentView] = useState<'home' | 'login' | 'dashboard'>(() => window.location.pathname.startsWith('/dashboard/timetable') ? 'dashboard' : 'home');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // RBAC State: Persistent authentication & Role binding
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return !!(sessionStorage.getItem('teky_access_token') || localStorage.getItem('teky_access_token') || localStorage.getItem('teky_token'));
  });

  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    return ((sessionStorage.getItem('teky_role') || localStorage.getItem('teky_role')) as UserRole) || 'student';
  });

  const [currentUser, setCurrentUser] = useState<{ fullName?: string; email?: string } | null>(() => {
    try {
      const saved = (sessionStorage.getItem('teky_user') || localStorage.getItem('teky_user'));
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const roleLabels: Record<UserRole, string> = {
    student: 'Học sinh',
    parent: 'Phụ huynh',
    teacher: 'Giáo viên',
    staff: 'Giáo vụ / Staff',
    academic_manager: 'Quản lý học thuật',
    admin: 'Quản trị hệ thống',
  };

  const roleBadges: Record<UserRole, 'info' | 'accent' | 'success' | 'warning' | 'neutral'> = {
    student: 'info',
    parent: 'accent',
    teacher: 'success',
    staff: 'info',
    academic_manager: 'warning',
    admin: 'neutral',
  };

  const userInfo: Record<UserRole, { name: string; email: string }> = {
    student: { name: 'Nguyễn Minh Quân (9 tuổi)', email: 'student@teky.edu.vn' },
    parent: { name: 'Trần Thu Trang (Phụ huynh bé Quân)', email: 'parent@teky.edu.vn' },
    teacher: { name: 'Thầy Hoàng Văn Nam (Giảng viên STEAM)', email: 'teacher@teky.edu.vn' },
    staff: { name: 'Nguyễn Thu Nga (Giáo vụ cơ sở)', email: 'staff@teky.edu.vn' },
    academic_manager: { name: 'Đỗ Thị Hồng (Trưởng ban Đào tạo)', email: 'manager@teky.edu.vn' },
    admin: { name: 'Admin Kỹ Thuật (System Admin)', email: 'admin@teky.edu.vn' },
  };

  const handleLoginSuccess = (role: UserRole) => {
    setCurrentRole(role);
    setIsLoggedIn(true);
    try {
      const saved = (sessionStorage.getItem('teky_user') || localStorage.getItem('teky_user'));
      if (saved) setCurrentUser(JSON.parse(saved));
    } catch {
      // ignore
    }
    setCurrentView('dashboard');
  };

  useEffect(() => {
    if (currentView === 'home' && window.location.pathname.startsWith('/dashboard/timetable')) {
      window.history.replaceState({}, '', '/');
    }
    if (currentView === 'dashboard' && isLoggedIn && currentRole === 'student'
      && !window.location.pathname.startsWith('/dashboard/timetable')) {
      window.history.replaceState({}, '', '/dashboard/timetable');
    }
  }, [currentView, isLoggedIn, currentRole]);

  useEffect(() => {
    const onPopState = () => setCurrentView(window.location.pathname.startsWith('/dashboard/timetable') ? 'dashboard' : 'home');
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleLogout = async () => {
    await logoutApi();
    setIsLoggedIn(false);
    setCurrentUser(null);
    setCurrentView('login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-150">
      {/* Universal Polished Navbar (Shared for public and auth) */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => {
          if (view === 'dashboard' && !isLoggedIn) {
            setCurrentView('login');
          } else {
            setCurrentView(view as 'home' | 'login' | 'dashboard');
          }
        }}
        currentRole={currentRole}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* 1. Trang chủ dùng chung */}
        {currentView === 'home' && (
          <HomePage
            onNavigate={(view) => {
              if (view === 'dashboard' && !isLoggedIn) {
                setCurrentView('login');
              } else {
                setCurrentView(view as 'home' | 'login' | 'dashboard');
              }
            }}
            isLoggedIn={isLoggedIn}
          />
        )}

        {/* 2. Trang đăng nhập dùng chung */}
        {currentView === 'login' && (
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            onNavigateHome={() => setCurrentView('home')}
          />
        )}

        {/* 3. Bảng điều khiển (Được bảo vệ nghiêm ngặt theo phân quyền RBAC) */}
        {currentView === 'dashboard' && (
          <div className="space-y-6">
            {!isLoggedIn ? (
              <div className="max-w-md mx-auto my-16 p-8 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center mb-4">
                  <IconShieldCheck size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Bảo vệ quyền truy cập (RBAC Guard)</h3>
                <p className="text-xs text-slate-500 mt-2 mb-6">
                  Bạn cần đăng nhập bằng tài khoản được phân quyền hợp lệ để truy cập Bảng điều khiển nghiệp vụ.
                </p>
                <button
                  onClick={() => setCurrentView('login')}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm"
                >
                  Đăng nhập tài khoản
                </button>
              </div>
            ) : (
              <>
                {/* RBAC Session Identification Banner */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                      <IconShieldCheck size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                          Bảng điều khiển {roleLabels[currentRole]}
                        </h2>
                        <Badge variant={roleBadges[currentRole]}>Phân quyền RBAC</Badge>
                      </div>
                      <p className="text-xs text-slate-500">
                        Phiên làm việc: <span className="font-semibold text-slate-700 dark:text-slate-300">{currentUser?.fullName || userInfo[currentRole].name}</span> ({currentUser?.email || userInfo[currentRole].email})
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

                {/* Render the appropriate Dashboard component strictly bound to RBAC */}
                {currentRole === 'student' && <StudentDashboard />}
                {currentRole === 'parent' && <ParentDashboard />}
                {currentRole === 'teacher' && <TeacherDashboard />}
                {currentRole === 'staff' && <StaffDashboard />}
                {currentRole === 'academic_manager' && <AcademicManagerDashboard />}
                {currentRole === 'admin' && <AdminDashboard />}
              </>
            )}
          </div>
        )}
      </main>

      {/* Universal Footer */}
      <Footer />
    </div>
  );
}

export default App;
