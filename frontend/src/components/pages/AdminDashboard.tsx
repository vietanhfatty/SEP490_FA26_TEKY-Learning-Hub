import React, { useState, useEffect } from 'react';
import { IconShieldCheck, IconSearch, IconPlus } from '../common/Icons';
import { Badge } from '../common/Badge';

interface AdminDashboardProps {
  activeNavId?: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ activeNavId = 'overview' }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'branches' | 'audit'>('overview');
  const [filterRole, setFilterRole] = useState<string>('All');
  const [searchUser, setSearchUser] = useState('');

  useEffect(() => {
    if (activeNavId === 'users') setActiveTab('users');
    else if (activeNavId === 'branches') setActiveTab('branches');
    else if (activeNavId === 'audit') setActiveTab('audit');
    else setActiveTab('overview');
  }, [activeNavId]);

  const users = [
    { id: 'U-001', name: 'Nguyễn Minh Quân', email: 'quan.nm@teky.edu.vn', role: 'Student', branch: 'Online Campus', status: 'Active' },
    { id: 'U-002', name: 'Trần Thu Trang', email: 'trang.tt@parent.com', role: 'Parent', branch: 'Cầu Giấy', status: 'Active' },
    { id: 'U-003', name: 'Hoàng Văn Nam', email: 'nam.hv@teky.edu.vn', role: 'Teacher', branch: 'Ba Đình & Online', status: 'Active' },
    { id: 'U-004', name: 'Đỗ Thị Hồng', email: 'hong.dt@teky.edu.vn', role: 'Academic Manager', branch: 'Hà Nội Region', status: 'Active' },
    { id: 'U-005', name: 'Admin Kỹ Thuật', email: 'admin@teky.edu.vn', role: 'System Admin', branch: 'Headquarter', status: 'Active' },
    { id: 'U-006', name: 'Lê Văn Tạm Khóa', email: 'tamkhoa@teky.edu.vn', role: 'Student', branch: 'Tân Bình', status: 'Suspended' },
  ];

  const branches = [
    { id: 'BR-01', name: 'Cơ sở TEKY Cầu Giấy', address: 'Tầng 5, Tòa nhà Mac Plaza, Cầu Giấy, Hà Nội', labs: 8, students: 240, teachers: 16, lead: 'Lê Mạnh Hùng', status: 'Active' },
    { id: 'BR-02', name: 'Cơ sở TEKY Ba Đình', address: 'Số 9 Kim Mã, Ba Đình, Hà Nội', labs: 6, students: 180, teachers: 12, lead: 'Nguyễn Phương Thảo', status: 'Active' },
    { id: 'BR-03', name: 'Cơ sở TEKY Tân Bình', address: '34 Hoàng Hoa Thám, Tân Bình, TP.HCM', labs: 10, students: 320, teachers: 22, lead: 'Vũ Văn Hoàng', status: 'Active' },
    { id: 'BR-04', name: 'Cơ sở TEKY Quận 7', address: '142 Nguyễn Thị Thập, Quận 7, TP.HCM', labs: 6, students: 190, teachers: 14, lead: 'Trần Lan Anh', status: 'Active' },
    { id: 'BR-ONLINE', name: 'TEKY Online STEAM Campus', address: 'Phòng học ảo tích hợp Cloud WebRTC & Code Editor', labs: 20, students: 450, teachers: 28, lead: 'Đỗ Thị Hồng', status: 'Active' },
  ];

  const auditLogs = [
    { time: '13:00:24', actor: 'nam.hv', role: 'Teacher', action: 'Submit Attendance', target: 'Class SCRATCH-01', ip: '118.70.12.45', status: 'Success' },
    { time: '12:45:10', actor: 'hong.dt', role: 'Manager', action: 'Modify Timetable', target: 'Class PY-02 Room Lab 201', ip: '14.162.88.20', status: 'Success' },
    { time: '11:15:02', actor: 'unknown_ip', role: 'Anonymous', action: 'Failed Login Attempt', target: 'admin@teky.edu.vn', ip: '203.113.152.9', status: 'Warning' },
    { time: '09:30:18', actor: 'admin', role: 'Admin', action: 'Create New User', target: 'Student TEKY-2026-105', ip: '192.168.1.10', status: 'Success' },
    { time: '08:15:40', actor: 'auth_system', role: 'System', action: 'User Logout & Revoke Session', target: 'Session US-904 (quan.nm)', ip: '118.70.12.45', status: 'Success' },
  ];

  const filteredUsers = users.filter((u) => {
    const matchRole = filterRole === 'All' || u.role === filterRole;
    const matchSearch = u.name.toLowerCase().includes(searchUser.toLowerCase()) || u.email.toLowerCase().includes(searchUser.toLowerCase());
    return matchRole && matchSearch;
  });

  return (
    <div className="space-y-8 py-6">
      {/* Top Banner: System Health Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-xs text-slate-400 font-medium">Trạng thái Cơ sở dữ liệu (SQL Server)</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-xl font-bold text-emerald-600">99.98% Healthy</h4>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Latency: 14ms • Connection Pool: 24/100</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-xs text-slate-400 font-medium">Tài khoản Hoạt động (Active Users)</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">1.482</h4>
            <Badge variant="info">Toàn hệ thống</Badge>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">32 phiên đăng nhập trực tuyến</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-xs text-slate-400 font-medium">Bảo mật & Cảnh báo an ninh</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-xl font-bold text-slate-900 dark:text-white">Ổn định</h4>
            <Badge variant="success">0 Vi phạm</Badge>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Đã chặn 4 lượt brute-force hôm nay</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-xs text-slate-400 font-medium">Sao lưu dữ liệu tự động (Backup)</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-base font-bold text-slate-900 dark:text-white">Thành công</h4>
            <Badge variant="neutral">02:00 AM</Badge>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Lưu trữ đám mây mã hóa AES-256</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 whitespace-nowrap transition-colors ${
            activeTab === 'overview'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Giám sát Hệ thống & Hạ tầng
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 whitespace-nowrap transition-colors ${
            activeTab === 'users'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Người dùng & Phân quyền RBAC
        </button>
        <button
          onClick={() => setActiveTab('branches')}
          className={`pb-3 whitespace-nowrap transition-colors ${
            activeTab === 'branches'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Cơ sở Đào tạo & Phòng Lab
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 whitespace-nowrap transition-colors ${
            activeTab === 'audit'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Nhật ký An ninh & Audit Logs
        </button>
      </div>

      {/* Content: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">Tài nguyên Máy chủ & Dịch vụ (.NET 9 Clean Architecture)</h3>
                  <p className="text-xs text-slate-500">Giám sát tải CPU, RAM và thời gian phản hồi của API Controllers</p>
                </div>
                <Badge variant="success">Hoạt động bình thường</Badge>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-xs text-slate-500">CPU Usage</p>
                  <p className="text-2xl font-black text-blue-600 tabular-nums mt-1">12.4%</p>
                  <p className="text-[10px] text-slate-400 mt-1">8 Cores Intel Xeon</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-xs text-slate-500">RAM Allocation</p>
                  <p className="text-2xl font-black text-emerald-600 tabular-nums mt-1">4.2 / 16 GB</p>
                  <p className="text-[10px] text-slate-400 mt-1">26% Dung lượng</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-xs text-slate-500">API Latency p95</p>
                  <p className="text-2xl font-black text-purple-600 tabular-nums mt-1">28 ms</p>
                  <p className="text-[10px] text-slate-400 mt-1">Khuyến nghị &lt; 200ms</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Thao tác Quản trị viên nhanh</h3>
              <div className="space-y-2.5">
                <button
                  onClick={() => setActiveTab('users')}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/60 text-xs font-semibold text-left flex items-center justify-between"
                >
                  <span>Cấp quyền tài khoản mới</span>
                  <span className="text-blue-500">→</span>
                </button>
                <button
                  onClick={() => setActiveTab('audit')}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-left flex items-center justify-between"
                >
                  <span>Kiểm tra Audit Log bảo mật</span>
                  <span className="text-slate-400">→</span>
                </button>
                <button
                  onClick={() => alert('Đã kích hoạt sao lưu cơ sở dữ liệu khẩn cấp')}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-left flex items-center justify-between"
                >
                  <span>Kích hoạt Sao lưu DB ngay</span>
                  <span className="text-slate-400">→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content: Users & RBAC */}
      {(activeTab === 'users' || activeTab === 'overview') && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Quản trị Người dùng & Phân quyền RBAC</h3>
              <p className="text-xs text-slate-500">Kiểm soát danh tính, phân quyền 5 roles: Học sinh, Phụ huynh, GV, Quản lý, Admin</p>
            </div>

            <button
              onClick={() => alert('Mở form tạo tài khoản người dùng mới')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <IconPlus size={16} /> Thêm tài khoản
            </button>
          </div>

          {/* Filter Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Tìm kiếm theo tên hoặc email..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-full px-3.5 py-2 pl-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-xs focus:ring-2 focus:ring-blue-500"
              />
              <IconSearch size={14} className="absolute left-3 top-3 text-slate-400" />
            </div>

            <div className="flex gap-2 flex-wrap">
              {['All', 'Student', 'Parent', 'Teacher', 'Academic Manager', 'System Admin'].map((role) => (
                <button
                  key={role}
                  onClick={() => setFilterRole(role)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    filterRole === role
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Mã UID</th>
                  <th className="p-3">Họ và tên</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Vai trò (Role)</th>
                  <th className="p-3">Cơ sở (Branch)</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="p-3 font-semibold text-slate-900 dark:text-white tabular-nums">{u.id}</td>
                    <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{u.name}</td>
                    <td className="p-3 text-slate-500">{u.email}</td>
                    <td className="p-3">
                      <Badge variant={u.role === 'Student' ? 'info' : u.role === 'Teacher' ? 'success' : u.role === 'Parent' ? 'accent' : 'neutral'}>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="p-3 text-slate-500">{u.branch}</td>
                    <td className="p-3">
                      <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${u.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                      <span className={u.status === 'Active' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}>
                        {u.status}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button className="text-blue-600 font-semibold hover:underline">Sửa quyền</button>
                      <button className="text-slate-400 hover:text-rose-600 font-semibold">Khóa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Content: Branches */}
      {activeTab === 'branches' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Cơ sở Đào tạo & Phòng Lab STEAM</h3>
              <p className="text-xs text-slate-500">Mạng lưới chi nhánh học tập, phòng lab thực hành và cơ sở trực tuyến</p>
            </div>
            <button
              onClick={() => alert('Mở form thêm chi nhánh hoặc phòng lab mới')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <IconPlus size={16} /> Thêm cơ sở / Lab
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {branches.map((b) => (
              <div key={b.id} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{b.name}</h4>
                  <Badge variant="success">Hoạt động</Badge>
                </div>
                <p className="text-xs text-slate-500">{b.address}</p>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-600 text-center text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Phòng Lab</span>
                    <span className="font-bold tabular-nums text-slate-900 dark:text-white">{b.labs}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Học sinh</span>
                    <span className="font-bold tabular-nums text-blue-600">{b.students}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Giáo viên</span>
                    <span className="font-bold tabular-nums text-emerald-600">{b.teachers}</span>
                  </div>
                </div>
                <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Trưởng CS: <strong className="text-slate-600 dark:text-slate-300">{b.lead}</strong></span>
                  <button className="text-blue-600 hover:underline font-semibold">Chi tiết →</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content: Audit Logs */}
      {(activeTab === 'audit' || activeTab === 'overview') && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <IconShieldCheck size={18} className="text-blue-600" /> Nhật ký An ninh & Audit Logs thời gian thực
              </h3>
              <p className="text-xs text-slate-500">Ghi lại toàn bộ hành vi thay đổi quyền, phân công và đăng nhập quan trọng</p>
            </div>
            <Badge variant="neutral">Auto-refresh: 10s</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left font-mono">
              <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Thời gian</th>
                  <th className="p-3">Người thực hiện</th>
                  <th className="p-3">Vai trò</th>
                  <th className="p-3">Hành động</th>
                  <th className="p-3">Đối tượng tác động</th>
                  <th className="p-3">Địa chỉ IP</th>
                  <th className="p-3">Kết quả</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                {auditLogs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="p-3 text-slate-400">{log.time}</td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">{log.actor}</td>
                    <td className="p-3">{log.role}</td>
                    <td className="p-3 font-semibold text-blue-600 dark:text-blue-400">{log.action}</td>
                    <td className="p-3 text-slate-500">{log.target}</td>
                    <td className="p-3 text-slate-400">{log.ip}</td>
                    <td className="p-3">
                      <Badge variant={log.status === 'Success' ? 'success' : 'warning'}>
                        {log.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
