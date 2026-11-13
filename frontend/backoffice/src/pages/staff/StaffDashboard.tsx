import React, { useState } from 'react';
import { IconCalendar, IconClock, IconCheckCircle, IconUsers, IconAlertCircle } from '../common/Icons';
import { Badge } from '../common/Badge';

/**
 * Dashboard Giáo vụ / Staff.
 *
 * Archetype: Analytics & Data-Dense - hàng gọn 36-40px, header dính,
 * tabular-nums cho mọi chỉ số thời gian / mã / số lượng.
 */
export const StaffDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'today' | 'makeup' | 'support' | 'attendance'>('today');
  const [resolvedMakeups, setResolvedMakeups] = useState<string[]>([]);

  const todayClasses = [
    { code: 'SCRATCH-01', name: 'Scratch Game 3.0', time: '14:00 - 15:30', room: 'Online 04', teacher: 'Hoàng Văn Nam', enrolled: 12, checked: 12, status: 'Hoàn tất' },
    { code: 'PY-ROBO-02', name: 'Python Robotics', time: '16:00 - 17:30', room: 'Lab 201 - Cầu Giấy', teacher: 'Hoàng Văn Nam', enrolled: 10, checked: 0, status: 'Sắp bắt đầu' },
    { code: 'WEB-01', name: 'Web Frontend Explorer', time: '18:30 - 20:00', room: 'Online 02', teacher: 'Trần Bảo Linh', enrolled: 14, checked: 0, status: 'Sắp bắt đầu' },
    { code: 'ARDUINO-07', name: 'Arduino Smart City', time: '09:00 - 10:30', room: 'Lab 102 - Ba Đình', teacher: 'Phạm Đức Long', enrolled: 9, checked: 7, status: 'Đang diễn ra' },
  ];

  const makeupRequests = [
    { id: 'MK-2041', student: 'Vũ Đức Duy', classCode: 'SCRATCH-01', reason: 'Ốm, có giấy bác sĩ', requestedAt: '08:30', status: 'Chờ duyệt' },
    { id: 'MK-2042', student: 'Phạm Quỳnh Anh', classCode: 'WEB-01', reason: 'Việc gia đình đột xuất', requestedAt: '09:15', status: 'Chờ duyệt' },
    { id: 'MK-2039', student: 'Lê Hoàng Minh', classCode: 'ARDUINO-07', reason: 'Thi Olympic Thanh niên', requestedAt: 'Hôm qua', status: 'Chờ duyệt' },
  ];

  const supportRequests = [
    { id: 'TK-512', student: 'Nguyễn Minh Quân', topic: 'Không đăng nhập được vào lớp online', channel: 'Zalo', age: '12 phút', priority: 'Cao' },
    { id: 'TK-508', student: 'Trần Bảo Nam', topic: 'Yêu cầu đổi nhóm dự án cuối khóa', channel: 'Email', age: '1 giờ', priority: 'Thường' },
    { id: 'TK-503', student: 'Phạm Quỳnh Anh', topic: 'Hoàn thành học phần bù mất từ tuần trước', channel: 'Trực tiếp', age: '3 giờ', priority: 'Cao' },
  ];

  const pendingAttendance = [
    { code: 'ROBO-03', name: 'Robotics Vô địch', date: '11/11/2026', teacher: 'Phạm Đức Long', status: 'Chưa chấm' },
    { code: '3D-02', name: 'Thiết kế 3D Blender', date: '11/11/2026', teacher: 'Trần Bảo Linh', status: 'Chưa chấm' },
    { code: 'AI-01', name: 'AI & Dữ liệu nhập môn', date: '10/11/2026', teacher: 'Hoàng Văn Nam', status: 'Chờ duyệt' },
  ];

  const handleResolve = (id: string) => {
    setResolvedMakeups((prev) => [...prev, id]);
  };

  const tabs = [
    { id: 'today' as const, label: 'Lớp học hôm nay', count: todayClasses.length },
    { id: 'makeup' as const, label: 'Lịch học bù', count: makeupRequests.length - resolvedMakeups.length },
    { id: 'support' as const, label: 'Học viên cần hỗ trợ', count: supportRequests.length },
    { id: 'attendance' as const, label: 'Điểm danh chờ xử lý', count: pendingAttendance.length },
  ];

  return (
    <div className="py-6 space-y-6">
      {/* Header: danh tính + chỉ số vận hành */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                Bảng điều khiển Giáo vụ
              </h1>
              <Badge variant="info">RBAC - Staff</Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Nguyễn Thu Nga &middot; Cơ sở TEKY Cầu Giấy &middot;{' '}
              <span className="tabular-nums">Thứ Bảy, 12/11/2026</span>
            </p>
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-200 dark:bg-slate-700">
            {[
              { label: 'Lớp hôm nay', value: todayClasses.length },
              { label: 'Học viên', value: todayClasses.reduce((sum, c) => sum + c.enrolled, 0) },
              { label: 'Học bù chờ', value: makeupRequests.length - resolvedMakeups.length },
              { label: 'Yêu cầu hỗ trợ', value: supportRequests.length },
            ].map((stat) => (
              <div key={stat.label} className="bg-white dark:bg-slate-800 px-4 py-3 min-w-[104px]">
                <dt className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {stat.label}
                </dt>
                <dd className="mt-0.5 text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Tabs điều hướng nội bộ */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 dark:border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2.5 text-xs font-semibold rounded-t-lg -mb-px border-b-2 transition-colors tabular-nums ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-700 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-[10px] font-medium text-slate-400 tabular-nums">
              ({tab.count})
            </span>
          </button>
        ))}
      </div>

      {activeTab === 'today' && (
        <section className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="sticky top-0 flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
            <IconCalendar size={16} className="text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Lịch lớp học hôm nay</h2>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-2.5 font-semibold">Mã lớp</th>
                <th className="px-4 py-2.5 font-semibold">Khóa học</th>
                <th className="px-4 py-2.5 font-semibold">Thời gian</th>
                <th className="px-4 py-2.5 font-semibold">Phòng</th>
                <th className="px-4 py-2.5 font-semibold">Giảng viên</th>
                <th className="px-4 py-2.5 font-semibold text-right">SV</th>
                <th className="px-4 py-2.5 font-semibold text-right">Đã điểm danh</th>
                <th className="px-4 py-2.5 font-semibold">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {todayClasses.map((row) => (
                <tr
                  key={row.code}
                  className="h-9 border-b border-slate-100 dark:border-slate-700/60 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                >
                  <td className="px-4 py-2 font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    {row.code}
                  </td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{row.name}</td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-400 tabular-nums">{row.time}</td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{row.room}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{row.teacher}</td>
                  <td className="px-4 py-2 text-right font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    {row.enrolled}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-400 tabular-nums">
                    {row.checked}
                  </td>
                  <td className="px-4 py-2">
                    {row.status === 'Hoàn tất' ? (
                      <Badge variant="success">Hoàn tất</Badge>
                    ) : row.status === 'Đang diễn ra' ? (
                      <Badge variant="warning">Đang diễn ra</Badge>
                    ) : (
                      <Badge variant="info">Sắp bắt đầu</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {activeTab === 'makeup' && (
        <section className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="sticky top-0 flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
            <IconClock size={16} className="text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Yêu cầu xếp lịch học bù</h2>
          </div>
          {makeupRequests.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                <IconCheckCircle size={28} />
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Đã xử lý hết yêu cầu</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Không còn yêu cầu học bù nào đang chờ. Nhấn tab khác để tiếp tục.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {makeupRequests.map((req) => {
                const resolved = resolvedMakeups.includes(req.id);
                return (
                  <li
                    key={req.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                          {req.id}
                        </span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {req.student}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                          {req.classCode}
                        </span>
                        {resolved ? <Badge variant="success">Đã duyệt</Badge> : <Badge variant="warning">Chờ duyệt</Badge>}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{req.reason}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px] text-slate-400 tabular-nums">{req.requestedAt}</span>
                      {!resolved && (
                        <button
                          type="button"
                          onClick={() => handleResolve(req.id)}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition"
                        >
                          Duyệt lịch bù
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {activeTab === 'support' && (
        <section className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="sticky top-0 flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
            <IconUsers size={16} className="text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Học viên cần hỗ trợ</h2>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {supportRequests.map((req) => (
              <li
                key={req.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                      {req.id}
                    </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {req.student}
                    </span>
                    {req.priority === 'Cao' ? (
                      <Badge variant="danger">Cao</Badge>
                    ) : (
                      <Badge variant="neutral">Thường</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{req.topic}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-[11px] text-slate-400 tabular-nums">
                  <span>{req.channel}</span>
                  <span>{req.age}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {activeTab === 'attendance' && (
        <section className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="sticky top-0 flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
            <IconAlertCircle size={16} className="text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Điểm danh chờ xử lý</h2>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-2.5 font-semibold">Mã lớp</th>
                <th className="px-4 py-2.5 font-semibold">Khóa học</th>
                <th className="px-4 py-2.5 font-semibold">Ngày</th>
                <th className="px-4 py-2.5 font-semibold">Giảng viên</th>
                <th className="px-4 py-2.5 font-semibold">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {pendingAttendance.map((row) => (
                <tr
                  key={row.code}
                  className="h-9 border-b border-slate-100 dark:border-slate-700/60 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                >
                  <td className="px-4 py-2 font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    {row.code}
                  </td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{row.name}</td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-400 tabular-nums">{row.date}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{row.teacher}</td>
                  <td className="px-4 py-2">
                    <Badge variant="warning">{row.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
};
