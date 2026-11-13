import React, { useState } from 'react';
import type { UserRole } from '../types';
import {
  IconMenu,
  IconSearch,
  IconBell,
  IconSun,
  IconMoon,
  IconLogOut,
  IconChevronDown,
} from './Icons';
import { ROLE_DISPLAY_CONFIG } from './LmsSidebar';

interface LmsHeaderProps {
  currentRole: UserRole;
  activeNavTitle: string;
  onToggleSidebarMobile: () => void;
  onLogoutClick: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  userName?: string;
}

export const LmsHeader: React.FC<LmsHeaderProps> = ({
  currentRole,
  activeNavTitle,
  onToggleSidebarMobile,
  onLogoutClick,
  isDarkMode,
  onToggleTheme,
  userName,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const roleConfig = ROLE_DISPLAY_CONFIG[currentRole] ?? ROLE_DISPLAY_CONFIG.student;
  const displayName = userName || roleConfig.defaultName;

  const mockNotifications = [
    {
      id: 1,
      title: 'Nhận xét mới từ Thầy Hoàng Văn Nam',
      desc: 'Lớp Scratch Game 3.0: "Em hoàn thành bài tập rất tốt, đạt điểm 10/10!"',
      time: '15 phút trước',
      type: 'feedback',
    },
    {
      id: 2,
      title: 'Lớp học trực tuyến sắp bắt đầu',
      desc: 'Buổi 10: Xử lý va chạm nhân vật sẽ bắt đầu lúc 14:00.',
      time: '45 phút nữa',
      type: 'class',
    },
    {
      id: 3,
      title: 'Đã mở khóa Huy hiệu mới',
      desc: '🏆 Chăm chỉ 100%: Điểm danh đầy đủ 8 buổi liên tiếp!',
      time: 'Hôm qua',
      type: 'badge',
    },
  ];

  return (
    <header className="sticky top-0 z-30 h-16 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md transition-colors duration-150">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Mobile Sidebar Trigger & Breadcrumb */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebarMobile}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <IconMenu size={20} />
          </button>

          <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-400 dark:text-slate-500">LMS</span>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <span className="font-semibold text-slate-600 dark:text-slate-300">{roleConfig.label}</span>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">{activeNavTitle}</span>
          </nav>
        </div>

        {/* Center: Global Instant Search (LMS Navigation Search) */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <IconSearch size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm nhanh khóa học, bài học, tài liệu STEAM... (⌘K)"
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-100/80 dark:bg-slate-800/80 border border-transparent focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Right: Actions, Live Status, Notifications & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live class indicator for Student / Teacher */}
          {(currentRole === 'student' || currentRole === 'teacher') && (
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-800/40 text-xs">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
              </span>
              <span className="font-bold text-orange-700 dark:text-orange-300 text-[11px]">
                {currentRole === 'student' ? 'Lớp Scratch 3.0: 14:00' : 'Ca dạy Online: 14:00'}
              </span>
              <button
                onClick={() => alert('Đang chuyển hướng vào phòng học trực tuyến TEKY...')}
                className="px-2 py-0.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-[10px] transition-colors"
              >
                Vào lớp →
              </button>
            </div>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            aria-label="Đổi giao diện sáng/tối"
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isDarkMode ? <IconSun size={18} /> : <IconMoon size={18} />}
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
              }}
              title="Thông báo học tập"
              className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <IconBell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500"></span>
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-900/10 p-4 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">Thông báo mới</h4>
                    <span className="px-1.5 py-0.2 rounded-full bg-orange-100 text-orange-600 font-bold text-[10px]">
                      3 chưa đọc
                    </span>
                  </div>
                  <button
                    onClick={() => alert('Đã đánh dấu đọc tất cả')}
                    className="text-[11px] text-blue-600 hover:underline font-semibold"
                  >
                    Đọc tất cả
                  </button>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-700/60 max-h-72 overflow-y-auto">
                  {mockNotifications.map((n) => (
                    <div key={n.id} className="py-2.5 space-y-1 hover:bg-slate-50 dark:hover:bg-slate-700/40 p-2 rounded-xl transition-colors cursor-pointer">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">{n.title}</span>
                        <span className="text-[10px] text-slate-400">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{n.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill & Dropdown */}
          <div className="relative pl-1 border-l border-slate-200 dark:border-slate-800">
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2.5 p-1.5 sm:px-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-sm flex items-center justify-center flex-shrink-0">
                {roleConfig.avatarEmoji}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[120px]">
                  {displayName}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">{roleConfig.label}</p>
              </div>
              <IconChevronDown size={14} className="text-slate-400 hidden sm:block" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-900/10 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700/80">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{displayName}</p>
                  <p className="text-[11px] text-slate-400 truncate">{roleConfig.campus}</p>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      alert('Mở trang quản lý hồ sơ tài khoản...');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                  >
                    👤 Thông tin cá nhân
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      alert('Mở thiết lập bảo mật & đổi mật khẩu...');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                  >
                    🔒 Đổi mật khẩu
                  </button>
                </div>

                <div className="pt-1 border-t border-slate-100 dark:border-slate-700/80">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogoutClick();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <IconLogOut size={16} />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
