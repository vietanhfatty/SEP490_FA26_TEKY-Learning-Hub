import type React from 'react';
import type { UserRole } from '../types';
import {
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
  IconVideo,
  IconLayers,
  IconBell,
  IconSettings,
} from './Icons';

export interface LmsNavItem {
  id: string;
  label: string;
  icon: React.FC<{ size?: number; className?: string }>;
  badge?: string;
  badgeVariant?: 'info' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral';
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
        { id: 'overview', label: 'Home', icon: IconHome },
        { id: 'courses', label: 'My Courses', icon: IconBookOpen },
        { id: 'live', label: 'Today', icon: IconVideo },
        { id: 'assignments', label: 'Assignments', icon: IconFileText },
        { id: 'achievements', label: 'Gamification', icon: IconTrophy },
      ];
    case 'teacher':
      return [
        { id: 'overview', label: 'Home', icon: IconHome },
        { id: 'schedule', label: 'Lịch dạy trong tuần', icon: IconCalendar, badge: '4 Ca học', badgeVariant: 'info' },
        { id: 'attendance', label: 'Điểm danh lớp học', icon: IconCheckCircle, badge: 'Hôm nay', badgeVariant: 'accent' },
        { id: 'materials', label: 'Kho giáo án chuẩn', icon: IconBookOpen },
        { id: 'grading', label: 'Đánh giá & Nhận xét', icon: IconSparkles },
        { id: 'swap', label: 'Đổi ca & Dạy bù', icon: IconActivity },
      ];
    case 'parent':
      return [
        { id: 'overview', label: 'Home', icon: IconHome },
        { id: 'attendance', label: 'Lịch học & Chuyên cần', icon: IconCalendar },
        { id: 'feedback', label: 'Nhận xét từ Thầy cô', icon: IconFileText, badge: 'Mới', badgeVariant: 'success' },
        { id: 'competency', label: 'Báo cáo năng lực 5D', icon: IconSparkles },
        { id: 'tuition', label: 'Học phí & Hóa đơn', icon: IconCreditCard },
      ];
    case 'academic_manager':
      return [
        { id: 'kpi', label: 'Home', icon: IconHome },
        { id: 'timetable', label: 'Xếp lịch & Xung đột', icon: IconCalendar, badge: '2 Cảnh báo', badgeVariant: 'danger' },
        { id: 'courses', label: 'Quản lý Khóa học', icon: IconBookOpen },
        { id: 'teachers', label: 'Điều phối Giảng viên', icon: IconUsers },
        { id: 'surveys', label: 'Khảo sát chất lượng', icon: IconSparkles },
      ];
    case 'admin':
      return [
        { id: 'overview', label: 'Home', icon: IconHome },
        { id: 'users', label: 'Users', icon: IconUsers },
        { id: 'courses', label: 'Courses', icon: IconBookOpen },
        { id: 'groups', label: 'Groups', icon: IconUsers },
        { id: 'branches', label: 'Branches', icon: IconLayers },
        { id: 'notifications', label: 'Notifications', icon: IconBell },
        { id: 'audit', label: 'Reports', icon: IconActivity },
        { id: 'settings', label: 'Account & Settings', icon: IconSettings },
      ];
    case 'staff':
      return [
        { id: 'overview', label: 'Home', icon: IconHome },
        { id: 'users', label: 'Users', icon: IconUsers },
        { id: 'branches', label: 'Branches', icon: IconLayers },
        { id: 'audit', label: 'Reports', icon: IconShieldCheck },
      ];
    default:
      return [{ id: 'overview', label: 'Tổng quan', icon: IconHome }];
  }
};

