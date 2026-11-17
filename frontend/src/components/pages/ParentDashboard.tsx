import React, { useState } from 'react';
import { IconDownload, IconSparkles, IconCreditCard, IconFileText } from '../common/Icons';
import { Badge } from '../common/Badge';

interface ParentDashboardProps {
  activeNavId?: string;
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({ activeNavId = 'overview' }) => {
  const [selectedChild, setSelectedChild] = useState<'quan' | 'my'>('quan');
  const isFocusedFeedback = activeNavId === 'feedback';
  const isFocusedCompetency = activeNavId === 'competency';
  const isFocusedTuition = activeNavId === 'tuition';

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
    <div className="space-y-8 animate-in fade-in duration-150">
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

      {/* Child Fast Facts Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-xs text-slate-400 font-medium">Lớp học hiện tại</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">{child.currentClass}</p>
          <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-2 font-medium">GV: {child.teacher}</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-xs text-slate-400 font-medium">Tỷ lệ Chuyên cần</p>
          <p className="text-xl font-extrabold text-emerald-600 mt-1 tabular-nums">{child.attendanceRate}</p>
          <p className="text-[11px] text-emerald-600/80 mt-2 font-medium">✓ Không nghỉ buổi nào</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-xs text-slate-400 font-medium">Điểm trung bình dự án</p>
          <p className="text-xl font-extrabold text-blue-600 mt-1 tabular-nums">{child.avgScore}</p>
          <p className="text-[11px] text-blue-500 mt-2 font-medium">Xếp loại: Xuất sắc ★★★★★</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-xs text-slate-400 font-medium">Học phí & Hóa đơn</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">Đã hoàn thành Kỳ 2</p>
          <p className="text-[11px] text-slate-400 mt-2">Hạn đóng kỳ tới: 15/12/2026</p>
        </div>
      </div>

      {/* Main Split: Teacher Remarks (Left) vs 5D STEAM Competency (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Teacher Feedback Timeline */}
        <div
          className={`space-y-4 ${
            isFocusedFeedback
              ? 'lg:col-span-3 ring-2 ring-blue-500/50 rounded-3xl p-1'
              : isFocusedCompetency || isFocusedTuition
              ? 'hidden lg:block lg:col-span-2'
              : 'lg:col-span-2'
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <IconFileText size={18} className="text-blue-600" /> Sổ liên lạc & Nhận xét của Giáo viên
            </h3>
            <span className="text-xs text-slate-400">Cập nhật sau mỗi buổi học</span>
          </div>

          <div className="space-y-4">
            {child.feedbackHistory.map((fb, idx) => (
              <div key={idx} className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-100 dark:border-slate-700 text-xs">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">{fb.session}: </span>
                    <span className="text-slate-600 dark:text-slate-300">{fb.topic}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-500 font-bold">★★★★★</span>
                    <Badge variant="success">{fb.attendance}</Badge>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed">
                  "{fb.teacherNote}"
                </p>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Người nhận xét: {child.teacher}</span>
                  <button
                    onClick={() => alert('Gửi lời nhắn tới giáo viên...')}
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    Gửi phản hồi cho Thầy cô 💬
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: STEAM 5D Competency Graph */}
        <div
          className={`space-y-6 ${
            isFocusedCompetency || isFocusedTuition
              ? 'lg:col-span-3'
              : isFocusedFeedback
              ? 'hidden lg:block'
              : ''
          }`}
        >
          <div
            className={`p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 ${
              isFocusedCompetency ? 'ring-2 ring-orange-500/50' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <IconSparkles size={16} className="text-orange-500" /> Đánh giá năng lực STEAM 5D
              </h4>
              <Badge variant="info">Chuẩn CSTA</Badge>
            </div>
            <p className="text-xs text-slate-500">Đánh giá đa chiều dựa trên các bài nộp và hoạt động thực tế trên lớp.</p>

            <div className="space-y-3 pt-2">
              {child.competencies.map((comp, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700 dark:text-slate-300">{comp.label}</span>
                    <span className="text-blue-600 tabular-nums">{comp.score}/100</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-sky-400 rounded-full"
                      style={{ width: `${comp.score}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => alert('Đang xuất báo cáo năng lực STEAM định dạng PDF...')}
              className="w-full mt-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <IconDownload size={16} /> Tải báo cáo năng lực (PDF)
            </button>
          </div>

          {/* Tuition Invoices */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <IconCreditCard size={16} className="text-emerald-600" /> Hóa đơn học phí gần nhất
            </h4>
            {child.invoices.map((inv) => (
              <div key={inv.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-700/50 space-y-1 text-xs">
                <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                  <span>{inv.title}</span>
                  <Badge variant="success">{inv.status}</Badge>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px] pt-1">
                  <span>Số tiền: <b className="text-slate-900 dark:text-white tabular-nums">{inv.amount}</b></span>
                  <span>Ngày: {inv.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
