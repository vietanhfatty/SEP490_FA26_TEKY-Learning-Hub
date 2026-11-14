import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { StudentClassesView } from '@teky/shared/ui/StudentClassesView';
import {
  IconTrophy,
  IconCheckCircle,
  IconVideo,
} from '../common/Icons';
import { Badge } from '../common/Badge';

// Upload icon
const IconUploadSimple: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" x2="12" y1="3" y2="15" />
  </svg>
);

interface StudentDashboardProps {
  activeNavId?: string;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ activeNavId = 'overview' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const sessionParam = location.pathname.startsWith('/dashboard/timetable/')
    ? location.pathname.slice('/dashboard/timetable/'.length).replace(/\/$/, '')
    : undefined;

  // Fallback demo state
  const [projectUploaded, setProjectUploaded] = useState(false);
  const [selectedCourseTab, setSelectedCourseTab] = useState<'SCRATCH-01' | 'PY-GAME-02'>('SCRATCH-01');

  const enrolledCourses = [
    {
      title: 'Lập trình Scratch Game 3.0',
      code: 'SCRATCH-01',
      subject: 'Scratch',
      progress: 75,
      completedLessons: 9,
      totalLessons: 12,
      teacher: 'Thầy Hoàng Văn Nam',
      nextTopic: 'Buổi 10: Xử lý va chạm & Nhảy nhân vật nâng cao',
      badge: 'Level 2 Intermediate',
      syllabus: [
        { num: 1, title: 'Làm quen giao diện Scratch & Tạo nhân vật đầu tiên', status: 'Completed', score: 10 },
        { num: 2, title: 'Tọa độ X-Y & Lập trình di chuyển phím mũi tên', status: 'Completed', score: 9.5 },
        { num: 3, title: 'Vòng lặp & Biến đổi trang phục nhân vật (Costumes)', status: 'Completed', score: 10 },
        { num: 4, title: 'Cấu trúc rẽ nhánh If-Else & Cảm biến chuột', status: 'Completed', score: 9 },
        { num: 5, title: 'Dự án Mini 1: Mèo bắt chuột (Score counter)', status: 'Completed', score: 10 },
        { num: 6, title: 'Phát và nhận thông điệp (Broadcast messaging)', status: 'Completed', score: 9.5 },
        { num: 7, title: 'Tạo bản sao nhân vật (Clones) - Mưa hoa quả', status: 'Completed', score: 10 },
        { num: 8, title: 'Lập trình thanh máu HP & Đếm thời gian', status: 'Completed', score: 9 },
        { num: 9, title: 'Hiệu ứng âm thanh & Bảng thông báo Game Over', status: 'Completed', score: 9.5 },
        { num: 10, title: 'Xử lý va chạm & Nhảy nhân vật nâng cao', status: 'Next', score: null },
        { num: 11, title: 'Thiết kế Boss & Đạn bắn liên hoàn', status: 'Locked', score: null },
        { num: 12, title: 'Thuyết trình sản phẩm tốt nghiệp STEAM', status: 'Locked', score: null },
      ],
    },
    {
      title: 'Python Ứng dụng & Mini Games',
      code: 'PY-GAME-02',
      subject: 'Python',
      progress: 30,
      completedLessons: 4,
      totalLessons: 14,
      teacher: 'Thầy Lê Quang Đạt',
      nextTopic: 'Buổi 5: Cấu trúc rẽ nhánh If-Else & Vòng lặp For',
      badge: 'Level 1 Beginner',
      syllabus: [
        { num: 1, title: 'Cài đặt Python, IDLE & Lệnh print() đầu tiên', status: 'Completed', score: 10 },
        { num: 2, title: 'Biến số (Variables) & Kiểu dữ liệu số/chuỗi', status: 'Completed', score: 9.0 },
        { num: 3, title: 'Nhập dữ liệu với input() & Toán tử toán học', status: 'Completed', score: 9.5 },
        { num: 4, title: 'Cấu trúc điều khiển If-Elif-Else & So sánh', status: 'Completed', score: 8.5 },
        { num: 5, title: 'Vòng lặp For & Hàm range() vẽ hình sao', status: 'Next', score: null },
        { num: 6, title: 'Vòng lặp While & Trò chơi Đoán số bí ẩn', status: 'Locked', score: null },
        { num: 7, title: 'Lập trình đồ họa với thư viện Turtle Python', status: 'Locked', score: null },
      ],
    },
  ];

  const recentBadges = [
    { title: 'Chăm Chỉ 100%', desc: 'Điểm danh đầy đủ 8 buổi liên tiếp', icon: '🏆', date: '02/11/2026' },
    { title: 'Coder Tốc Độ', desc: 'Nộp bài tập Scratch sớm nhất lớp', icon: '⚡', date: '28/10/2026' },
    { title: 'Sáng Tạo Vô Cực', desc: 'Dự án game có cốt truyện độc đáo', icon: '🎨', date: '20/10/2026' },
    { title: 'Chuyên Gia Bug Hunter', desc: 'Tự sửa 5 lỗi logic thuật toán', icon: '🐞', date: '15/10/2026' },
    { title: 'Đồng Đội Xuất Sắc', desc: 'Hỗ trợ bạn cùng bàn hoàn thiện code', icon: '🤝', date: '08/10/2026' },
  ];

  const currentCourse = enrolledCourses.find((c) => c.code === selectedCourseTab) || enrolledCourses[0];

  // 1. VIEW: Chi tiết buổi học mở bằng URL nội bộ.
  if (sessionParam !== undefined) {
    return <StudentClassesView sessionParam={sessionParam} onNavigate={navigate} />;
  }

  // 2. VIEW: KHÓA HỌC & ĐỀ CƯƠNG SYLLABUS
  if (activeNavId === 'courses') {
    return (
      <div className="space-y-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Khóa Học & Lộ Trình Đào Tạo STEAM</h3>
            <p className="text-xs text-slate-500">Xem tiến độ chi tiết từng buổi học chuẩn khung CSTA Hoa Kỳ</p>
          </div>

          <div className="flex gap-2">
            {enrolledCourses.map((c) => (
              <button
                key={c.code}
                onClick={() => setSelectedCourseTab(c.code as 'SCRATCH-01' | 'PY-GAME-02')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedCourseTab === c.code
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                {c.title.split(' ')[2] || c.code} ({c.progress}%)
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-700">
            <div>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                {currentCourse.code} • GV: {currentCourse.teacher}
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{currentCourse.title}</h2>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-blue-600 tabular-nums">{currentCourse.progress}%</span>
              <p className="text-[11px] text-slate-400">
                {currentCourse.completedLessons}/{currentCourse.totalLessons} buổi hoàn thành
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentCourse.syllabus.map((lesson) => (
              <div
                key={lesson.num}
                className={`p-4 rounded-2xl border text-xs transition-all ${
                  lesson.status === 'Completed'
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50'
                    : lesson.status === 'Next'
                    ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 ring-2 ring-blue-500/20'
                    : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/50 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-[11px] px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-700">
                    Buổi {lesson.num}
                  </span>
                  {lesson.score !== null ? (
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {lesson.score}/10 điểm
                    </span>
                  ) : lesson.status === 'Next' ? (
                    <Badge variant="accent">Buổi tiếp theo</Badge>
                  ) : (
                    <span className="text-slate-400 text-[10px]">🔒 Chưa mở</span>
                  )}
                </div>
                <p className="font-bold text-slate-800 dark:text-slate-200 line-clamp-2">{lesson.title}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 3. VIEW: PHÒNG HỌC TRỰC TUYẾN (LIVE CLASSROOM)
  if (activeNavId === 'live') {
    return (
      <div className="space-y-6 py-6">
        <div className="p-8 rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 text-white shadow-xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Badge variant="accent" className="bg-orange-500/40 text-orange-200 border-orange-300/40 px-3 py-1">
              🔴 Phòng học Trực tuyến STEAM WebRTC
            </Badge>
            <span className="text-xs text-blue-200 font-medium">Hệ thống âm thanh & Micro: Hoạt động tốt ✓</span>
          </div>

          <div className="max-w-2xl space-y-2">
            <h2 className="text-3xl font-black">Lớp Scratch Game 3.0: Buổi 10</h2>
            <p className="text-blue-100 text-sm leading-relaxed">
              Xử lý va chạm nhân vật & lập trình trọng lực. Giảng viên trực tiếp: <strong>Thầy Hoàng Văn Nam</strong>.
            </p>
          </div>

          <div className="pt-4 flex flex-wrap gap-4 items-center">
            <button
              onClick={() => alert('Đang kết nối vào phòng học trực tuyến TEKY STEAM...')}
              className="px-8 py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-extrabold text-sm shadow-xl shadow-orange-500/30 transition-all flex items-center gap-2"
            >
              <IconVideo size={20} /> Tham gia Lớp học Trực tuyến Ngay →
            </button>
            <button
              onClick={() => alert('Đang chạy kiểm tra camera và micro...')}
              className="px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md border border-white/20 transition-all"
            >
              Kiểm tra thiết bị (Mic & Cam)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. VIEW: DỰ ÁN & BÀI TẬP (DROPZONE)
  if (activeNavId === 'assignments') {
    return (
      <div className="space-y-6 py-6">
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">Nộp Dự Án & Bài Tập Tuần Này</h3>
          <p className="text-xs text-slate-500">
            Hạn nộp: Chủ Nhật, 23:59. Hỗ trợ định dạng file Scratch (.sb3), Python (.py), Arduino (.ino) hoặc file nén (.zip).
          </p>

          <div
            onClick={() => setProjectUploaded(true)}
            className="border-2 border-dashed border-blue-400 dark:border-blue-700 rounded-3xl p-10 text-center hover:bg-blue-50/50 dark:hover:bg-blue-950/20 cursor-pointer transition-all"
          >
            <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center mb-4">
              <IconUploadSimple size={32} />
            </div>
            {projectUploaded ? (
              <div className="text-sm font-bold text-emerald-600 flex items-center justify-center gap-2">
                <IconCheckCircle size={20} />
                <span>Đã nộp thành công: flappy_bird_scratch_final.sb3 (1.4 MB) • Điểm chờ chấm</span>
              </div>
            ) : (
              <>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Kéo thả file mã nguồn dự án vào đây, hoặc nhấn để chọn từ máy tính
                </p>
                <p className="text-xs text-slate-400 mt-1">Dung lượng tối đa 25MB • Chuẩn định dạng TEKY</p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 5. VIEW: BẢNG VÀNG THÀNH TÍCH (TROPHY CABINET)
  if (activeNavId === 'achievements') {
    return (
      <div className="space-y-6 py-6">
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <IconTrophy size={22} className="text-amber-500" /> Bảng Vàng & Huy Hiệu STEAM Đạt Được
            </h3>
            <Badge variant="success">8/20 Huy hiệu đã mở khóa</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {recentBadges.map((b, idx) => (
              <div key={idx} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200/80 dark:border-slate-700 flex items-start gap-3">
                <span className="text-3xl">{b.icon}</span>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{b.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{b.desc}</p>
                  <span className="text-[10px] text-slate-400 mt-2 block font-medium">Đạt được: {b.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 6. DEFAULT / OVERVIEW: Danh sách lớp học và lịch từ backend.
  return <StudentClassesView sessionParam={sessionParam} onNavigate={navigate} />;
};
