import React, { useState, useEffect } from 'react';
import { Badge } from '../common/Badge';
import { IconCheckCircle, IconAlertCircle, IconClock, IconGraduationCap } from '../common/Icons';

interface StaffDashboardProps {
  activeNavId?: string;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ activeNavId = 'attendance' }) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'makeup' | 'kits' | 'schedule'>('attendance');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (activeNavId === 'makeup') setActiveTab('makeup');
      else if (activeNavId === 'kits') setActiveTab('kits');
      else if (activeNavId === 'schedule') setActiveTab('schedule');
      else setActiveTab('attendance');
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeNavId]);

  // Daily Operational Metrics
  const dailyMetrics = [
    { label: 'Ca học hôm nay', value: '14', badge: '3 Ca đang chạy', badgeVariant: 'info' as const, note: '8 phòng Lab hoạt động' },
    { label: 'Học sinh vắng cần liên hệ', value: '3', badge: 'Cần xác nhận', badgeVariant: 'warning' as const, note: '2 vắng có phép, 1 chưa rõ lý do' },
    { label: 'Đơn học bù chờ duyệt', value: '5', badge: 'Đang chờ', badgeVariant: 'accent' as const, note: 'Khóa Scratch & Robotics WeDo' },
    { label: 'Bộ Kit thiết bị đang mượn', value: '42', badge: '100% Đầy đủ', badgeVariant: 'success' as const, note: 'LEGO Spike & Micro:bit' },
  ];

  // Absent Students needing Parent Follow-up
  const absentStudents = [
    {
      id: 'ABS-01',
      studentName: 'Nguyễn Minh Quân',
      studentCode: 'TK-HS-001',
      className: 'TEKY-SCR-2026-01',
      sessionTime: '08:30 - 10:30 (Sáng nay)',
      parentName: 'Trần Thu Trang',
      parentPhone: '0901234502',
      reason: 'Báo ốm sốt nhẹ trước 1 giờ',
      status: 'Excused',
    },
    {
      id: 'ABS-02',
      studentName: 'Trần Đức Hà',
      studentCode: 'TK-HS-002',
      className: 'TEKY-ROB-2026-02',
      sessionTime: '14:00 - 16:00 (Hôm nay)',
      parentName: 'Lê Thanh Tùng',
      parentPhone: '0901234512',
      reason: 'Chưa có thông báo từ phụ huynh',
      status: 'Unexcused',
    },
    {
      id: 'ABS-03',
      studentName: 'Vũ Đăng Khôi',
      studentCode: 'TK-HS-004',
      className: 'TEKY-PY-2026-01',
      sessionTime: '18:00 - 20:00 (Tối nay)',
      parentName: 'Vũ Hương Lan',
      parentPhone: '0901234513',
      reason: 'Trùng lịch thi học kỳ ở trường tiểu học',
      status: 'Excused',
    },
  ];

  // Makeup Requests
  const makeupRequests = [
    {
      id: 'MKP-2026-101',
      studentName: 'Nguyễn Minh Quân',
      originalSession: 'Buổi 4: Vòng lặp For & Mê cung (24/10/2026)',
      targetClass: 'TEKY-SCR-2026-02 (Thầy Nam)',
      targetSlot: 'Chủ Nhật 14:00 - 16:00 (Phòng Lab 01)',
      parentNote: 'Xin học bù vào buổi chiều CN để kịp tiến độ làm sản phẩm cuối khóa',
      status: 'Pending',
    },
    {
      id: 'MKP-2026-102',
      studentName: 'Phạm Mai Chi',
      originalSession: 'Buổi 2: Cảm biến siêu âm xe dò line (22/10/2026)',
      targetClass: 'TEKY-ROB-2026-03 (Cô Hoa)',
      targetSlot: 'Thứ Ba 18:00 - 20:00 (Phòng Robotics)',
      parentNote: 'Đã báo nghỉ có phép do đi du lịch cùng gia đình',
      status: 'Approved',
    },
    {
      id: 'MKP-2026-103',
      studentName: 'Lê Bảo An',
      originalSession: 'Buổi 6: Khối lệnh hàm & Biến trong Scratch',
      targetClass: 'TEKY-SCR-2026-01 (Thầy Đức)',
      targetSlot: 'Thứ Bảy 08:30 - 10:30 (Phòng Lab 02)',
      parentNote: 'Muốn học bù cùng bạn cùng lớp',
      status: 'Pending',
    },
  ];

  // Equipment / Kit Tracking
  const kitInventories = [
    { code: 'KIT-SPIKE-01', name: 'LEGO Education SPIKE Prime Set #1', room: 'Lab STEAM 01', borrower: 'Thầy Hoàng Văn Nam', returnTime: '17:00 Hôm nay', condition: 'Tốt (Đủ 528 chi tiết)' },
    { code: 'KIT-SPIKE-02', name: 'LEGO Education SPIKE Prime Set #2', room: 'Lab STEAM 01', borrower: 'Thầy Hoàng Văn Nam', returnTime: '17:00 Hôm nay', condition: 'Tốt (Đủ động cơ & Hub)' },
    { code: 'KIT-MICRO-04', name: 'BBC Micro:bit v2 Smart Home Kit', room: 'Phòng Robotics 02', borrower: 'Cô Mai Hoa', returnTime: '19:30 Hôm nay', condition: 'Tốt (Cảm biến nhiệt độ, đất)' },
    { code: 'LAPTOP-TEKY-12', name: 'Laptop Dell Inspiron Cài Sẵn Scratch/Python', room: 'Bàn tiếp đón Học vụ', borrower: 'Phụ huynh bé Quân mượn tại chỗ', returnTime: '11:00 Hôm nay', condition: 'Đã sạc đầy' },
  ];

  return (
    <div className="space-y-8 py-6">
      {/* Top Banner: Operational Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {dailyMetrics.map((m, idx) => (
          <div key={idx} className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <p className="text-xs text-slate-400 font-medium">{m.label}</p>
            <div className="flex items-baseline justify-between mt-1">
              <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{m.value}</h4>
              <Badge variant={m.badgeVariant}>{m.badge}</Badge>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">{m.note}</p>
          </div>
        ))}
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 space-x-8">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-4 text-sm font-semibold transition-colors relative flex items-center gap-2 ${
            activeTab === 'attendance'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <IconAlertCircle className="w-4 h-4" />
          Giám sát Điểm danh & Học sinh Vắng
          <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-[10px] flex items-center justify-center font-bold">
            3
          </span>
        </button>

        <button
          onClick={() => setActiveTab('makeup')}
          className={`pb-4 text-sm font-semibold transition-colors relative flex items-center gap-2 ${
            activeTab === 'makeup'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <IconClock className="w-4 h-4" />
          Phê duyệt Học bù (Makeup Requests)
          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] flex items-center justify-center font-bold">
            2
          </span>
        </button>

        <button
          onClick={() => setActiveTab('kits')}
          className={`pb-4 text-sm font-semibold transition-colors relative flex items-center gap-2 ${
            activeTab === 'kits'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <IconGraduationCap className="w-4 h-4" />
          Thiết bị & Bộ Kit STEAM
        </button>
      </div>

      {/* Tab 1: Attendance & Absent Follow-up */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Theo dõi Học sinh Vắng trong ngày</h3>
              <p className="text-xs text-slate-500">Giáo vụ xác nhận lý do với phụ huynh và hỗ trợ xếp lịch học bù nhanh.</p>
            </div>
            <div className="flex gap-2">
              <button className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition">
                Gửi SMS / Zalo Đồng loạt
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-5">Mã / Học sinh</th>
                    <th className="py-3 px-4">Lớp & Ca học</th>
                    <th className="py-3 px-4">Phụ huynh & SĐT</th>
                    <th className="py-3 px-4">Lý do ghi nhận</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-5 text-right">Thao tác Giáo vụ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-xs text-slate-600 dark:text-slate-300">
                  {absentStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/20 transition-colors">
                      <td className="py-3.5 px-5 font-medium text-slate-900 dark:text-white">
                        <div>{s.studentName}</div>
                        <span className="text-[11px] font-mono text-slate-400">{s.studentCode}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{s.className}</div>
                        <span className="text-[11px] text-slate-400">{s.sessionTime}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div>{s.parentName}</div>
                        <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400">{s.parentPhone}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs">{s.reason}</td>
                      <td className="py-3.5 px-4">
                        <Badge variant={s.status === 'Excused' ? 'warning' : 'danger'}>
                          {s.status === 'Excused' ? 'Vắng có phép' : 'Chưa liên hệ'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-5 text-right space-x-2">
                        <button className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition">
                          Gọi điện
                        </button>
                        <button className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition">
                          Tạo học bù
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Makeup Requests */}
      {activeTab === 'makeup' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Đơn Đăng Ký Học Bù Chờ Giáo Vụ Duyệt</h3>
              <p className="text-xs text-slate-500">Kiểm tra sĩ số lớp ghép và xác nhận lịch học bù cho học sinh.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {makeupRequests.map((req) => (
              <div
                key={req.id}
                className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-mono font-bold text-slate-400">{req.id}</span>
                    <Badge variant={req.status === 'Approved' ? 'success' : 'accent'}>
                      {req.status === 'Approved' ? 'Đã duyệt' : 'Chờ duyệt'}
                    </Badge>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{req.studentName}</h4>
                  <div className="mt-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/40 text-xs space-y-1.5">
                    <p className="text-slate-400 text-[11px]">Buổi học đã vắng:</p>
                    <p className="font-medium text-slate-700 dark:text-slate-200">{req.originalSession}</p>
                    <p className="text-slate-400 text-[11px] mt-2">Dự kiến học bù tại:</p>
                    <p className="font-semibold text-blue-600 dark:text-blue-400">{req.targetClass}</p>
                    <p className="text-[11px] text-slate-500">{req.targetSlot}</p>
                  </div>
                  <p className="text-[11px] text-slate-500 italic mt-3">"{req.parentNote}"</p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700 flex gap-2">
                  {req.status === 'Pending' ? (
                    <>
                      <button className="flex-1 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition">
                        Chấp thuận
                      </button>
                      <button className="py-2 px-3 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 transition">
                        Đổi ca
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold py-1">
                      <IconCheckCircle className="w-4 h-4" /> Đã xếp lớp bù thành công
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Kit & Hardware Tracking */}
      {activeTab === 'kits' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Kiểm kê Thiết bị & Bộ Kit Thực hành STEAM</h3>
              <p className="text-xs text-slate-500">Giáo vụ bàn giao và nhận lại trang thiết bị cuối mỗi ca học.</p>
            </div>
            <button className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:text-white transition">
              Xuất biên bản bàn giao
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-5">Mã thiết bị</th>
                    <th className="py-3 px-4">Tên bộ Kit / Laptop</th>
                    <th className="py-3 px-4">Vị trí phòng Lab</th>
                    <th className="py-3 px-4">Người mượn & Hẹn trả</th>
                    <th className="py-3 px-4">Hiện trạng</th>
                    <th className="py-3 px-5 text-right">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-xs text-slate-600 dark:text-slate-300">
                  {kitInventories.map((k) => (
                    <tr key={k.code} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/20 transition-colors">
                      <td className="py-3.5 px-5 font-mono font-bold text-slate-800 dark:text-slate-200">{k.code}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">{k.name}</td>
                      <td className="py-3.5 px-4">{k.room}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{k.borrower}</div>
                        <span className="text-[11px] text-slate-400">Hạn: {k.returnTime}</span>
                      </td>
                      <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-medium">{k.condition}</td>
                      <td className="py-3.5 px-5 text-right">
                        <Badge variant="info">Đang mượn</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

