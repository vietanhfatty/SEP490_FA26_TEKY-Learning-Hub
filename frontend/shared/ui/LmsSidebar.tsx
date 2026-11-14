import React from 'react';
import type { UserRole } from '../types';
import {
  IconGraduationCap,
  IconHome,
  IconBookOpen,
  IconCalendar,
  IconCheckCircle,
  IconTrophy,
  IconSparkles,
  IconUsers,
  IconShieldCheck,
  IconActivity,
  IconCreditCard,
  IconFileText,
  IconLogOut,
  IconChevronLeft,
  IconChevronRight,
  IconSun,
  IconMoon,
  IconVideo,
} from './Icons';
import { Badge } from './Badge';

export interface LmsNavItem {
  id: string;
  label: string;
  icon: React.FC<{ size?: number; className?: string }>;
  badge?: string;
  badgeVariant?: 'info' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral';
}

interface LmsSidebarProps {
  currentRole: UserRole;
  activeNavId: string;
  onSelectNav: (id: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onLogoutClick: () => void;
  onRoleChange?: (role: UserRole) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  userName?: string;
  userEmail?: string;
}

export const ROLE_DISPLAY_CONFIG: Record<
  UserRole,
  {
    label: string;
    badge: 'info' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral';
    defaultName: string;
    avatarEmoji: string;
    campus: string;
  }
> = {
  student: {
    label: 'Học sinh',
    badge: 'info',
    defaultName: 'Nguyễn Minh Quân',
    avatarEmoji: '👦',
    campus: 'Cơ sở Cầu Giấy (HN) & Online',
  },
  parent: {
    label: 'Phụ huynh',
    badge: 'accent',
    defaultName: 'Trần Thu Trang',
    avatarEmoji: '👩',
    campus: 'Phụ huynh em Nguyễn Minh Quân',
  },
  teacher: {
    label: 'Giảng viên',
    badge: 'success',
    defaultName: 'Thầy Hoàng Văn Nam',
    avatarEmoji: '👨‍🏫',
    campus: 'Khoa Lập trình & Robotics',
  },
  staff: {
    label: 'Giáo vụ',
    badge: 'info',
    defaultName: 'Nguyễn Thu Nga',
    avatarEmoji: '👩‍💼',
    campus: 'Phòng Đào tạo & Khảo thí',
  },
  academic_manager: {
    label: 'Quản lý học thuật',
    badge: 'warning',
    defaultName: 'Đỗ Thị Hồng',
    avatarEmoji: '👩‍💻',
    campus: 'Hội đồng chuyên môn CSTA',
  },
  admin: {
    label: 'Quản trị hệ thống',
    badge: 'neutral',
    defaultName: 'Admin Kỹ Thuật',
    avatarEmoji: '🛡️',
    campus: 'TEKY HQ Network & Security',
  },
};

export const getNavItemsForRole = (role: UserRole): LmsNavItem[] => {
  switch (role) {
    case 'student':
      return [
        { id: 'overview', label: 'Lớp học của em', icon: IconHome },
        { id: 'courses', label: 'Khóa học của tôi', icon: IconBookOpen },
        { id: 'live', label: 'Lớp học trực tuyến', icon: IconVideo },
        { id: 'assignments', label: 'Dự án & Bài tập', icon: IconFileText, badge: '1 Cần nộp', badgeVariant: 'warning' },
        { id: 'achievements', label: 'Bảng vàng & Huy hiệu', icon: IconTrophy },
        { id: 'resources', label: 'Kho tài liệu STEAM', icon: IconSparkles },
      ];
    case 'teacher':
      return [
        { id: 'overview', label: 'Bảng điều khiển', icon: IconHome },
        { id: 'schedule', label: 'Lịch dạy trong tuần', icon: IconCalendar, badge: '4 Ca học', badgeVariant: 'info' },
        { id: 'attendance', label: 'Điểm danh lớp học', icon: IconCheckCircle, badge: 'Hôm nay', badgeVariant: 'accent' },
        { id: 'materials', label: 'Kho giáo án chuẩn', icon: IconBookOpen },
        { id: 'grading', label: 'Đánh giá & Nhận xét', icon: IconSparkles },
        { id: 'swap', label: 'Đổi ca & Dạy bù', icon: IconActivity },
      ];
    case 'parent':
      return [
        { id: 'overview', label: 'Tổng quan con em', icon: IconHome },
        { id: 'attendance', label: 'Lịch học & Chuyên cần', icon: IconCalendar },
        { id: 'feedback', label: 'Nhận xét từ Thầy cô', icon: IconFileText, badge: 'Mới', badgeVariant: 'success' },
        { id: 'competency', label: 'Báo cáo năng lực 5D', icon: IconSparkles },
        { id: 'tuition', label: 'Học phí & Hóa đơn', icon: IconCreditCard },
      ];
    case 'academic_manager':
      return [
        { id: 'kpi', label: 'Chỉ số học thuật', icon: IconHome },
        { id: 'timetable', label: 'Xếp lịch & Xung đột', icon: IconCalendar, badge: '2 Cảnh báo', badgeVariant: 'danger' },
        { id: 'courses', label: 'Quản lý Khóa học', icon: IconBookOpen },
        { id: 'teachers', label: 'Điều phối Giảng viên', icon: IconUsers },
        { id: 'surveys', label: 'Khảo sát chất lượng', icon: IconSparkles },
      ];
    case 'admin':
    case 'staff':
      return [
        { id: 'overview', label: 'Giám sát hệ thống', icon: IconHome },
        { id: 'users', label: 'Người dùng & Phân quyền', icon: IconUsers, badge: '512 HS', badgeVariant: 'info' },
        { id: 'branches', label: 'Quản lý cơ sở', icon: IconBookOpen },
        { id: 'audit', label: 'Nhật ký bảo mật', icon: IconShieldCheck, badge: 'Live', badgeVariant: 'success' },
      ];
    default:
      return [{ id: 'overview', label: 'Tổng quan', icon: IconHome }];
  }
};

export const LmsSidebar: React.FC<LmsSidebarProps> = ({
  currentRole,
  activeNavId,
  onSelectNav,
  isCollapsed,
  onToggleCollapse,
  onLogoutClick,
  onRoleChange,
  isDarkMode,
  onToggleTheme,
  userName,
  userEmail,
}) => {
  const roleConfig = ROLE_DISPLAY_CONFIG[currentRole] ?? ROLE_DISPLAY_CONFIG.student;
  const navItems = getNavItemsForRole(currentRole);
  const displayName = userName || roleConfig.defaultName;

  return (
    <aside
      className={`fixed lg:sticky top-0 left-0 z-40 h-screen flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-200 ease-out shadow-sm ${
        isCollapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* 1. LMS Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-blue-700 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <IconGraduationCap size={22} />
          </div>
          {!isCollapsed && (
            <div className="truncate">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">TEKY</span>
                <span className="font-bold text-[10px] px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  LMS
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate font-medium">STEAM Learning Hub</p>
            </div>
          )}
        </div>

        <button
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
        >
          {isCollapsed ? <IconChevronRight size={18} /> : <IconChevronLeft size={18} />}
        </button>
      </div>

      {/* 2. User & Active Role Card */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800/80">
        <div
          className={`rounded-2xl transition-all ${
            isCollapsed
              ? 'p-2 flex flex-col items-center justify-center'
              : 'p-3 bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                currentRole === 'student'
                  ? 'bg-orange-100 dark:bg-orange-950/40 text-orange-600'
                  : currentRole === 'teacher'
                  ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-600'
                  : currentRole === 'parent'
                  ? 'bg-pink-100 dark:bg-pink-950/40 text-pink-600'
                  : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600'
              }`}
            >
              {roleConfig.avatarEmoji}
            </div>

            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{displayName}</h4>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant={roleConfig.badge} className="text-[10px] py-0 px-1.5">
                    {roleConfig.label}
                  </Badge>
                  {userEmail && <span className="text-[10px] text-slate-400 truncate">{userEmail}</span>}
                </div>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 truncate font-medium flex items-center gap-1">
              <span>📍</span> {roleConfig.campus}
            </p>
          )}
        </div>

        {/* Quick Role Switcher for Demo/Testing */}
        {onRoleChange && !isCollapsed && (
          <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/50">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 px-1 font-medium">
              <span>Thử nghiệm vai trò:</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">1-Click</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {(['student', 'parent', 'teacher', 'academic_manager', 'admin'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => onRoleChange(r)}
                  className={`px-1.5 py-1 rounded-lg text-[10px] font-medium transition-all truncate text-center ${
                    currentRole === r
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {ROLE_DISPLAY_CONFIG[r].label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Navigation Links List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1.5">
        <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {!isCollapsed ? 'Chức năng học tập LMS' : '•'}
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeNavId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectNav(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
            >
              <Icon size={18} className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
              {!isCollapsed && (
                <>
                  <span className="truncate flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <Badge
                      variant={item.badgeVariant || 'info'}
                      className={`text-[10px] py-0 px-1.5 ${isActive ? 'bg-white/20 text-white border-white/30' : ''}`}
                    >
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* 4. Interactive Bottom Widget / Support */}
      {!isCollapsed && (
        <div className="p-3 mx-3 mb-2 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/60 dark:from-slate-800 dark:to-slate-800/80 border border-blue-100 dark:border-slate-700 text-xs">
          {currentRole === 'student' ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white text-[11px]">
                <span>🔥 Chuỗi học tập</span>
                <span className="text-orange-500">8 Ngày liên tiếp</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                Hoàn thành buổi học hôm nay để nhận thêm +50 XP!
              </p>
            </div>
          ) : currentRole === 'teacher' ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white text-[11px]">
                <span>👨‍🏫 Phòng Giáo Vụ</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Trực tuyến</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                Hotline hỗ trợ lớp học online: 1900-8888 (Nhánh 2).
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white text-[11px]">
                <span>🟢 Hệ thống TEKY</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Hoạt động tốt</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                Phiên bản v2.4.0 • Tiêu chuẩn giáo trình CSTA
              </p>
            </div>
          )}
        </div>
      )}

      {/* 5. Sidebar Footer: Theme Toggle & Logout Button */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <button
          onClick={onToggleTheme}
          title={isDarkMode ? 'Chuyển sang chế độ Sáng' : 'Chuyển sang chế độ Tối'}
          className={`p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
            isCollapsed ? 'w-full flex justify-center' : ''
          }`}
        >
          {isDarkMode ? <IconSun size={18} /> : <IconMoon size={18} />}
        </button>

        {!isCollapsed && (
          <button
            onClick={onLogoutClick}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/40 transition-colors"
          >
            <IconLogOut size={16} />
            <span>Đăng xuất</span>
          </button>
        )}
      </div>
    </aside>
  );
};

