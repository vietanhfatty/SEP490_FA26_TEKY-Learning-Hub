import React, { useEffect, useRef, useState } from 'react';
import { IconArrowRight, IconBookOpen, IconCalendar, IconCheckCircle, IconClock, IconCode, IconGrid, IconMenu, IconSearch, IconTrophy, IconVideo, IconX } from '../common/Icons';
import { Badge } from '../common/Badge';
import { subscribeRealtimeEvents } from '../../services/lmsApi';
import { getStudentData, sessionStatus } from '@teky/shared/api-client/studentClasses';
import type { StudentClasses, StudentSession } from '@teky/shared/api-client/studentClasses';
import './StudentClasses.css';

interface CourseSummary {
  id: string;
  title: string;
  code: string;
  subject: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  teacher: string;
  nextTopic: string;
  lessons?: { id: number; title: string; date?: string; completed: boolean }[];
}

interface UpcomingSession {
  id: number;
  title: string;
  courseName: string;
  teacher: string;
  room: string;
  startsAt: string;
  endsAt: string;
}

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLocaleLowerCase('vi').trim();
const percent = (value: number) => Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
const time = (value: string) => new Date(value).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' });
const date = (value: string | number) => new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit' });
const day = (value: string | number) => new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

function CourseCover({ course }: { course: CourseSummary }) {
  const python = normalize(`${course.subject} ${course.title}`).includes('python');
  return (
    <div className={`tl-course-cover ${python ? 'tl-cover-python' : 'tl-cover-scratch'}`} aria-hidden="true">
      <span className="tl-cover-label">TEKY / {python ? 'LẬP TRÌNH PYTHON' : course.subject.toLocaleUpperCase('vi')}</span>
      {python ? (
        <div className="tl-cover-editor"><span className="tl-editor-dots">● ● ● <span>hello_teky.py</span></span><code><b>def</b> create_something():<br />&nbsp;&nbsp;dream = <em>"big ideas"</em><br />&nbsp;&nbsp;<b>return</b> dream<br /><br /><span>create_something()</span></code></div>
      ) : (
        <div className="tl-cover-blocks"><span>khi bấm vào ⚑</span><span>lặp lại <b>10</b> lần</span><span>di chuyển <b>10</b> bước</span><span>nói <b>Xin chào TEKY!</b></span><IconCode size={66} /></div>
      )}
      <span className="tl-cover-caption">{python ? 'TỪ Ý TƯỞNG ĐẾN DÒNG CODE' : 'HỌC LẬP TRÌNH, THỎA SỨC SÁNG TẠO'}</span>
    </div>
  );
}

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
const sessionPath = (id: number) => `/dashboard/timetable/${id}`;

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
  onSelectNav?: (id: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ activeNavId = 'overview', onSelectNav }) => {
  // Backend dynamic classes & timetable state
  const [data, setData] = useState<StudentClasses | null>(null);
  const [path, setPath] = useState(window.location.pathname);
  const [detail, setDetail] = useState<StudentSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selectedCourse, setSelectedCourse] = useState<CourseSummary | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedCourse && dialog.current && !dialog.current.open) dialog.current.showModal();
    if (!selectedCourse && dialog.current?.open) dialog.current.close();
  }, [selectedCourse]);

  // Fallback demo state
  const [projectUploaded, setProjectUploaded] = useState(false);
  const [focusLock, setFocusLock] = useState<{ isLocked: boolean; message: string } | null>(null);
  const [spotlightBanner, setSpotlightBanner] = useState<{ studentName: string; payload: string } | null>(null);
  const [cheerCelebration, setCheerCelebration] = useState<{ stickerName: string; message: string } | null>(null);

  useEffect(() => {
    return subscribeRealtimeEvents((ev) => {
      if (ev.type === 'FOCUS_MODE') {
        setFocusLock(ev.isLocked ? { isLocked: true, message: ev.message } : null);
      } else if (ev.type === 'SPOTLIGHT') {
        setSpotlightBanner({ studentName: ev.studentName, payload: ev.screenPayload });
      } else if (ev.type === 'CHEER_CONFETTI') {
        setCheerCelebration({ stickerName: ev.stickerName, message: ev.message });
      }
    });
  }, []);

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
    setLoading(true);
    setError('');
    setDetail(null);
    setPath(url);
    window.scrollTo({ top: 0 });
  }

  function retryLoad() {
    setLoading(true);
    setError('');
    setDetail(null);
    setRetry((value) => value + 1);
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

  // Session details stay in this workspace; no unsupported route is pushed.
  if (detailId !== null) {
    return (
      <div className="talent-session-detail">
        <button className="talent-detail-back" onClick={() => navigate(window.location.pathname)}>← Quay lại không gian học tập</button>
        {loading && <div className="talent-detail-card" role="status">Đang tải nội dung buổi học…</div>}
        {error && <div className="talent-detail-card" role="alert"><p>{error}</p><button className="talent-detail-back" onClick={retryLoad}>Thử lại</button></div>}
        {!loading && !error && detail && <>
          <section className="talent-detail-card">
            <div className="talent-detail-top"><span>{detail.courseName}</span><SessionBadge session={detail} now={now} /></div>
            <h1>{detail.title}</h1>
            <p>{dateText(detail.startsAt)} · {timeText(detail.startsAt)} – {timeText(detail.endsAt)}</p>
            <dl>
              <div><dt>Khóa học</dt><dd>{detail.courseCode}</dd></div>
              <div><dt>Lớp học</dt><dd>{detail.classCode}</dd></div>
              <div><dt>Giảng viên</dt><dd>{detail.teacherName || 'Chưa phân công'}</dd></div>
              <div><dt>Phòng học</dt><dd>{detail.roomName || 'Chưa cập nhật'}</dd></div>
            </dl>
          </section>
          <div className="talent-detail-columns">
            <section className="talent-detail-card"><h2>Nội dung buổi học</h2><p className="talent-detail-content">{detail.content || 'Giảng viên chưa cập nhật nội dung buổi học.'}</p></section>
            <section className="talent-detail-card"><h2>Tài liệu & học liệu</h2>
              {detail.materials.length ? <ul>{detail.materials.map((material) => <li key={material.materialId}><span>{material.title}</span><a href={material.fileUrl} target="_blank" rel="noopener noreferrer">Mở tài liệu ↗</a></li>)}</ul> : <p>Chưa có học liệu đính kèm cho buổi này.</p>}
            </section>
          </div>
        </>}
      </div>
    );
  }

  // 4. VIEW: DỰ ÁN & BÀI TẬP (DROPZONE)
  if (activeNavId === 'assignments') {
    return (
      <div className="space-y-6 py-6">
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">Assignments</h3>
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
              <IconTrophy size={22} className="text-amber-500" /> Gamification &amp; Leaderboard
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

  // TalentLMS-inspired overview; API classes take precedence over labelled demo data.
  const overviewCourses: CourseSummary[] = data ? data.classes.map((course) => {
    const completed = course.sessions.filter((session) => session.status === 'Done').length;
    const next = course.sessions.find((session) => session.status === 'Scheduled' && Date.parse(session.endsAt) > now);
    return {
      id: String(course.classId), title: course.courseName, code: course.classCode,
      subject: course.courseName.toLowerCase().includes('python') ? 'Python' : course.courseName.toLowerCase().includes('scratch') ? 'Scratch' : 'STEAM',
      progress: Math.max(0, Math.min(100, course.progressPercent)),
      completedLessons: completed, totalLessons: course.sessions.length,
      teacher: course.teacherName || 'Chưa phân công giảng viên',
      nextTopic: next?.title || (course.progressPercent >= 100 ? 'Bạn đã hoàn thành khóa học' : 'Chờ cập nhật lịch học'),
      lessons: course.sessions.map((session) => ({ id: session.sessionId, title: session.title, date: session.startsAt, completed: session.status === 'Done' })),
    };
  }) : enrolledCourses.map((course) => ({
    id: course.code, title: course.title, code: course.code, subject: course.subject,
    progress: course.progress, completedLessons: course.completedLessons,
    totalLessons: course.totalLessons, teacher: course.teacher, nextTopic: course.nextTopic,
    lessons: course.syllabus.map((lesson) => ({ id: lesson.num, title: lesson.title, completed: lesson.status === 'Completed' })),
  }));
  const overviewSessions = data?.classes.filter((course) => course.enrollmentStatus === 'Active')
    .flatMap((course) => course.sessions)
    .filter((session) => session.status === 'Scheduled' && Date.parse(session.endsAt) > now)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)) ?? [];

  const section = activeNavId === 'courses' ? 'courses' : activeNavId === 'live' ? 'live' : 'overview';
  const trainingHours = data ? data.classes.flatMap((course) => course.sessions)
    .filter((session) => session.status === 'Done')
    .reduce((hours, session) => hours + Math.max(0, Date.parse(session.endsAt) - Date.parse(session.startsAt)) / 3600000, 0) : 24.5;
  const experiencePoints = data ? undefined : 950;
  const fullName = data?.fullName || 'Học viên TEKY';
  const isDemo = !data;
  const courses = overviewCourses;
  const sessions: UpcomingSession[] = overviewSessions.map((session) => ({
    id: session.sessionId, title: session.title, courseName: session.courseName,
    teacher: session.teacherName || 'Chưa phân công', room: session.roomName || 'Chưa có phòng học',
    startsAt: session.startsAt, endsAt: session.endsAt,
  }));
  const openSession = (id: number) => navigate(sessionPath(id));

  const average = courses.length ? Math.round(courses.reduce((sum, course) => sum + percent(course.progress), 0) / courses.length) : 0;
  const completed = courses.filter((course) => percent(course.progress) === 100).length;
  const completedLessons = courses.reduce((sum, course) => sum + course.completedLessons, 0);
  const totalLessons = courses.reduce((sum, course) => sum + course.totalLessons, 0);
  const upcoming = sessions.filter((session) => Number.isFinite(Date.parse(session.endsAt)) && Date.parse(session.endsAt) > now).sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const nextSession = upcoming[0];
  const todaySessions = upcoming.filter((session) => day(session.startsAt) === day(now));
  const visibleCourses = courses.filter((course) => {
    const matches = normalize(`${course.title} ${course.code} ${course.teacher} ${course.subject}`).includes(normalize(query));
    return matches && (filter === 'all' || (filter === 'active' ? percent(course.progress) < 100 : percent(course.progress) === 100));
  });
  const sessionLive = nextSession && Date.parse(nextSession.startsAt) <= now;
  const hoursText = typeof trainingHours === 'number' && Number.isFinite(trainingHours) ? Math.max(0, trainingHours).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) : null;
  const pointsText = typeof experiencePoints === 'number' && Number.isFinite(experiencePoints) ? Math.max(0, experiencePoints).toLocaleString('vi-VN', { maximumFractionDigits: 0 }) : null;

  return (
    <div className="tl-learner">
      {/* SCR-TEA-03: Classroom Focus Mode Full-Screen Lock Overlay */}
      {focusLock?.isLocked && (
        <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white">
          <div className="max-w-lg w-full p-8 rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl space-y-4">
            <Badge variant="danger">🔒 CLASSROOM FOCUS MODE (SCR-TEA-03)</Badge>
            <h2 className="text-2xl font-extrabold">Giáo viên đang khóa màn hình phòng Lab</h2>
            <p className="text-sm text-slate-300 leading-relaxed">{focusLock.message}</p>
            <button
              type="button"
              onClick={() => setFocusLock(null)}
              className="mt-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold"
            >
              Đã hiểu (Tạm đóng lớp phủ demo)
            </button>
          </div>
        </div>
      )}

      {/* SCR-PAR-04: Parent Live Cheer Box & Confetti Celebration Banner */}
      {cheerCelebration && (
        <div className="mb-4 p-5 rounded-2xl bg-orange-50 dark:bg-orange-950/60 border-2 border-orange-400 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎊🎆🏆</span>
              <Badge variant="accent">Pháo hoa cổ vũ từ Bố Mẹ ({cheerCelebration.stickerName})</Badge>
            </div>
            <p className="text-sm font-bold text-orange-950 dark:text-orange-100">
              "{cheerCelebration.message}"
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCheerCelebration(null)}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shrink-0"
          >
            Con cảm ơn Bố Mẹ! ❤️
          </button>
        </div>
      )}

      {/* SCR-TEA-03: Live Screen Spotlight Broadcast Banner */}
      {spotlightBanner && (
        <div className="mb-4 p-5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <Badge variant="info">📡 Spotlight toàn phòng Lab</Badge>
              <strong className="text-blue-950 dark:text-blue-100">
                Giáo viên đang chiếu bài làm mẫu của bạn {spotlightBanner.studentName}
              </strong>
            </div>
            <p className="font-mono text-blue-900 dark:text-blue-200">{spotlightBanner.payload}</p>
          </div>
          <button
            type="button"
            onClick={() => setSpotlightBanner(null)}
            className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold shrink-0"
          >
            Đóng Spotlight
          </button>
        </div>
      )}

      <div className="tl-welcome">
        <div><p className="tl-eyebrow">DASHBOARD</p><h1>{section === 'courses' ? 'My Courses' : section === 'live' ? 'Today' : `Welcome, ${fullName || 'learner'}!`}</h1><p>{section === 'courses' ? 'Theo dõi tiến độ và tiếp tục hành trình khám phá STEAM.' : section === 'live' ? 'Theo dõi lịch học và chuẩn bị cho buổi học tiếp theo.' : 'Tiếp tục khám phá, sáng tạo và chinh phục những điều mới.'}</p></div>
        <span className="tl-today"><IconCalendar size={18} />{new Date(now).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
      </div>

      {isDemo && !loading && <div className="tl-demo" role="status"><strong>Dữ liệu minh họa</strong><span>Bạn đang xem nội dung mẫu TEKY. Lịch học và tiến độ này không phải hồ sơ học tập thực tế.</span></div>}
      {error && <div className="tl-error" role="alert"><span>{error}</span><button type="button" className="tl-text-button" onClick={retryLoad} disabled={loading}>Thử lại</button></div>}

      {loading ? <div className="tl-loading" role="status" aria-label="Đang tải không gian học tập"><div className="tl-skeleton tl-skeleton-wide" /><div className="tl-skeleton" /><div className="tl-skeleton tl-skeleton-wide" /><span>Đang tải lớp học và tiến độ của bạn…</span></div> : (
        <>
        <div className="tl-kpi-grid" aria-label="Chỉ số học tập">
          <div className="tl-kpi"><span className="tl-kpi-icon"><IconBookOpen size={22} /></span><div><p>Khóa học đang học</p><strong>{courses.length - completed}<span> khóa</span></strong><small>{completed} khóa đã hoàn thành</small></div></div>
          <div className="tl-kpi"><span className="tl-kpi-icon tl-kpi-success"><IconCheckCircle size={22} /></span><div><p>Tiến độ trung bình</p><strong>{average}<span>%</span></strong><small>Trên {courses.length} khóa học</small></div></div>
          <div className="tl-kpi"><span className="tl-kpi-icon"><IconClock size={22} /></span><div><p>Thời lượng học tập</p><strong>{hoursText ?? '—'}{hoursText !== null && <span> giờ</span>}</strong><small>{hoursText === null ? 'Chưa có dữ liệu' : 'Theo các buổi đã hoàn thành'}</small></div></div>
          <div className="tl-kpi"><span className="tl-kpi-icon tl-kpi-reward"><IconTrophy size={22} /></span><div><p>Điểm thưởng</p><strong>{pointsText ?? '—'}{pointsText !== null && <span> điểm</span>}</strong><small>{pointsText === null ? 'Chưa có dữ liệu' : 'Thành tích học tập của bạn'}</small></div></div>
        </div>
        <div className="tl-dashboard-grid">
          <div className="tl-main-column">
            {section !== 'courses' && <section className="tl-panel tl-session-panel" aria-labelledby="tl-session-heading">
              <div className="tl-section-heading"><h2 id="tl-session-heading">Today</h2><span className="tl-muted">{todaySessions.length ? `${todaySessions.length} buổi học` : 'Lịch học của bạn'}</span></div>
              {nextSession ? <div className="tl-next-session">
                <div className="tl-session-symbol"><IconVideo size={25} /></div>
                <div className="tl-session-copy"><span className={`tl-status ${sessionLive ? 'tl-status-live' : ''}`}>{sessionLive ? 'Đang diễn ra' : `Sắp học · ${date(nextSession.startsAt)}`}</span><h3>{nextSession.title}</h3><p>{nextSession.courseName}</p><div className="tl-session-meta"><span><IconClock size={15} />{time(nextSession.startsAt)} – {time(nextSession.endsAt)}</span><span>{nextSession.teacher || 'Chưa phân công giảng viên'}</span><span>{nextSession.room || 'Chưa cập nhật phòng học'}</span></div></div>
                <button type="button" className="tl-button tl-button-primary" disabled={isDemo} onClick={() => openSession(nextSession.id)}>{sessionLive ? 'Xem buổi học' : 'Chi tiết buổi học'}<IconArrowRight size={16} /></button>
              </div> : <div className="tl-empty-session"><IconCalendar size={26} /><div><h3>Chưa có buổi học sắp tới</h3><p>Lịch mới sẽ xuất hiện tại đây khi lớp học được sắp xếp.</p></div></div>}
            </section>}

            {section !== 'live' && <section className="tl-courses" aria-labelledby="tl-courses-heading">
              <div className="tl-section-heading"><div><h2 id="tl-courses-heading">My Courses</h2><p className="tl-muted">Mỗi bài học là một bước tiến mới.</p></div><div className="tl-view-switch" role="group" aria-label="Cách hiển thị khóa học"><button type="button" aria-label="Xem dạng lưới" aria-pressed={view === 'grid'} onClick={() => setView('grid')}><IconGrid size={18} /></button><button type="button" aria-label="Xem dạng danh sách" aria-pressed={view === 'list'} onClick={() => setView('list')}><IconMenu size={18} /></button></div></div>
              <div className="tl-course-toolbar">
                <div className="tl-course-filters" role="group" aria-label="Lọc trạng thái khóa học">{([['all', 'All'], ['active', 'In progress'], ['completed', 'Completed']] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}<span>{value === 'all' ? courses.length : value === 'active' ? courses.length - completed : completed}</span></button>)}</div>
                <label className="tl-course-search"><IconSearch size={18} /><span className="tl-sr-only">Tìm khóa học theo tên, mã lớp hoặc giảng viên</span><input ref={search} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search courses…" /></label>
              </div>
              <p className="tl-sr-only" role="status">{visibleCourses.length} khóa học phù hợp</p>
              {visibleCourses.length ? <div className={`tl-course-grid ${view === 'list' ? 'tl-course-list' : ''}`}>{visibleCourses.map((course) => <article className="tl-course-card" key={course.id}>
                <CourseCover course={course} />
                <div className="tl-course-body"><div className="tl-course-category"><span>{course.subject || 'STEAM'}</span><span>{percent(course.progress) === 100 ? 'Hoàn thành' : 'Đang học'}</span></div><h3>{course.title}</h3><p className="tl-course-teacher">{course.teacher || 'Chưa phân công giảng viên'}</p><p className="tl-course-code">{course.code}</p><div className="tl-progress-label"><span>{course.completedLessons}/{course.totalLessons} bài học</span><strong>{Math.round(percent(course.progress))}%</strong></div><progress max={100} value={percent(course.progress)} aria-label={`Tiến độ ${course.title}`} /><div className="tl-next-topic"><span>{percent(course.progress) === 100 ? 'COMPLETED' : 'NEXT UNIT'}</span><p>{course.nextTopic || 'Nội dung sẽ được cập nhật bởi giảng viên.'}</p></div><button type="button" className="tl-course-action" onClick={() => setSelectedCourse(course)}>{percent(course.progress) === 100 ? 'Review course' : 'Continue learning'}<IconArrowRight size={17} /></button></div>
              </article>)}</div> : <div className="tl-course-empty"><IconBookOpen size={35} /><h3>{courses.length ? 'Không tìm thấy khóa học phù hợp' : 'Bạn chưa có khóa học nào'}</h3><p>{courses.length ? 'Thử tên khóa học, mã lớp hoặc một trạng thái khác.' : 'Các khóa học sẽ xuất hiện khi bạn được ghi danh vào lớp.'}</p>{courses.length > 0 && <button type="button" className="tl-button" onClick={() => { setQuery(''); setFilter('all'); search.current?.focus(); }}>Xóa bộ lọc</button>}</div>}
            </section>}
          </div>

          <aside className="tl-side-column" aria-label="Tổng quan và lịch học">
            <section className="tl-panel tl-training-summary"><h2>Training Overview</h2><div className="tl-progress-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="50" className="tl-ring-track" /><circle cx="60" cy="60" r="50" className="tl-ring-value" strokeDasharray={`${average * Math.PI} ${100 * Math.PI}`} /></svg><div><strong>{average}%</strong><span>Tiến độ trung bình</span></div></div><dl className="tl-summary-stats"><div><dt><IconBookOpen size={18} />Đang học</dt><dd>{courses.length - completed}<span> khóa</span></dd></div><div><dt><IconCheckCircle size={18} />Đã hoàn thành</dt><dd>{completed}<span> khóa</span></dd></div><div><dt><IconCode size={18} />Bài học hoàn thành</dt><dd>{completedLessons}<span>/{totalLessons}</span></dd></div><div><dt><IconCalendar size={18} />Buổi học sắp tới</dt><dd>{upcoming.length}</dd></div></dl></section>
            <section className="tl-panel tl-coming-up"><div className="tl-section-heading"><h2>Don't Miss</h2><IconCalendar size={18} /></div>{upcoming.length ? <ul>{upcoming.slice(0, 3).map((session) => <li key={session.id}><span className="tl-agenda-date"><strong>{new Date(session.startsAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit' })}</strong><span>Tháng {new Date(session.startsAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', month: 'numeric' })}</span></span><div><h3>{session.title}</h3><p>{time(session.startsAt)} · {session.courseName}</p>{!isDemo && <button type="button" className="tl-text-button" onClick={() => openSession(session.id)}>Xem chi tiết<IconArrowRight size={14} /></button>}</div></li>)}</ul> : <p className="tl-muted">Bạn chưa có lịch học sắp tới. Hãy quay lại sau để xem cập nhật từ giảng viên.</p>}</section>
            <section className="tl-panel tl-rewards"><span className="tl-reward-symbol"><IconTrophy size={25} /></span><h2>Gamification &amp; Leaderboard</h2>{pointsText !== null ? <><p className="tl-reward-points">{pointsText}<span> điểm thưởng</span></p><p className="tl-muted">Mỗi bước tiến trong học tập đều đáng được ghi nhận.</p></> : <p className="tl-muted">Điểm thưởng sẽ được cập nhật khi dữ liệu thành tích được kết nối.</p>}<p className="tl-reward-note">Huy hiệu sẽ xuất hiện khi có thông tin thành tích từ hệ thống.</p></section>
            <div className="tl-learning-note"><IconBookOpen size={23} /><h3>Học theo nhịp của bạn</h3><p>Xem lại kiến thức đã học và chuẩn bị cho bài tiếp theo để tự tin hơn trong mỗi buổi học.</p>{onSelectNav && <button type="button" className="tl-text-button" onClick={() => onSelectNav('courses')}>Xem lộ trình học<IconArrowRight size={15} /></button>}</div>
          </aside>
        </div>
        </>
      )}

      <dialog ref={dialog} className="tl-course-dialog" aria-labelledby="tl-dialog-title" onClose={() => setSelectedCourse(null)} onClick={(event) => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setSelectedCourse(null); } }}>
        {selectedCourse && <><div className="tl-dialog-heading"><div><p className="tl-eyebrow">{selectedCourse.code}</p><h2 id="tl-dialog-title">{selectedCourse.title}</h2></div><button type="button" autoFocus aria-label="Đóng chi tiết khóa học" className="tl-icon-button" onClick={() => setSelectedCourse(null)}><IconX size={22} /></button></div><p className="tl-muted">{selectedCourse.teacher} · {selectedCourse.completedLessons}/{selectedCourse.totalLessons} bài học hoàn thành</p>{isDemo && <p className="tl-dialog-demo">Nội dung minh họa. Chức năng mở buổi học chỉ có với dữ liệu lớp học thực tế.</p>}<progress max={100} value={percent(selectedCourse.progress)} aria-label={`Tiến độ ${selectedCourse.title}`} />{selectedCourse.lessons?.length ? <ol className="tl-lesson-list">{selectedCourse.lessons.map((lesson, index) => <li key={`${lesson.id}-${index}`}><span className={lesson.completed ? 'tl-lesson-done' : 'tl-lesson-number'}>{lesson.completed ? <IconCheckCircle size={20} /> : index + 1}</span><div><h3>{lesson.title}</h3>{lesson.date && <p>{date(lesson.date)} · {time(lesson.date)}</p>}<span>{lesson.completed ? 'Đã hoàn thành' : 'Chưa hoàn thành'}</span></div>{!isDemo && <button type="button" className="tl-text-button" onClick={() => { setSelectedCourse(null); openSession(lesson.id); }}>Xem bài<IconArrowRight size={15} /></button>}</li>)}</ol> : <div className="tl-dialog-empty"><IconBookOpen size={28} /><p>{selectedCourse.nextTopic || 'Giảng viên chưa cập nhật nội dung bài học.'}</p><span>Danh sách buổi học sẽ xuất hiện khi lớp học có lịch.</span></div>}</>}
      </dialog>
    </div>
  );
};
