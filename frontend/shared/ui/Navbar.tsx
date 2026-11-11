import React from 'react';
import type { UserRole } from '../../types';
import { IconBell, IconMoon, IconSun, IconLogOut, IconGraduationCap, IconLogIn } from './Icons';
import { Badge } from './Badge';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  currentRole: UserRole;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  isLoggedIn: boolean;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  currentRole,
  isDarkMode,
  onToggleTheme,
  isLoggedIn,
  onLogout,
}) => {
  const roleDisplayNames: Record<UserRole, { label: string; badge: 'info' | 'accent' | 'success' | 'warning' | 'neutral' }> = {
    student: { label: 'Học sinh', badge: 'info' },
    parent: { label: 'Phụ huynh', badge: 'accent' },
    teacher: { label: 'Giảng viên', badge: 'success' },
    academic_manager: { label: 'Quản lý học thuật', badge: 'warning' },
    admin: { label: 'Quản trị hệ thống', badge: 'neutral' },
  };

  const roleUserNames: Record<UserRole, string> = {
    student: 'Nguyễn Minh Quân',
    parent: 'Trần Thu Trang',
    teacher: 'Thầy Hoàng Văn Nam',
    academic_manager: 'Đỗ Thị Hồng',
    admin: 'Admin Kỹ Thuật',
  };

  const handleCoursesClick = () => {
    if (currentView !== 'home') {
      onNavigate('home');
      setTimeout(() => {
        document.getElementById('courses-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById('courses-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md transition-colors duration-150">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo - Public Common */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('home')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
            <IconGraduationCap size={24} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">TEKY</span>
              <span className="font-semibold text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">HUB</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block font-medium">STEAM Learning & Online Tutor</p>
          </div>
        </div>

        {/* Common Navigation Links (Public & Authenticated) */}
        <nav className="flex items-center gap-1 sm:gap-2 text-xs font-medium">
          <button
            onClick={() => onNavigate('home')}
            className={`px-3 py-2 rounded-xl transition-all ${
              currentView === 'home'
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Trang chủ
          </button>

          <button
            onClick={handleCoursesClick}
            className="px-3 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all hidden sm:block"
          >
            Khóa học STEAM
          </button>

          {/* Dashboard Link only appears when logged in */}
          {isLoggedIn && (
            <button
              onClick={() => onNavigate('dashboard')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                currentView === 'dashboard'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200'
              }`}
            >
              <span>Bảng điều khiển</span>
              <Badge variant={roleDisplayNames[currentRole].badge} className="text-[10px] py-0 px-1.5">
                {roleDisplayNames[currentRole].label}
              </Badge>
            </button>
          )}
        </nav>

        {/* Action Controls & Authentication Profile */}
        <div className="flex items-center gap-2.5">
          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            aria-label="Toggle Theme"
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isDarkMode ? <IconSun size={18} /> : <IconMoon size={18} />}
          </button>

          {/* User Status / Login State */}
          {isLoggedIn ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              {/* Notification icon */}
              <button
                aria-label="Notifications"
                className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <IconBell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500"></span>
              </button>

              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-900 dark:text-white">{roleUserNames[currentRole]}</p>
                <Badge variant={roleDisplayNames[currentRole].badge} className="mt-0.5 text-[10px]">
                  {roleDisplayNames[currentRole].label}
                </Badge>
              </div>

              <button
                onClick={onLogout}
                title="Đăng xuất"
                className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                <IconLogOut size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onNavigate('login')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 ${
                currentView === 'login'
                  ? 'bg-blue-700 text-white ring-2 ring-blue-400'
                  : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.98]'
              }`}
            >
              <IconLogIn size={15} />
              <span>Đăng nhập</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
