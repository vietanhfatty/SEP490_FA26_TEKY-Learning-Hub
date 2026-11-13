import React, { useEffect, useState } from 'react';
import {
  IconClock,
  IconTrophy,
  IconCheckCircle,
  IconVideo,
} from '../common/Icons';
import { Badge } from '../common/Badge';
import { getStudentData, sessionStatus } from '../../services/studentClasses';
import type { StudentClasses, StudentSession } from '../../services/studentClasses';
import './StudentClasses.css';

const zone = 'Asia/Ho_Chi_Minh';
const dateText = (value: string) =>
  new Date(value).toLocaleDateString('vi-VN', {
    timeZone: zone,
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
const timeText = (value: string) =>
  new Date(value).toLocaleTimeString('vi-VN', { timeZone: zone, hour: '2-digit', minute: '2-digit' });
const dayKey = (value: string | number) => new Date(value).toLocaleDateString('en-CA', { timeZone: zone });
const sessionPath = (id: number) => `/dashboard/timetable/${id}`;

function countdown(startsAt: string, now: number) {
  const minutes = Math.ceil((Date.parse(startsAt) - now) / 60000);
  if (minutes <= 0) return 'Buổi học đang diễn ra';
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  return `${days > 0 ? `${days} ngày ` : ''}${hours} giờ ${minutes % 60} phút`;
}

function SessionBadge({ session, now }: { session: StudentSession; now: number }) {
  const status = sessionStatus(session, now);
  return <span className={`student-status ${status.kind}`}>{status.label}</span>;
}

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
  // Backend dynamic classes & timetable state
  const [data, setData] = useState<StudentClasses | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [path, setPath] = useState(window.location.pathname);
  const [detail, setDetail] = useState<StudentSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [weekOffset, setWeekOffset] = useState(0);

  // Fallback demo state
  const [projectUploaded, setProjectUploaded] = useState(false);
  const [selectedCourseTab, setSelectedCourseTab] = useState<'SCRATCH-01' | 'PY-GAME-02'>('SCRATCH-01');

  const match = /^\/dashboard\/timetable\/(\d+)$/.exec(path);
  const detailId = match ? Number(match[1]) : null;
  const invalidPath = path.startsWith('/dashboard/timetable/') && detailId === null;

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setDetail(null);
    const load = async () => {
      try {
        if (invalidPath) throw new Error('Đường dẫn buổi học không hợp lệ.');
        if (detailId !== null) {
          const result = await getStudentData<StudentSession>(`sessions/${detailId}`, controller.signal);
          if (!controller.signal.aborted) setDetail(result);
        } else {
          const result = await getStudentData<StudentClasses>('classes', controller.signal);
          if (!controller.signal.aborted) {
            setData(result);
            setSelectedClassId((prev) =>
              result.classes.some((c) => c.classId === prev) ? prev : result.classes[0]?.classId ?? null
            );
          }
        }
      } catch (failure) {
        if (!controller.signal.aborted) {
          setError(failure instanceof Error ? failure.message : 'Không thể tải dữ liệu.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [detailId, invalidPath, retry]);

  function navigate(url: string) {
    window.history.pushState({}, '', url);
    setPath(url);
    window.scrollTo({ top: 0 });
  }

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

  const selectedClass = data?.classes.find((c) => c.classId === selectedClassId);
  const backendSessions = selectedClass?.sessions ?? [];
  const nextBackendSession =
    selectedClass?.enrollmentStatus === 'Active'
      ? backendSessions.find((s) => s.status === 'Scheduled' && Date.parse(s.endsAt) > now)
      : undefined;

  const vietnamToday = new Date(`${dayKey(now)}T00:00:00+07:00`);
  const weekday = new Date(vietnamToday.getTime() + 7 * 3600000).getUTCDay();
  const monday = vietnamToday.getTime() - ((weekday + 6) % 7) * 86400000 + weekOffset * 7 * 86400000;
  const days = Array.from({ length: 7 }, (_, index) => monday + index * 86400000);

  // 1. VIEW: CHI TIẾT BUỔI HỌC (Khi nhấn vào 1 session ID)
  if (detailId !== null && detail) {
    return (
      <div className="space-y-6 py-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard/timetable')}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            ← Quay lại lịch học
          </button>
          <SessionBadge session={detail} now={now} />
        </div>

        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            {detail.courseName}
          </p>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">{detail.title}</h2>
          <p className="text-xs text-slate-500">
            {dateText(detail.startsAt)} • {timeText(detail.startsAt)} – {timeText(detail.endsAt)}
          </p>

          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-700 text-xs">
            <div>
              <dt className="text-slate-400">Khóa học</dt>
              <dd className="font-bold text-slate-800 dark:text-slate-200">{detail.courseCode}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Lớp học</dt>
              <dd className="font-bold text-slate-800 dark:text-slate-200">{detail.classCode}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Giảng viên</dt>
              <dd className="font-bold text-blue-600 dark:text-blue-400">{detail.teacherName ?? 'Thầy Hoàng Nam'}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Phòng học</dt>
              <dd className="font-bold text-slate-800 dark:text-slate-200">{detail.roomName ?? 'Online Room 04'}</dd>
            </div>
          </dl>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Nội dung buổi học</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {detail.content || 'Tìm hiểu thuật toán trọng lực, tính toán vận tốc rơi tự do và xử lý va chạm nền tảng.'}
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Tài liệu & Học liệu đính kèm</h3>
            {detail.materials.length === 0 ? (
              <p className="text-xs text-slate-400">Chưa có học liệu đính kèm cho buổi này.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {detail.materials.map((m) => (
                  <li key={m.materialId} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 flex justify-between items-center">
                    <span className="font-semibold">{m.title}</span>
                    <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold hover:underline">
                      Tải về ↗
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
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
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedCourseTab === c.code
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
                className={`p-4 rounded-2xl border text-xs transition-all ${lesson.status === 'Completed'
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

  // 6. DEFAULT / OVERVIEW: BENTO GRID KẾT HỢP DỮ LIỆU BACKEND + LỊCH TUẦN + HUY HIỆU
  return (
    <div className="space-y-8 py-6">
      {loading && (
        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 text-xs font-semibold flex items-center justify-between">
          <span>Đang đồng bộ dữ liệu lớp học thời gian thực...</span>
        </div>
      )}
      {error && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 text-xs font-medium flex items-center justify-between">
          <span>{error} (Đang hiển thị dữ liệu lớp học lưu trữ ngoại tuyến)</span>
          <button onClick={() => setRetry((r) => r + 1)} className="font-bold underline ml-2">
            Thử lại ↻
          </button>
        </div>
      )}

      {/* Top Banner & Next Class Countdown (Bento Top) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Next Class Hero Card */}
        <div className="lg:col-span-2 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="accent" className="bg-orange-500/30 text-orange-200 border-orange-400/40">
                🔴 Sắp Diễn Ra ({countdown(nextBackendSession ? nextBackendSession.startsAt : new Date(Date.now() + 45 * 60000).toISOString(), now)})
              </Badge>
              <span className="text-xs text-blue-200">Thứ Bảy, 14:00 - 15:30</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {nextBackendSession ? nextBackendSession.title : 'Lớp Scratch Game 3.0: Buổi 10'}
            </h2>
            <p className="text-blue-100 text-xs sm:text-sm max-w-xl">
              Chủ đề: Xử lý va chạm & lập trình thanh máu (HP Bar) cho nhân vật chính. Giáo viên:{' '}
              {nextBackendSession?.teacherName ?? 'Thầy Hoàng Văn Nam'}.
            </p>
          </div>

          <div className="pt-6 mt-4 border-t border-white/20 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
                HN1
              </div>
              <div>
                <p className="text-xs font-semibold">{nextBackendSession?.roomName ?? 'Phòng học Online 04'}</p>
                <p className="text-[11px] text-blue-200">
                  Meeting ID: {nextBackendSession?.sessionId ? `teky-${nextBackendSession.sessionId}` : 'teky-scratch-10'}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                if (nextBackendSession) {
                  navigate(sessionPath(nextBackendSession.sessionId));
                } else {
                  alert('Đang mở phòng học Zoom/Meet của lớp học TEKY...');
                }
              }}
              className="px-6 py-3 min-h-[44px] rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-orange-500/30 transition-all flex items-center gap-2"
            >
              Vào Lớp Học Ngay →
            </button>
          </div>
        </div>

        {/* Student Stats & Streak */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center text-xl font-bold">
                  👦
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {data?.fullName ?? 'Nguyễn Minh Quân'}
                  </h3>
                  <p className="text-xs text-slate-500">Mã HS: {data?.studentCode ?? 'TEKY-2026-88'}</p>
                </div>
              </div>
              <Badge variant="accent">Học sinh Tiêu biểu</Badge>
            </div>

            {/* Streak Counter */}
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300">🔥 Chuỗi học tập: 5 Ngày</span>
                <span className="text-xs text-amber-600 font-semibold">+50 EXP</span>
              </div>
              <div className="flex justify-between items-center mt-2.5 px-1">
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d, i) => (
                  <div key={d} className="flex flex-col items-center gap-1">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i < 5
                          ? 'bg-amber-500 text-white'
                          : i === 5
                            ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 border border-amber-400 animate-pulse'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                        }`}
                    >
                      {i < 5 ? '✓' : d}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 text-center text-xs border-t border-slate-100 dark:border-slate-700">
            <div>
              <p className="text-slate-400 text-[11px]">Tổng điểm dự án</p>
              <p className="text-lg font-black text-blue-600 tabular-nums">9.5 / 10</p>
            </div>
            <div>
              <p className="text-slate-400 text-[11px]">Chuyên cần</p>
              <p className="text-lg font-black text-emerald-600 tabular-nums">100%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Enrolled Courses & Week Schedule + Right Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Active Courses Bento Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Khóa học đang diễn ra</h3>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">2 Khóa đang theo học</span>
            </div>

            {enrolledCourses.map((c) => (
              <div
                key={c.code}
                className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-base text-slate-900 dark:text-white">{c.title}</h4>
                      <Badge variant="info">{c.badge}</Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Mã: {c.code} • GV: {c.teacher}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                      {c.completedLessons}/{c.totalLessons} Buổi học ({c.progress}%)
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${c.progress}%` }}
                  ></div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <IconClock size={16} className="text-slate-400 shrink-0" />
                    <span className="font-medium">{c.nextTopic}</span>
                  </div>
                  <button
                    onClick={() => setSelectedCourseTab(c.code as 'SCRATCH-01' | 'PY-GAME-02')}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-blue-600 shadow-sm hover:bg-slate-50"
                  >
                    Xem giáo án
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Week Schedule Matrix Preview (From studentClasses backend) */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">Lịch học theo tuần</h4>
                <p className="text-xs text-slate-500">
                  {new Date(days[0]).toLocaleDateString('vi-VN', { timeZone: zone })} –{' '}
                  {new Date(days[6]).toLocaleDateString('vi-VN', { timeZone: zone })}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  aria-label="Tuần trước"
                  onClick={() => setWeekOffset((w) => w - 1)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold"
                >
                  ←
                </button>
                <button
                  onClick={() => setWeekOffset(0)}
                  className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                >
                  Hôm nay
                </button>
                <button
                  aria-label="Tuần sau"
                  onClick={() => setWeekOffset((w) => w + 1)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold"
                >
                  →
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 pt-2 text-center text-xs">
              {days.map((day, index) => {
                const scheduled = backendSessions.filter((s) => dayKey(s.startsAt) === dayKey(day));
                const isToday = dayKey(day) === dayKey(now);
                return (
                  <div
                    key={day}
                    className={`p-2 rounded-xl border text-[11px] ${isToday
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/40'
                      }`}
                  >
                    <span className={`font-bold block ${isToday ? 'text-blue-600' : 'text-slate-700 dark:text-slate-300'}`}>
                      {index === 6 ? 'CN' : `T${index + 2}`}
                    </span>
                    <small className="text-slate-400 block text-[10px]">
                      {new Date(day).toLocaleDateString('vi-VN', { timeZone: zone, day: '2-digit', month: '2-digit' })}
                    </small>

                    <div className="mt-2">
                      {scheduled.length === 0 ? (
                        <span className="text-slate-400 text-[10px] italic">Trống</span>
                      ) : (
                        scheduled.map((s) => (
                          <button
                            key={s.sessionId}
                            onClick={() => navigate(sessionPath(s.sessionId))}
                            className="w-full p-1 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-200 text-[10px] font-semibold truncate hover:underline"
                          >
                            {timeText(s.startsAt)}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Project & Homework Submission Box */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h4 className="font-bold text-base text-slate-900 dark:text-white mb-2">Nộp dự án & Bài tập tuần này</h4>
            <p className="text-xs text-slate-500 mb-4">
              Hạn chót: Chủ Nhật, 23:59. Hỗ trợ định dạng file Scratch (.sb3), Python (.py) hoặc link GitHub.
            </p>

            <div
              onClick={() => setProjectUploaded(true)}
              className="border-2 border-dashed border-blue-300 dark:border-blue-800 rounded-2xl p-6 text-center hover:bg-blue-50/50 dark:hover:bg-blue-950/20 cursor-pointer transition-colors"
            >
              <div className="w-12 h-12 mx-auto rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center mb-3">
                <IconUploadSimple size={24} />
              </div>
              {projectUploaded ? (
                <div className="text-xs font-semibold text-emerald-600 flex items-center justify-center gap-1.5">
                  <IconCheckCircle size={16} />
                  <span>Đã tải lên: flappy_bird_scratch_final.sb3 (1.4 MB) - Sẵn sàng nộp!</span>
                </div>
              ) : (
                <>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Kéo thả file bài tập vào đây, hoặc click để chọn file từ máy
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Dung lượng tối đa 25MB</p>
                </>
              )}
            </div>
          </div>
        </div>
      </>}
    </section>;
}
