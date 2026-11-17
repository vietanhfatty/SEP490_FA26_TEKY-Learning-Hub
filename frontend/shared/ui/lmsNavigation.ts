import type React from 'react';
import type { UserRole } from '../types';
import type { AccountAccess } from '../auth/accountAccess';
import { getAccessibleFeatures, getRoleFeatures } from './navigationFeatures';
import type { FeatureIcon, NavigationFeature } from './navigationFeatures';
import {
  IconHome,
  IconBookOpen,
  IconCalendar,
  IconCheckCircle,
  IconSparkles,
  IconUsers,
  IconActivity,
  IconCreditCard,
  IconFileText,
  IconLayers,
  IconBell,
  IconSettings,
} from './Icons';

export interface LmsNavItem {
  id: string;
  navId?: string;
  role?: UserRole;
  group?: string;
  href?: string;
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
  academic_staff: {
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
  system_admin: {
    label: 'Quản trị hệ thống',
    badge: 'neutral',
    defaultName: 'Admin Kỹ Thuật',
    avatarEmoji: '🛡️',
    campus: 'TEKY HQ Network & Security',
  },
};

const featureIcons: Record<FeatureIcon, LmsNavItem['icon']> = {
  home: IconHome, book: IconBookOpen, calendar: IconCalendar, check: IconCheckCircle,
  sparkles: IconSparkles, users: IconUsers, activity: IconActivity, credit: IconCreditCard,
  file: IconFileText, layers: IconLayers, bell: IconBell, settings: IconSettings,
};

export function getNavItemsForRole(role: UserRole): LmsNavItem[] {
  return getRoleFeatures(role).map(item => ({ ...item, id: item.navId, icon: featureIcons[item.iconName] }));
}

export function getNavigationForAccount(account: { roles: string[]; access: AccountAccess } | null | undefined): (NavigationFeature & LmsNavItem)[] {
  return getAccessibleFeatures(account).map(item => ({ ...item, icon: featureIcons[item.iconName] }));
}
