import React, { useState } from 'react';
import { IconDownload } from '../common/Icons';
import { Badge } from '../common/Badge';

export const ParentDashboard: React.FC = () => {
  const [selectedChild, setSelectedChild] = useState<'quan' | 'my'>('quan');

  const childrenData = {
    quan: {
      name: 'Nguyễn Minh Quân',
      age: 9,
      code: 'TEKY-2026-88',
      currentClass: 'Lớp Scratch Game 3.0 (T7: 14:00 - 15:30)',
      attendanceRate: '100% (9/9 buổi)',
      avgScore: '9.5/10',
      teacher: 'Thầy Hoàng Văn Nam',
      competencies: [
        { label: 'Tư duy logic & Thuật toán', score: 92 },
        { label: 'Khả năng giải quyết vấn đề', score: 88 },
        { label: 'Sáng tạo & Thẩm mỹ game', score: 95 },
        { label: 'Làm việc nhóm & Thuyết trình', score: 85 },
        { label: 'Kỹ năng viết mã lệnh', score: 90 },
      ],
      feedbackHistory: [
        {
          session: 'Buổi 9 (01/11/2026)',
          topic: 'Lập trình trọng lực & nhảy nhân vật',
          rating: 5,
          attendance: 'Có mặt đúng giờ',
          teacherNote: 'Minh Quân hoàn thành bài tập rất nhanh, tự giác hỗ trợ bạn bên cạnh sửa lỗi logic.',
        },
        {
          session: 'Buổi 8 (25/10/2026)',
          topic: 'Tạo hoạt ảnh chuyển động nhân vật',
          rating: 5,
          attendance: 'Có mặt đúng giờ',
          teacherNote: 'Bé vẽ nhân vật rất đẹp, biết phối hợp các khối lệnh lặp để tạo chuyển động mượt.',
        },
      ],
      invoices: [
        { id: 'INV-2026-092', title: 'Học phí Khóa Scratch 3.0 (Kỳ 2)', amount: '4.800.000 đ', date: '15/10/2026', status: 'Đã thanh toán' },
      ],
    },
    my: {
      name: 'Nguyễn Thảo My',
      age: 7,
      code: 'TEKY-2026-104',
      currentClass: 'Lớp Robotics LEGO WeDo (CN: 09:00 - 10:30)',
      attendanceRate: '100% (6/6 buổi)',
      avgScore: '9.0/10',
      teacher: 'Cô Lê Thị Mai',
      competencies: [
        { label: 'Tư duy logic & Thuật toán', score: 85 },
        { label: 'Khả năng giải quyết vấn đề', score: 80 },
        { label: 'Sáng tạo & Thẩm mỹ game', score: 92 },
        { label: 'Làm việc nhóm & Thuyết trình', score: 90 },
        { label: 'Kỹ năng viết mã lệnh', score: 82 },
      ],
      feedbackHistory: [
        {
          session: 'Buổi 6 (02/11/2026)',
          topic: 'Chế tạo xe đua cảm biến khoảng cách',
          rating: 5,
          attendance: 'Có mặt đúng giờ',
          teacherNote: 'Bé Thảo My rất hào hứng lắp ráp bánh răng cơ khí, xe chạy bon và dừng đúng vạch.',
        },
      ],
      invoices: [
        { id: 'INV-2026-088', title: 'Học phí Khóa LEGO WeDo (Kỳ 1)', amount: '5.200.000 đ', date: '20/09/2026', status: 'Đã thanh toán' },
      ],
    },
  };

  const child = childrenData[selectedChild];

  return (
    <div className="space-y-8 py-6">
      {/* Top: Header & Multi-Child Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <Badge variant="accent">Cổng Thông Tin Phụ Huynh</Badge>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Theo dõi hành trình học tập STEAM của con
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Phụ huynh: Chị Trần Thu Trang • Hotline hỗ trợ CSKH: 1900 633 868</p>
        </div>

        {/* Child Selector */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-700">
          <button
            onClick={() => setSelectedChild('quan')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              selectedChild === 'quan'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            👦 Minh Quân (9T)
          </button>
          <button
            onClick={() => setSelectedChild('my')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              selectedChild === 'my'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            👧 Thảo My (7T)
          </button>
        </div>
      </div>

      {/* Child Summary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-xs text-slate-400">Lớp đang theo học</p>
          <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1 truncate">{child.currentClass}</h4>
          <p className="text-[11px] text-blue-600 mt-2 font-medium">GV phụ trách: {child.teacher}</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-xs text-slate-400">Tỷ lệ chuyên cần</p>
          <h4 className="font-bold text-lg text-emerald-600 mt-1 tabular-nums">{child.attendanceRate}</h4>
          <Badge variant="success" className="mt-2">100% Có mặt đúng giờ</Badge>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-xs text-slate-400">Điểm đánh giá trung bình</p>
          <h4 className="font-bold text-lg text-blue-600 mt-1 tabular-nums">{child.avgScore}</h4>
          <span className="text-amber-500 text-xs">★★★★★ Xuất sắc</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-xs text-slate-400">Lịch học tiếp theo</p>
          <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1">Thứ Bảy, 14:00</h4>
          <p className="text-[11px] text-slate-500 mt-2">Phòng Online 04 (Zoom)</p>
        </div>
      </div>

      {/* Middle Section: Competency Assessment & Teacher Remarks Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 5-Dimension STEAM Competency Report */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Đánh giá 5 năng lực STEAM cốt lõi
            </h3>
            <span className="text-xs text-blue-600 font-medium">Báo cáo tháng 10/2026</span>
          </div>
          <p className="text-xs text-slate-500">
            Hệ thống chấm điểm chuẩn CSTA dựa trên quá trình tương tác lớp học và chất lượng nộp sản phẩm thực tế:
          </p>

          <div className="space-y-3 pt-2">
            {child.competencies.map((comp, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{comp.label}</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 tabular-nums">{comp.score}/100</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${comp.score}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-xs text-blue-800 dark:text-blue-300">
            <span className="font-bold">Đánh giá chung:</span> Bé có thế mạnh đặc biệt ở tư duy tạo hình và sáng tạo sản phẩm độc lập.
          </div>
        </div>

        {/* Teacher Feedback Timeline */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Nhận xét chi tiết sau từng buổi học
            </h3>
            <Badge variant="info">Cập nhật sau mỗi ca học</Badge>
          </div>

          <div className="space-y-4 pt-1">
            {child.feedbackHistory.map((fb, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">{fb.session}</span>
                  <span className="text-amber-500">★★★★★</span>
                </div>
                <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">Nội dung: {fb.topic}</p>
                <p className="text-slate-600 dark:text-slate-300 italic">"{fb.teacherNote}"</p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-600/60 text-[11px] text-slate-400">
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ {fb.attendance}</span>
                  <span>Đã duyệt bởi Quản lý học thuật</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tuition & Invoice Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Lịch sử học phí & Hóa đơn điện tử</h3>
            <p className="text-xs text-slate-500">Minh bạch biểu phí, xuất hóa đơn VAT tự động</p>
          </div>
          <button className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 font-semibold text-xs hover:bg-blue-100 flex items-center gap-1.5">
            <IconDownload size={14} /> Tải biên lai
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="p-3">Mã hóa đơn</th>
                <th className="p-3">Khoản thu</th>
                <th className="p-3">Số tiền</th>
                <th className="p-3">Ngày thanh toán</th>
                <th className="p-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {child.invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="p-3 font-semibold text-slate-900 dark:text-white">{inv.id}</td>
                  <td className="p-3 text-slate-700 dark:text-slate-300">{inv.title}</td>
                  <td className="p-3 font-bold text-slate-900 dark:text-white tabular-nums">{inv.amount}</td>
                  <td className="p-3 text-slate-500">{inv.date}</td>
                  <td className="p-3">
                    <Badge variant="success">{inv.status}</Badge>
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
