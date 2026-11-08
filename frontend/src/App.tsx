import { useState, useEffect } from 'react';
import type { UserRole } from './types';
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
import { AdminDashboard } from './components/pages/AdminDashboard';

export function App() {
  const [currentView, setCurrentView] = useState<'home' | 'login' | 'dashboard'>('home');
  const [currentRole, setCurrentRole] = useState<UserRole>('student');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

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
    academic_manager: 'Quản lý học thuật',
    admin: 'Quản trị hệ thống',
  };

  const roleBadges: Record<UserRole, 'info' | 'accent' | 'success' | 'warning' | 'neutral'> = {
    student: 'info',
    parent: 'accent',
    teacher: 'success',
    academic_manager: 'warning',
    admin: 'neutral',
  };

  const userInfo: Record<UserRole, { name: string; email: string }> = {
    student: { name: 'Nguyễn Minh Quân (9 tuổi)', email: 'student@teky.edu.vn' },
    parent: { name: 'Trần Thu Trang (Phụ huynh bé Quân)', email: 'parent@teky.edu.vn' },
    teacher: { name: 'Thầy Hoàng Văn Nam (Giảng viên STEAM)', email: 'teacher@teky.edu.vn' },
    academic_manager: { name: 'Đỗ Thị Hồng (Trưởng ban Đào tạo)', email: 'manager@teky.edu.vn' },
    admin: { name: 'Admin Kỹ Thuật (System Admin)', email: 'admin@teky.edu.vn' },
  };

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    setIsLoggedIn(true);
    setCurrentView('dashboard');
  };

  const handleLoginSuccess = (role: UserRole) => {
    setCurrentRole(role);
    setIsLoggedIn(true);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
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

        {/* 3. Bảng điều khiển (Chỉ chia role ở Dashboard) */}
        {currentView === 'dashboard' && (
          <div className="space-y-6">
            {/* RBAC Role Context Switcher Banner inside Dashboard */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <IconShieldCheck size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      Bảng điều khiển: {roleLabels[currentRole]}
                    </h2>
                    <Badge variant={roleBadges[currentRole]}>RBAC</Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    Tài khoản: <span className="font-semibold text-slate-700 dark:text-slate-300">{userInfo[currentRole].name}</span> ({userInfo[currentRole].email})
                  </p>
                </div>
              </div>

              {/* Role Switcher specifically inside Dashboard */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-700/50 rounded-xl text-xs overflow-x-auto">
                <span className="text-[11px] font-semibold text-slate-400 px-2 whitespace-nowrap">Chuyển vai trò:</span>
                {(['student', 'parent', 'teacher', 'academic_manager', 'admin'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRoleChange(r)}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all font-medium ${
                      currentRole === r
                        ? 'bg-blue-600 text-white shadow-sm font-semibold'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {roleLabels[r]}
                  </button>
                ))}
              </div>
            </div>

            {/* Render the appropriate Dashboard component */}
            {currentRole === 'student' && <StudentDashboard />}
            {currentRole === 'parent' && <ParentDashboard />}
            {currentRole === 'teacher' && <TeacherDashboard />}
            {currentRole === 'academic_manager' && <AcademicManagerDashboard />}
            {currentRole === 'admin' && <AdminDashboard />}
          </div>
        )}
      </main>

      {/* Persistent Quick Demo Floating Pill (Bottom Right) */}
      <aside aria-label="Demo Navigation" className="fixed bottom-4 right-4 z-50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl flex items-center gap-1.5 text-[11px] font-semibold">
        <span className="text-slate-400 pl-2 pr-1">Chuyển nhanh:</span>
        <button
          onClick={() => setCurrentView('home')}
          className={`px-3 py-1.5 rounded-xl transition-all ${
            currentView === 'home' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          🏠 Trang chủ (Chung)
        </button>
        <button
          onClick={() => {
            setIsLoggedIn(false);
            setCurrentView('login');
          }}
          className={`px-3 py-1.5 rounded-xl transition-all ${
            currentView === 'login' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          🔑 Đăng nhập (Chung)
        </button>
        <button
          onClick={() => {
            setIsLoggedIn(true);
            setCurrentView('dashboard');
          }}
          className={`px-3 py-1.5 rounded-xl transition-all ${
            currentView === 'dashboard' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          📊 Dashboard ({roleLabels[currentRole]})
        </button>
      </aside>

      {/* Universal Footer */}
      <Footer />
    </div>
  );
}

export default App;
