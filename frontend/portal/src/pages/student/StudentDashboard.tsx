import React, { useState } from 'react';
import {
  IconClock,
  IconTrophy,
  IconCheckCircle,
  IconVideo,
  IconDownload,
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
        { num: 1, title: 'Cài đặt môi trường Python & Lệnh print/input', status: 'Completed', score: 10 },
        { num: 2, title: 'Biến số và kiểu dữ liệu cơ bản (int, float, str)', status: 'Completed', score: 9 },
        { num: 3, title: 'Toán tử số học & Logic so sánh', status: 'Completed', score: 9.5 },
        { num: 4, title: 'Dự án: Trò chơi đoán số may mắn (Random library)', status: 'Completed', score: 10 },
        { num: 5, title: 'Cấu trúc rẽ nhánh If-Else & Vòng lặp For', status: 'Next', score: null },
        { num: 6, title: 'Vòng lặp While & Ứng dụng menu console', status: 'Locked', score: null },
      ],
    },
  ];

  const recentBadges = [
    { title: 'Chăm Chỉ 100%', desc: 'Điểm danh đầy đủ 8 buổi liên tiếp', icon: '🏆', date: '02/11/2026', unlocked: true },
    { title: 'Coder Tốc Độ', desc: 'Nộp bài tập Scratch sớm nhất lớp', icon: '⚡', date: '28/10/2026', unlocked: true },
    { title: 'Sáng Tạo Vô Cực', desc: 'Dự án game có cốt truyện độc đáo', icon: '🎨', date: '20/10/2026', unlocked: true },
    { title: 'Bậc Thầy Thuật Toán', desc: 'Xử lý logic vòng lặp không lỗi', icon: '🧠', date: '15/10/2026', unlocked: true },
    { title: 'Robotics Master', desc: 'Lắp ráp mô hình cứu hỏa hoạt động', icon: '🤖', date: 'Sắp đạt', unlocked: false },
    { title: 'Thuyết Trình Xuất Sắc', desc: 'Đạt điểm A+ phần bảo vệ dự án', icon: '🎤', date: 'Chưa mở', unlocked: false },
  ];

  const activeCourse = enrolledCourses.find((c) => c.code === selectedCourseTab) || enrolledCourses[0];

  // RENDER VIEW: LIVE CLASSROOM
  if (activeNavId === 'live') {
    return (
      <div className="space-y-6 animate-in fade-in duration-150">
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 text-white shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-xl">
              <div className="flex items-center gap-2">
                <Badge variant="accent" className="bg-orange-500/30 text-orange-200 border-orange-400/40">
                  🔴 Buổi học Live chuẩn bị diễn ra
                </Badge>
                <span className="text-xs text-blue-200">Bắt đầu: 14:00 (Thứ Bảy hôm nay)</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Lớp Scratch Game 3.0: Buổi 10
              </h2>
              <p className="text-blue-100 text-xs sm:text-sm leading-relaxed">
                Chủ đề: Lập trình xử lý va chạm & Nhảy trọng lực cho nhân vật chính. Giáo viên phụ trách:{' '}
                <span className="font-semibold text-white">Thầy Hoàng Văn Nam</span>.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 text-center min-w-[200px] space-y-2">
              <p className="text-[11px] text-blue-200 uppercase font-bold tracking-wider">Thời gian còn lại</p>
              <div className="text-3xl font-black tabular-nums tracking-tight text-white">00:45:12</div>
              <button
                onClick={() => alert('Đang kết nối vào phòng học trực tuyến TEKY Meeting...')}
                className="w-full px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-orange-500/30 transition-all flex items-center justify-center gap-2"
              >
                <IconVideo size={16} />
                <span>Vào phòng học ngay</span>
              </button>
            </div>
          </div>
        </div>

        {/* Classroom Equipment Check & Rules */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🎙️</span>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Kiểm tra Micro & Camera</h4>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Hãy đảm bảo tai nghe và micro hoạt động tốt để trao đổi trực tiếp cùng thầy và các bạn trong lớp.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
              <IconCheckCircle size={16} /> Thiết bị đã sẵn sàng
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">💻</span>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Mở sẵn Scratch 3.0</h4>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Khởi động phần mềm Scratch Desktop hoặc mở trang web Scratch online trước khi vào lớp để không bị lỡ bài học.
            </p>
            <a
              href="https://scratch.mit.edu"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
            >
              Mở Scratch Online ↗
            </a>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">⭐</span>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Quy tắc lớp học vui vẻ</h4>
            </div>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>• Vào lớp trước giờ học 5 phút.</li>
              <li>• Giơ tay phát biểu khi có ý tưởng hay.</li>
              <li>• Tích cực chia sẻ màn hình sản phẩm.</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // RENDER VIEW: COURSES & SYLLABUS ROADMAP
  if (activeNavId === 'courses') {
    return (
      <div className="space-y-6 animate-in fade-in duration-150">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Khóa học & Lộ trình chi tiết</h2>
            <p className="text-xs text-slate-500">Theo dõi toàn bộ 12 buổi học theo tiêu chuẩn giáo trình CSTA Hoa Kỳ.</p>
          </div>
          <div className="flex gap-2">
            {enrolledCourses.map((c) => (
              <button
                key={c.code}
                onClick={() => setSelectedCourseTab(c.code as 'SCRATCH-01' | 'PY-GAME-02')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  selectedCourseTab === c.code
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Course Header Banner */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge variant="info">{activeCourse.code}</Badge>
              <span className="text-xs font-semibold text-slate-400">Giảng viên: {activeCourse.teacher}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{activeCourse.title}</h3>
            <p className="text-xs text-slate-500">Đã hoàn thành {activeCourse.completedLessons}/{activeCourse.totalLessons} buổi học ({activeCourse.progress}%)</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-slate-400 font-medium">Cấp độ hiện tại</p>
              <p className="text-sm font-bold text-orange-600">{activeCourse.badge}</p>
            </div>
            <button
              onClick={() => alert('Đang tải toàn bộ giáo trình PDF...')}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-200 transition-colors flex items-center gap-1.5"
            >
              <IconDownload size={15} /> Tải giáo trình
            </button>
          </div>
        </div>

        {/* Lessons List Roadmap */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-700 font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
            <span>Danh sách 12 buổi học</span>
            <span className="text-xs text-slate-400 font-normal">Xanh lá: Đã học • Cam: Buổi tiếp theo • Khóa: Sắp tới</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {activeCourse.syllabus.map((lesson) => (
              <div
                key={lesson.num}
                className={`p-4 sm:p-5 flex items-center justify-between gap-4 transition-colors ${
                  lesson.status === 'Next'
                    ? 'bg-blue-50/70 dark:bg-blue-950/40 border-l-4 border-l-blue-600'
                    : 'hover:bg-slate-50/80 dark:hover:bg-slate-700/30'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                      lesson.status === 'Completed'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : lesson.status === 'Next'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                    }`}
                  >
                    {lesson.status === 'Completed' ? '✓' : lesson.num}
                  </div>
                  <div>
                    <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      Buổi {lesson.num}: {lesson.title}
                    </h5>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                      {lesson.score !== null && (
                        <span className="font-semibold text-emerald-600">Điểm số: {lesson.score}/10</span>
                      )}
                      <span>• Thời lượng: 90 phút</span>
                    </div>
                  </div>
                </div>

                <div>
                  {lesson.status === 'Completed' ? (
                    <Badge variant="success">Đã hoàn thành</Badge>
                  ) : lesson.status === 'Next' ? (
                    <Badge variant="accent">Buổi học kế tiếp</Badge>
                  ) : (
                    <Badge variant="neutral">Chưa mở</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // RENDER VIEW: ASSIGNMENTS & HOMEWORK
  if (activeNavId === 'assignments') {
    return (
      <div className="space-y-6 animate-in fade-in duration-150">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Dự án & Nộp bài tập STEAM</h2>
            <p className="text-xs text-slate-500">Nộp file Scratch (.sb3), Python (.py) hoặc link dự án trực tuyến để nhận điểm và huy hiệu.</p>
          </div>
          <Badge variant="warning">1 Bài cần nộp tuần này</Badge>
        </div>

        {/* Current Active Assignment */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-blue-600">Scratch Game 3.0 • Buổi 9</span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                Dự án: Lập trình Game Flappy Bird hoàn chỉnh (Có tính điểm và âm thanh)
              </h3>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-rose-600">Hạn chót: Chủ Nhật 23:59</span>
              <p className="text-[11px] text-slate-400">Còn 2 ngày</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/50 text-xs text-slate-600 dark:text-slate-300 space-y-2">
            <p className="font-semibold text-slate-800 dark:text-slate-100">Yêu cầu dự án:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-500 dark:text-slate-400 text-[11px]">
              <li>Nhân vật chú chim có hiệu ứng vỗ cánh khi bấm phím Space.</li>
              <li>Chướng ngại vật cột ống di chuyển liên tục từ phải sang trái.</li>
              <li>Có biến Score tăng thêm 1 điểm khi vượt qua mỗi cột.</li>
              <li>Có âm thanh Game Over khi chạm vào cột hoặc rơi xuống đất.</li>
            </ul>
          </div>

          {/* Interactive Dropzone */}
          <div
            onClick={() => setProjectUploaded(true)}
            className="border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-2xl p-8 text-center hover:bg-blue-50/50 dark:hover:bg-blue-950/20 cursor-pointer transition-colors"
          >
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center mb-3">
              <IconUploadSimple size={28} />
            </div>
            {projectUploaded ? (
              <div className="space-y-2">
                <div className="text-xs font-bold text-emerald-600 flex items-center justify-center gap-2">
                  <IconCheckCircle size={18} />
                  <span>Đã tải lên tệp: flappy_bird_scratch_final.sb3 (1.4 MB)</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    alert('Đã gửi bài tập thành công cho Thầy Hoàng Văn Nam chấm điểm!');
                  }}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-[0.98] transition-all"
                >
                  Xác nhận Nộp bài ngay →
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                  Kéo thả file bài tập vào đây, hoặc click để chọn file từ máy
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Định dạng hỗ trợ: .sb3, .py, .zip (Tối đa 25MB)</p>
              </>
            )}
          </div>
        </div>

        {/* Previous Submissions History */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">Lịch sử bài tập đã chấm điểm</h4>
          <div className="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
            <div className="py-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">Buổi 8: Game Bắt Táo Rơi (Apple Catcher)</p>
                <p className="text-[11px] text-slate-400">Nộp ngày 25/10/2026 • Thầy Hoàng Nam chấm</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-emerald-600 text-sm">10/10 ⭐</span>
                <Badge variant="success">Xuất sắc</Badge>
              </div>
            </div>
            <div className="py-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">Buổi 5: Dự án Mèo bắt chuột Mini</p>
                <p className="text-[11px] text-slate-400">Nộp ngày 10/10/2026 • Thầy Hoàng Nam chấm</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-emerald-600 text-sm">9.5/10 ⭐</span>
                <Badge variant="success">Đạt chuẩn</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // RENDER VIEW: ACHIEVEMENTS & TROPHY ROOM
  if (activeNavId === 'achievements') {
    return (
      <div className="space-y-6 animate-in fade-in duration-150">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Bảng Vàng Thành Tích & Huy Hiệu</h2>
            <p className="text-xs text-slate-500">Mỗi buổi học và dự án hoàn thành giúp em thăng cấp và tích lũy XP!</p>
          </div>
          <Badge variant="accent">Cấp độ 4: Coder Nhí Triển Vọng</Badge>
        </div>

        {/* XP & Level Meter */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg space-y-3">
          <div className="flex justify-between items-center text-xs font-bold">
            <span>Tiến trình thăng cấp Level 5</span>
            <span className="tabular-nums">850 / 1000 XP</span>
          </div>
          <div className="w-full h-3 rounded-full bg-white/30 overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-300" style={{ width: '85%' }}></div>
          </div>
          <p className="text-[11px] text-white/90">Chỉ còn 150 XP nữa để đạt huy hiệu 👑 Hiệp sĩ Scratch!</p>
        </div>

        {/* Badges Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {recentBadges.map((b, idx) => (
            <div
              key={idx}
              className={`p-5 rounded-2xl border transition-all flex items-start gap-4 ${
                b.unlocked
                  ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 opacity-60'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-2xl flex items-center justify-center shrink-0">
                {b.icon}
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  {b.title}
                  {b.unlocked && <span className="text-[10px] text-emerald-600 font-bold">✓ Đã mở</span>}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">{b.desc}</p>
                <p className="text-[10px] text-slate-400 pt-1">{b.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // DEFAULT RENDER VIEW: OVERVIEW BENTO
  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Top Banner & Next Class Countdown (Bento Top) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Next Class Hero Card */}
        <div className="lg:col-span-2 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="accent" className="bg-orange-500/30 text-orange-200 border-orange-400/40">
                🔴 Sắp Diễn Ra (Còn 45 phút)
              </Badge>
              <span className="text-xs text-blue-200">Thứ Bảy, 14:00 - 15:30</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Lớp Scratch Game 3.0: Buổi 10
            </h2>
            <p className="text-blue-100 text-xs sm:text-sm max-w-xl">
              Chủ đề: Xử lý va chạm & lập trình thanh máu (HP Bar) cho nhân vật chính. Giáo viên: Thầy Hoàng Văn Nam.
            </p>
          </div>

          <div className="pt-6 mt-4 border-t border-white/20 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
                HN1
              </div>
              <div>
                <p className="text-xs font-semibold">Phòng học Online 04</p>
                <p className="text-[11px] text-blue-200">Meeting ID: teky-scratch-10</p>
              </div>
            </div>

            <button
              onClick={() => alert('Đang mở phòng học trực tuyến của lớp học TEKY...')}
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
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">Nguyễn Minh Quân</h3>
                  <p className="text-xs text-slate-500">Mã HS: TEKY-2026-88</p>
                </div>
              </div>
              <Badge variant="accent">Học sinh Tiêu biểu</Badge>
            </div>

            {/* Streak Counter */}
            <div className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-orange-800 dark:text-orange-300">🔥 Chuỗi học tập liên tiếp</span>
                <span className="text-lg font-extrabold text-orange-600 tabular-nums">12 Ngày</span>
              </div>
              <p className="text-[11px] text-orange-700 dark:text-orange-400 mt-1">Hoàn thành bài tập đúng hạn để nhận thêm Huy hiệu Master!</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center pt-2 border-t border-slate-100 dark:border-slate-700 text-xs">
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <p className="text-slate-400 text-[11px]">Điểm trung bình</p>
              <p className="text-base font-bold text-slate-900 dark:text-white tabular-nums">9.5/10</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <p className="text-slate-400 text-[11px]">Huy hiệu đạt được</p>
              <p className="text-base font-bold text-orange-600 tabular-nums">8 Huy hiệu</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Bento: Enrolled Courses & Curriculum Roadmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Courses & Milestone Progress */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Lộ trình khóa học của em</h3>
            <span className="text-xs text-blue-600 font-semibold cursor-pointer">Xem tất cả giáo trình →</span>
          </div>

          <div className="space-y-4">
            {enrolledCourses.map((c, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{c.code}</span>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">{c.title}</h4>
                  </div>
                  <Badge variant="info">{c.badge}</Badge>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5 font-medium">
                    <span className="text-slate-600 dark:text-slate-400">Tiến độ bài học: {c.completedLessons}/{c.totalLessons} buổi</span>
                    <span className="text-blue-600 font-bold tabular-nums">{c.progress}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-sky-400 rounded-full transition-all duration-300" style={{ width: `${c.progress}%` }}></div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <IconClock size={16} className="text-slate-400 shrink-0" />
                    <span className="font-medium">{c.nextTopic}</span>
                  </div>
                  <button className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-blue-600 shadow-sm hover:bg-slate-50">
                    Tài liệu bài học
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Project & Homework Submission Box */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h4 className="font-bold text-base text-slate-900 dark:text-white mb-2">Nộp dự án & Bài tập tuần này</h4>
            <p className="text-xs text-slate-500 mb-4">Hạn chót: Chủ Nhật, 23:59. Hỗ trợ định dạng file Scratch (.sb3), Python (.py) hoặc link GitHub.</p>

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
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Kéo thả file bài tập vào đây, hoặc click để chọn file từ máy</p>
                  <p className="text-[11px] text-slate-400 mt-1">Dung lượng tối đa 25MB</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Badges & Teacher Remarks */}
        <div className="space-y-6">
          {/* Trophy Cabinet */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <IconTrophy size={18} className="text-orange-500" /> Bảng Vàng Thành Tích
              </h4>
              <span className="text-[11px] text-slate-400">8/20 Huy hiệu</span>
            </div>

            <div className="space-y-3">
              {recentBadges.slice(0, 4).map((b, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-xs">
                  <span className="text-2xl">{b.icon}</span>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 dark:text-slate-200">{b.title}</p>
                    <p className="text-[11px] text-slate-500">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Teacher Latest Remarks */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-3">Nhận xét buổi học gần nhất</h4>
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-blue-900 dark:text-blue-300">Thầy Hoàng Nam</span>
                <span className="text-amber-500">★★★★★</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 italic text-[11px] leading-relaxed">
                "Minh Quân nắm bắt thuật toán trọng lực rất nhanh. Em đã tự tạo thêm tính năng âm thanh khi nhân vật nhảy rất sáng tạo!"
              </p>
              <div className="pt-2 border-t border-blue-200/60 dark:border-blue-800/60 text-[10px] text-slate-400">
                Buổi 9 • Ngày 01/11/2026
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
