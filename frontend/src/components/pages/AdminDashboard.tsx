import React, { useState } from 'react';
import { IconShieldCheck, IconSearch, IconPlus } from '../common/Icons';
import { Badge } from '../common/Badge';

export const AdminDashboard: React.FC = () => {
  const [filterRole, setFilterRole] = useState<string>('All');
  const [searchUser, setSearchUser] = useState('');

  const users = [
    { id: 'U-001', name: 'Nguyễn Minh Quân', email: 'quan.nm@teky.edu.vn', role: 'Student', branch: 'Online Campus', status: 'Active' },
    { id: 'U-002', name: 'Trần Thu Trang', email: 'trang.tt@parent.com', role: 'Parent', branch: 'Cầu Giấy', status: 'Active' },
    { id: 'U-003', name: 'Hoàng Văn Nam', email: 'nam.hv@teky.edu.vn', role: 'Teacher', branch: 'Ba Đình & Online', status: 'Active' },
    { id: 'U-004', name: 'Đỗ Thị Hồng', email: 'hong.dt@teky.edu.vn', role: 'Academic Manager', branch: 'Hà Nội Region', status: 'Active' },
    { id: 'U-005', name: 'Admin Kỹ Thuật', email: 'admin@teky.edu.vn', role: 'System Admin', branch: 'Headquarter', status: 'Active' },
    { id: 'U-006', name: 'Lê Văn Tạm Khóa', email: 'tamkhoa@teky.edu.vn', role: 'Student', branch: 'Tân Bình', status: 'Suspended' },
  ];

  const auditLogs = [
    { time: '13:00:24', actor: 'nam.hv', role: 'Teacher', action: 'Submit Attendance', target: 'Class SCRATCH-01', ip: '118.70.12.45', status: 'Success' },
    { time: '12:45:10', actor: 'hong.dt', role: 'Manager', action: 'Modify Timetable', target: 'Class PY-02 Room Lab 201', ip: '14.162.88.20', status: 'Success' },
    { time: '11:15:02', actor: 'unknown_ip', role: 'Anonymous', action: 'Failed Login Attempt', target: 'admin@teky.edu.vn', ip: '203.113.152.9', status: 'Warning' },
    { time: '09:30:18', actor: 'admin', role: 'Admin', action: 'Create New User', target: 'Student TEKY-2026-105', ip: '192.168.1.10', status: 'Success' },
  ];

  const filteredUsers = users.filter((u) => {
    const matchRole = filterRole === 'All' || u.role === filterRole;
    const matchSearch = u.name.toLowerCase().includes(searchUser.toLowerCase()) || u.email.toLowerCase().includes(searchUser.toLowerCase());
    return matchRole && matchSearch;
  });

  return (
    <div className="space-y-8 py-6">
      {/* System Health Metric Cards */}
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

      {/* User Management & RBAC Table */}
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

          <div className="flex gap-2">
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

      {/* Security Audit Logs */}
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
    </div>
  );
};
