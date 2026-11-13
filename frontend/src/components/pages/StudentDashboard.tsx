import React, { useState, useEffect } from 'react';
import { IconClock, IconTrophy, IconCheckCircle } from '../common/Icons';
import { Badge } from '../common/Badge';
import { subscribeRealtimeEvents } from '../../services/lmsApi';

// Upload icon
const IconUploadSimple: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" x2="12" y1="3" y2="15"/>
  </svg>
);

export const StudentDashboard: React.FC = () => {
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

  const enrolledCourses = [
    {
      title: 'Lập trình Scratch Game 3.0',
      code: 'SCRATCH-01',
      progress: 75,
      completedLessons: 9,
      totalLessons: 12,
      nextTopic: 'Buổi 10: Xử lý va chạm & Nhảy nhân vật nâng cao',
      badge: 'Level 2 Intermediate',
    },
    {
      title: 'Python Ứng dụng & Mini Games',
      code: 'PY-GAME-02',
      progress: 30,
      completedLessons: 4,
      totalLessons: 14,
      nextTopic: 'Buổi 5: Cấu trúc rẽ nhánh If-Else & Vòng lặp For',
      badge: 'Level 1 Beginner',
    },
  ];

  const recentBadges = [
    { title: 'Chăm Chỉ 100%', desc: 'Điểm danh đầy đủ 8 buổi liên tiếp', icon: '🏆', date: '02/11/2026' },
    { title: 'Coder Tốc Độ', desc: 'Nộp bài tập Scratch sớm nhất lớp', icon: '⚡', date: '28/10/2026' },
    { title: 'Sáng Tạo Vô Cực', desc: 'Dự án game có cốt truyện độc đáo', icon: '🎨', date: '20/10/2026' },
  ];

  return (
    <div className="space-y-8 py-6 relative">
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
        <div className="p-5 rounded-2xl bg-orange-50 dark:bg-orange-950/60 border-2 border-orange-400 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
        <div className="p-5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

      {/* Top Banner & Next Class Countdown (Bento Top) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Next Class Hero Card (Solid High-Contrast Brand Blue — No AI-Slop Gradient) */}
        <div className="lg:col-span-2 p-6 sm:p-8 rounded-2xl bg-blue-600 dark:bg-blue-700 text-white shadow-lg relative overflow-hidden flex flex-col justify-between">
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
              onClick={() => alert('Đang mở phòng học Zoom/Meet của lớp học TEKY...')}
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
              {recentBadges.map((b, idx) => (
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
