import type { UserRole } from '../types';
import type { AccountAccess } from '../auth/accountAccess';
import { allowsPermission, hasPermission } from '../auth/accountAccess';

export type FeatureIcon = 'home' | 'book' | 'calendar' | 'check' | 'sparkles' | 'users' | 'activity' | 'credit' | 'file' | 'layers' | 'bell' | 'settings';
export type NavigationFeature = {
  id: string;
  navId: string;
  role: UserRole;
  label: string;
  group: string;
  href: string;
  iconName: FeatureIcon;
  permission?: string;
  globalOnly?: boolean;
};

const rolePaths: Record<UserRole, string> = {
  student: '/student', parent: '/parent', teacher: '/teacher', academic_staff: '/staff',
  academic_manager: '/academic-manager', system_admin: '/admin',
};
const groups: Record<UserRole, string> = {
  student: 'Học tập', parent: 'Theo dõi học tập', teacher: 'Giảng dạy',
  academic_staff: 'Công tác học vụ', academic_manager: 'Quản lý chuyên môn', system_admin: 'Quản trị',
};

function feature(role: UserRole, navId: string, label: string, iconName: FeatureIcon, href?: string,
  permission?: string, globalOnly = false): NavigationFeature {
  const home = navId === 'overview' || navId === 'kpi';
  return { id: `${role}.${navId}`, role, navId, label, iconName, group: groups[role], permission, globalOnly,
    href: href ?? (home ? rolePaths[role] : `${rolePaths[role]}?${role === 'system_admin' ? 'view' : 'tab'}=${navId}`) };
}

export const navigationFeatures: NavigationFeature[] = [
  feature('student', 'overview', 'Dashboard', 'home'),
  feature('student', 'classes', 'My Classes', 'calendar', '/dashboard/timetable'),
  feature('student', 'courses', 'My Courses', 'book', '/dashboard/courses'),
  feature('student', 'assignments', 'Assignments', 'file', '/dashboard/assignments'),
  feature('student', 'assessments', 'Assessments', 'check', '/dashboard/assessments'),
  feature('parent', 'overview', 'Dashboard', 'home'),
  feature('parent', 'courses', 'Course Management', 'book'),
  feature('parent', 'monitoring', 'Learning Monitoring', 'calendar'),
  feature('parent', 'performance', 'Academic Performance', 'check'),
  feature('parent', 'communication', 'Communication', 'bell'),
  feature('parent', 'payments', 'Payment Management', 'credit'),
  feature('teacher', 'overview', 'Tổng quan giảng dạy', 'home'),
  feature('teacher', 'schedule', 'Lịch dạy trong tuần', 'calendar'),
  feature('teacher', 'attendance', 'Điểm danh lớp học', 'check'),
  feature('teacher', 'materials', 'Kho giáo án chuẩn', 'book'),
  feature('teacher', 'grading', 'Đánh giá & Nhận xét', 'sparkles'),
  feature('teacher', 'swap', 'Đổi ca & Dạy bù', 'activity'),
  feature('teacher', 'communication', 'Trao đổi với phụ huynh', 'bell'),
  feature('academic_staff', 'overview', 'Tổng quan học vụ', 'home'),
  feature('academic_staff', 'attendance', 'Theo dõi chuyên cần', 'check'),
  feature('academic_staff', 'makeup', 'Xử lý học bù', 'calendar'),
  feature('academic_staff', 'kits', 'Thiết bị & Bộ kit', 'layers'),
  feature('academic_staff', 'schedule', 'Lịch học vụ', 'calendar'),
  feature('academic_manager', 'kpi', 'Academic Monitoring', 'home', undefined, 'academic.manage'),
  { ...feature('academic_manager', 'courses', 'Course & Curriculum', 'book', '/manage/courses', 'course.manage'), id: 'courses.manage', group: 'Đào tạo' },
  feature('academic_manager', 'approval', 'Course Approval', 'check', undefined, 'academic.manage'),
  feature('academic_manager', 'classes', 'Class Management', 'users', undefined, 'academic.manage'),
  feature('academic_manager', 'teachers', 'Teacher Management', 'users', undefined, 'academic.manage'),
  feature('academic_manager', 'timetable', 'Timetable Management', 'calendar', undefined, 'academic.manage'),
  feature('academic_manager', 'registrations', 'Registration Management', 'file', undefined, 'academic.manage'),
  feature('academic_manager', 'operations', 'Academic Operations', 'layers', undefined, 'academic.manage'),
  feature('system_admin', 'overview', 'Tổng quan quản trị', 'home'),
  feature('system_admin', 'users', 'Quản lý tài khoản', 'users', undefined, 'identity.manage', true),
  feature('system_admin', 'directory', 'Phòng ban & Chức danh', 'layers', '/admin/directory', 'identity.manage', true),
  { ...feature('system_admin', 'courses', 'Quản lý khóa học', 'book', '/manage/courses', 'course.manage'), id: 'courses.manage', group: 'Đào tạo' },
  feature('system_admin', 'groups', 'Nhóm người dùng', 'users'),
  feature('system_admin', 'branches', 'Cơ sở', 'layers'),
  feature('system_admin', 'notifications', 'Thông báo', 'bell'),
  feature('system_admin', 'audit', 'Báo cáo', 'activity'),
  feature('system_admin', 'settings', 'Cài đặt', 'settings'),
];

export function getAccessibleFeatures(account: { roles: string[]; access: AccountAccess } | null | undefined): NavigationFeature[] {
  if (!account) return [];
  const available = navigationFeatures.filter(item => item.permission
    ? item.globalOnly ? allowsPermission(account.access, item.permission) : hasPermission(account.access, item.permission)
    : account.roles.includes(item.role));
  return [...new Map(available.map(item => [item.id, item])).values()];
}

export function featureForLocation(items: NavigationFeature[], pathname: string, search: string): NavigationFeature | undefined {
  const query = new URLSearchParams(search);
  const requested = query.get('view') ?? query.get('tab');
  return items.find(item => {
    const target = new URL(item.href, 'http://teky.local');
    if (target.pathname === pathname) return (new URLSearchParams(target.search).get('view') ?? new URLSearchParams(target.search).get('tab')) === requested;
    if (pathname.startsWith('/dashboard/') && target.pathname.startsWith('/dashboard/')) return pathname.startsWith(`${target.pathname}/`);
    return item.id === 'courses.manage' && ['/admin', '/academic-manager'].includes(pathname) && requested === 'courses';
  });
}

export function getRoleFeatures(role: UserRole): NavigationFeature[] {
  return navigationFeatures.filter(item => item.role === role);
}
