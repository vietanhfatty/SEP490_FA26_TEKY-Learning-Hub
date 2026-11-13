import React, { useState, useEffect, useCallback } from 'react';
import { IconTrophy, IconCheckCircle, IconClock } from '../common/Icons';
import { Badge } from '../common/Badge';
import {
  parentApi,
  emitRealtimeEvent,
  subscribeRealtimeEvents,
  type ParentDashboardDto,
  type ChildOverviewDto,
  type EContactBookItemDto,
  type CheerStickerDto,
  type StudentPortfolioDetailDto,
  type ClassLeaderboardDto,
} from '../../services/lmsApi';

const FALLBACK_CHILDREN: ChildOverviewDto[] = [
  {
    studentId: 2,
    studentCode: 'TEKY-STU-001',
    fullName: 'Lê Bảo An',
    totalXp: 280,
    stemPoints: 140,
    currentClassName: 'Lớp STEM Robot Sáng Tạo K10-A',
    currentLabRoom: 'Lab Robotics 202',
    todayAttendanceStatus: 'Present',
    todayMarkedAt: '2026-11-13T07:00:00Z',
    isInActiveSession: true,
  },
  {
    studentId: 3,
    studentCode: 'TEKY-STU-002',
    fullName: 'Trần Thị Mai',
    totalXp: 210,
    stemPoints: 105,
    currentClassName: 'Lớp STEM Robot Sáng Tạo K10-A',
    currentLabRoom: 'Lab Robotics 202',
    todayAttendanceStatus: 'Present',
    todayMarkedAt: '2026-11-13T07:05:00Z',
    isInActiveSession: true,
  },
];

const STICKER_ICONS: Record<string, string> = {
  PROUD: '🏅',
  SUPER_CODER: '🚀',
  KEEP_FIGHTING: '💪',
  CREATIVE: '💡',
};

export const ParentDashboard: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [livePushAlert, setLivePushAlert] = useState<string | null>(null);

  // SCR-PAR-01 Parent Dashboard & Multi-Child Switcher
  const [dashboard, setDashboard] = useState<ParentDashboardDto>({
    parentId: 5,
    parentName: 'Nguyễn Thị Lan',
    children: FALLBACK_CHILDREN,
  });
  const [selectedStudentId, setSelectedStudentId] = useState<number>(2);

  // SCR-PAR-02 E-Contact Book, 5-Star Feedback & 60s AI Audio Digest
  const [contactBook, setContactBook] = useState<EContactBookItemDto[]>([]);
  const [digestText, setDigestText] = useState<string>('');
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [starRating, setStarRating] = useState<number>(5);
  const [feedbackNote, setFeedbackNote] = useState<string>(
    'Gia đình rất hài lòng với phương pháp giảng dạy trực quan và sự tận tâm của thầy tại phòng Lab!'
  );
  const [submittingFeedback, setSubmittingFeedback] = useState<boolean>(false);

  // SCR-PAR-03 Child Digital STEM Portfolio & QR Verification
  const [portfolios, setPortfolios] = useState<StudentPortfolioDetailDto[]>([]);
  const [verifiedPortfolio, setVerifiedPortfolio] = useState<StudentPortfolioDetailDto | null>(null);

  // SCR-PAR-04 Parent Live Cheer Box & Confetti + CRON-03 Weekly Leaderboard
  const [stickers, setStickers] = useState<CheerStickerDto[]>([
    { stickerId: 1, code: 'PROUD', name: 'Bố mẹ tự hào về con', imageUrl: '/assets/stickers/proud.svg' },
    { stickerId: 2, code: 'SUPER_CODER', name: 'Siêu lập trình viên', imageUrl: '/assets/stickers/supercoder.svg' },
    { stickerId: 3, code: 'KEEP_FIGHTING', name: 'Cố lên con yêu', imageUrl: '/assets/stickers/fighting.svg' },
    { stickerId: 4, code: 'CREATIVE', name: 'Nhà sáng chế tương lai', imageUrl: '/assets/stickers/creative.svg' },
  ]);
  const [selectedStickerId, setSelectedStickerId] = useState<number>(1);
  const [cheerMessage, setCheerMessage] = useState<string>(
    'Bố mẹ vừa xem điểm thực hành Robot của con, con làm rất tuyệt vời!'
  );
  const [sendingCheer, setSendingCheer] = useState<boolean>(false);
  const [leaderboard, setLeaderboard] = useState<ClassLeaderboardDto | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadChildDetails = useCallback(async (studentId: number) => {
    try {
      const [cb, pf, lb] = await Promise.all([
        parentApi.getContactBook(studentId, 5),
        parentApi.getPortfolios(studentId),
        parentApi.getLeaderboard(3),
      ]);
      setContactBook(cb);
      setPortfolios(pf);
      setLeaderboard(lb);

      const latestSessionId = cb[0]?.sessionId ?? 5;
      const digest = await parentApi.getAudioDigest(latestSessionId, studentId);
      setDigestText(digest.summaryText);
    } catch {
      // Keep fallback data if offline
    }
  }, []);

  const loadParentHub = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [dash, stk] = await Promise.all([parentApi.getDashboard(5), parentApi.getStickers()]);
      setDashboard(dash);
      if (stk.length > 0) setStickers(stk);

      const firstId = dash.children[0]?.studentId ?? 2;
      setSelectedStudentId(firstId);
      await loadChildDetails(firstId);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? `${err.message} — Đang hiển thị dữ liệu mẫu.`
          : 'Không thể kết nối Backend .NET.'
      );
    } finally {
      setLoading(false);
    }
  }, [loadChildDetails]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadParentHub();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadParentHub]);

  // Subscribe to realtime workstation check-in events (SCR-PAR-01 Real-Time Attendance Monitoring)
  useEffect(() => {
    return subscribeRealtimeEvents((ev) => {
      if (ev.type === 'WORKSTATION_CHECKIN') {
        const matched = dashboard.children.find((c) => c.studentId === ev.studentId);
        const childName = matched?.fullName ?? `Học sinh #${ev.studentId}`;
        setLivePushAlert(
          `🔔 Push Notification tức thời: ${childName} vừa đăng nhập vào máy trạm phòng Lab (IP ${ev.workstationIp}) lúc ${new Date(
            ev.timestamp
          ).toLocaleTimeString('vi-VN')}!`
        );
        void loadParentHub();
      }
    });
  }, [dashboard.children, loadParentHub]);

  const handleSelectChild = async (studentId: number) => {
    setSelectedStudentId(studentId);
    await loadChildDetails(studentId);
  };

  const handlePlayAudioDigest = () => {
    if (!digestText) return;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (isPlayingAudio) {
        window.speechSynthesis.cancel();
        setIsPlayingAudio(false);
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(digestText);
      utterance.lang = 'vi-VN';
      utterance.rate = 1.02;
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      setIsPlayingAudio(true);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlayingAudio((prev) => !prev);
      showToast('Trình duyệt đang phát bản tin âm thanh AI 60 giây!');
    }
  };

  const handleSubmitFeedback = async () => {
    const latestSessionId = contactBook[0]?.sessionId ?? 5;
    setSubmittingFeedback(true);
    try {
      const res = await parentApi.submitFeedback(
        {
          sessionId: latestSessionId,
          studentId: selectedStudentId,
          starRating,
          feedbackNote,
        },
        5
      );
      showToast(res.message);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Lỗi gửi đánh giá.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleSendCheerConfetti = async () => {
    const sticker = stickers.find((s) => s.stickerId === selectedStickerId) ?? stickers[0];
    setSendingCheer(true);
    try {
      const res = await parentApi.sendCheer({
        parentId: 5,
        studentId: selectedStudentId,
        stickerId: selectedStickerId,
        sessionId: contactBook[0]?.sessionId ?? 6,
        message: cheerMessage,
      });
      emitRealtimeEvent({
        type: 'CHEER_CONFETTI',
        studentId: selectedStudentId,
        stickerCode: sticker?.code ?? 'PROUD',
        stickerName: sticker?.name ?? 'Bố mẹ tự hào về con',
        message: cheerMessage,
        timestamp: new Date().toISOString(),
      });
      showToast(res.message);
    } catch (err) {
      emitRealtimeEvent({
        type: 'CHEER_CONFETTI',
        studentId: selectedStudentId,
        stickerCode: sticker?.code ?? 'PROUD',
        stickerName: sticker?.name ?? 'Bố mẹ tự hào về con',
        message: cheerMessage,
        timestamp: new Date().toISOString(),
      });
      showToast(err instanceof Error ? err.message : 'Đã bắn pháo hoa Confetti tới màn hình của con!');
    } finally {
      setSendingCheer(false);
    }
  };

  const handleVerifyQrPortfolio = async (qrToken: string) => {
    try {
      const verified = await parentApi.verifyPortfolioByQr(qrToken);
      setVerifiedPortfolio(verified);
      const refreshed = await parentApi.getPortfolios(selectedStudentId);
      setPortfolios(refreshed);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể xác thực mã QR.');
    }
  };

  const currentChild =
    dashboard.children.find((c) => c.studentId === selectedStudentId) ??
    dashboard.children[0] ??
    FALLBACK_CHILDREN[0];

  return (
    <div className="space-y-6 py-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          role="status"
          className="fixed top-20 right-6 z-50 max-w-md px-4 py-3 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-xl border border-slate-700 flex items-center gap-2.5"
        >
          <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Real-Time Attendance Push Notification Banner (SCR-PAR-01) */}
      {livePushAlert && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3 text-xs text-emerald-900 dark:text-emerald-200 shadow-sm">
          <div className="flex items-center gap-2 font-semibold">
            <IconCheckCircle size={18} className="text-emerald-600 shrink-0" />
            <span>{livePushAlert}</span>
          </div>
          <button
            onClick={() => setLivePushAlert(null)}
            className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-bold"
          >
            Đã xem
          </button>
        </div>
      )}

      {/* Error Recovery Banner */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-between gap-3 text-xs text-rose-800 dark:text-rose-200">
          <span>{errorMsg}</span>
          <button
            onClick={() => void loadParentHub()}
            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* ==================== SCR-PAR-01: HEADER & MULTI-CHILD SWITCHER ==================== */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="accent">Parent Guardian Hub & Engagement</Badge>
            <Badge variant="info">SCR-PAR-01..04</Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1.5">
            Đồng hành cùng hành trình STEAM của con
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Phụ huynh: <strong className="text-slate-900 dark:text-white">{dashboard.parentName}</strong> • Chuyển đổi
            nhanh hồ sơ các con không cần đăng xuất
          </p>
        </div>

        {/* Multi-Child Switcher (Touch targets >= 44px) */}
        <div
          role="tablist"
          aria-label="Chọn hồ sơ con"
          className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-700"
        >
          {dashboard.children.map((child) => {
            const active = child.studentId === currentChild.studentId;
            return (
              <button
                key={child.studentId}
                role="tab"
                aria-selected={active}
                onClick={() => void handleSelectChild(child.studentId)}
                className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-600'
                }`}
              >
                <span>{child.fullName}</span>
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.5 rounded tabular-nums ${
                    active ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {child.studentCode}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Real-Time Status Cards (SCR-PAR-01) */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Lớp học & Phòng Lab hiện tại</p>
            <h2 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
              {currentChild.currentClassName}
            </h2>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-1.5">
              📍 {currentChild.currentLabRoom}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Điểm danh thời gian thực hôm nay</p>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge
                variant={
                  currentChild.todayAttendanceStatus === 'Present'
                    ? 'success'
                    : currentChild.todayAttendanceStatus === 'Late'
                    ? 'warning'
                    : 'info'
                }
              >
                {currentChild.todayAttendanceStatus === 'Present'
                  ? '✓ Đã có mặt tại Lab'
                  : currentChild.todayAttendanceStatus === 'Late'
                  ? 'Đi muộn'
                  : 'Đã điểm danh buổi gần nhất'}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {currentChild.isInActiveSession
                ? '🟢 Ca học đang diễn ra trực tiếp'
                : 'Đồng bộ từ máy trạm & giáo viên'}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Điểm kinh nghiệm tích lũy (Total XP)</p>
            <p className="text-2xl font-extrabold text-orange-600 mt-1 font-mono tabular-nums">
              {currentChild.totalXp} XP
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Tăng tự động sau mỗi bài thực hành</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Điểm kỹ năng STEM (STEM Points)</p>
            <p className="text-2xl font-extrabold text-blue-600 mt-1 font-mono tabular-nums">
              {currentChild.stemPoints} điểm
            </p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">Chuẩn đánh giá Hybrid 60/40</p>
          </div>
        </div>
      )}

      {/* ==================== SCR-PAR-02: 60-SECOND AI AUDIO DIGEST & LIVE CHEER BOX ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 60-Second AI Audio Digest Podcast Player */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Badge variant="info">🎧 Parent 60-Second AI Audio Digest</Badge>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
                Bản tin âm thanh AI 60 giây tóm tắt buổi học của {currentChild.fullName}
              </h2>
            </div>
            <button
              type="button"
              onClick={handlePlayAudioDigest}
              className={`min-h-[44px] px-4 py-2 rounded-xl font-bold text-xs text-white shadow-sm flex items-center gap-2 ${
                isPlayingAudio ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <span>{isPlayingAudio ? '⏹ Dừng phát' : '▶ Nghe Podcast 60s'}</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-950 dark:text-blue-100 leading-relaxed">
            {digestText ||
              `Chào phụ huynh của ${currentChild.fullName}! Hôm nay tại ${currentChild.currentClassName}, con đã hoàn thành thử thách lập trình sa bàn thực hành với điểm số xuất sắc.`}
          </div>

          {/* Waveform Bars Visualization */}
          <div className="flex items-center gap-1 h-6 px-2">
            {Array.from({ length: 28 }).map((_, idx) => (
              <div
                key={idx}
                className={`flex-1 rounded-full transition-all ${
                  isPlayingAudio ? 'bg-blue-600 animate-pulse' : 'bg-slate-200 dark:bg-slate-700'
                }`}
                style={{ height: `${25 + ((idx * 17) % 70)}%` }}
              />
            ))}
          </div>
        </div>

        {/* SCR-PAR-04: Parent Live Cheer Box & Confetti */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Badge variant="accent">🎉 Parent Live Cheer Box & Confetti</Badge>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
                Gửi nhãn dán cổ vũ & bắn pháo hoa Confetti tới máy trạm của con
              </h2>
            </div>
            <span className="font-mono text-[10px] text-slate-500">SignalR CheerHub</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {stickers.map((stk) => {
              const active = stk.stickerId === selectedStickerId;
              return (
                <button
                  key={stk.stickerId}
                  type="button"
                  onClick={() => setSelectedStickerId(stk.stickerId)}
                  className={`min-h-[44px] p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
                    active
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-800 dark:text-orange-200 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="text-lg">{STICKER_ICONS[stk.code] ?? '🌟'}</span>
                  <span className="text-[11px] text-center leading-tight">{stk.name}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={cheerMessage}
              onChange={(e) => setCheerMessage(e.target.value)}
              placeholder="Nhập lời nhắn động viên gửi tới màn hình của con..."
              className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-xs"
            />
            <button
              type="button"
              onClick={() => void handleSendCheerConfetti()}
              disabled={sendingCheer}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] disabled:opacity-50 text-white font-bold text-xs shadow-sm shrink-0"
            >
              {sendingCheer ? 'Đang gửi...' : '🎊 Bắn Pháo Hoa Cổ Vũ Con'}
            </button>
          </div>
        </div>
      </div>

      {/* ==================== SCR-PAR-02: E-CONTACT BOOK (60/40 HYBRID) & 5-STAR FEEDBACK ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Sổ liên lạc điện tử & Tiến độ thực hành Hybrid 60/40
              </h2>
              <p className="text-xs text-slate-500">
                 Chi tiết điểm Thuật toán AST (60%), Lắp ráp phần cứng (40%) và ghi chú nhận xét của giáo viên
              </p>
            </div>
            <Badge variant="info">{contactBook.length} buổi học</Badge>
          </div>

          {contactBook.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-700/40 text-xs text-slate-500 text-center">
              Chưa có nhật ký sổ liên lạc cho học sinh này.
            </div>
          ) : (
            <div className="space-y-3">
              {contactBook.map((item) => (
                <div
                  key={item.sessionId}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{item.sessionTitle}</span>
                      <Badge variant={item.attendanceStatus === 'Present' ? 'success' : 'warning'}>
                        {item.attendanceStatus === 'Present' ? 'Có mặt' : item.attendanceStatus}
                      </Badge>
                      {item.remarkSource === 'Voice' && (
                        <Badge variant="accent">🎙️ Nhận xét Giọng nói GV</Badge>
                      )}
                    </div>
                    <span className="font-mono text-slate-500 tabular-nums">{item.date}</span>
                  </div>

                  {item.finalScore != null && (
                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-center font-mono tabular-nums">
                      <div>
                        <p className="text-[10px] text-slate-500">Thuật toán AST (60%)</p>
                        <p className="text-sm font-bold text-blue-600">{item.autoAstScore?.toFixed(2)}/10</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500">Phần cứng Rubric (40%)</p>
                        <p className="text-sm font-bold text-orange-600">{item.hardwareScore?.toFixed(2)}/10</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500">Tổng kết Hybrid</p>
                        <p className="text-sm font-extrabold text-emerald-600">{item.finalScore.toFixed(2)}/10</p>
                      </div>
                    </div>
                  )}

                  {item.remarkText && (
                    <p className="text-slate-700 dark:text-slate-200 italic">
                      Nhận xét của thầy cô: "{item.remarkText}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5-Star Parent Feedback Form */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <Badge variant="success">Đánh giá chất lượng buổi học</Badge>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Phụ huynh chấm 5 sao & gửi phản hồi cho Giáo viên
            </h3>
            <p className="text-xs text-slate-500">
              Ý kiến của phụ huynh được lưu trực tiếp vào cơ sở dữ liệu để bộ phận Học thuật nâng cao chất lượng:
            </p>

            <div className="flex gap-2 pt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setStarRating(star)}
                  className={`min-h-[44px] flex-1 rounded-xl border font-bold text-xs transition-all ${
                    starRating >= star
                      ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-400 text-amber-700 dark:text-amber-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-400'
                  }`}
                >
                  ★ {star}
                </button>
              ))}
            </div>

            <textarea
              rows={4}
              value={feedbackNote}
              onChange={(e) => setFeedbackNote(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-xs"
            />
          </div>

          <button
            type="button"
            onClick={() => void handleSubmitFeedback()}
            disabled={submittingFeedback}
            className="min-h-[44px] w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm"
          >
            {submittingFeedback ? 'Đang gửi phản hồi...' : 'Gửi đánh giá 5 sao về buổi học'}
          </button>
        </div>
      </div>

      {/* ==================== SCR-PAR-03 PORTFOLIO & QR + CRON-03 WEEKLY LEADERBOARD ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Digital STEM Portfolio & Public QR Code Verification */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Badge variant="info">SCR-PAR-03 • Digital STEM Portfolio & QR</Badge>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                Hồ sơ dự án Robot 2D & Mã QR xác thực công khai
              </h2>
            </div>
          </div>

          {portfolios.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-700/40 text-xs text-slate-500 text-center">
              Khi con đạt từ 8.0 điểm thực hành trở lên, hệ thống sẽ tự động cấp Chứng nhận Portfolio kèm mã QR tại đây.
            </div>
          ) : (
            <div className="space-y-3">
              {portfolios.map((pf) => (
                <div
                  key={pf.itemId}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{pf.title}</span>
                      <Badge variant="success">Điểm: {pf.finalScore}/10</Badge>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">{pf.summary}</p>
                    <p className="font-mono text-[11px] text-slate-500 tabular-nums">
                      Mã QR Token: {pf.qrToken} • Lượt xem công khai: <strong>{pf.viewCount}</strong>
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleVerifyQrPortfolio(pf.qrToken)}
                      className="mt-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
                    >
                      🔍 Quét / Xác thực mã QR công khai (/api/portfolio/verify)
                    </button>
                  </div>

                  {/* Stylized SVG QR Badge */}
                  <div className="w-24 h-24 rounded-xl bg-white p-2 border border-slate-200 shrink-0 flex flex-col items-center justify-center text-center">
                    <div className="grid grid-cols-5 gap-0.5 w-14 h-14">
                      {Array.from({ length: 25 }).map((_, i) => (
                        <div
                          key={i}
                          className={
                            i % 2 === 0 || i % 7 === 0 ? 'bg-slate-900 rounded-[1px]' : 'bg-slate-100'
                          }
                        />
                      ))}
                    </div>
                    <span className="font-mono text-[9px] text-slate-600 mt-1">TEKY VERIFIED</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {verifiedPortfolio && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <strong className="text-emerald-900 dark:text-emerald-200">
                  ✓ Xác thực QR thành công từ cổng PublicPortfolioController
                </strong>
                <button
                  onClick={() => setVerifiedPortfolio(null)}
                  className="text-emerald-700 font-bold"
                >
                  Đóng
                </button>
              </div>
              <p className="text-emerald-800 dark:text-emerald-200">
                Chứng nhận: <strong>{verifiedPortfolio.title}</strong> • Điểm thực hành:{' '}
                <strong className="tabular-nums">{verifiedPortfolio.finalScore}/10</strong> • Tổng lượt xem xác thực:{' '}
                <strong className="tabular-nums">{verifiedPortfolio.viewCount}</strong>
              </p>
            </div>
          )}
        </div>

        {/* CRON-03: Weekly Class Leaderboard */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Badge variant="accent">CRON-03 • Quartz.NET Weekly Leaderboard</Badge>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
                <IconTrophy size={18} className="text-orange-500" /> Bảng xếp hạng Top 10 của lớp tuần này
              </h2>
            </div>
            {leaderboard && (
              <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                {leaderboard.weekStartDate} → {leaderboard.weekEndDate}
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Hạng</th>
                  <th className="py-2.5 px-3">Học sinh</th>
                  <th className="py-2.5 px-3">Thời gian chạy sa bàn</th>
                  <th className="py-2.5 px-3">Số khối lệnh</th>
                  <th className="py-2.5 px-3 text-right">XP Tuần</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {(leaderboard?.topRankings ?? []).map((rk) => (
                  <tr
                    key={rk.studentId}
                    className={`h-10 ${
                      rk.studentId === currentChild.studentId
                        ? 'bg-orange-50/70 dark:bg-orange-950/30 font-semibold'
                        : ''
                    }`}
                  >
                    <td className="py-2 px-3 font-mono font-bold tabular-nums">
                      {rk.rank === 1 ? '🥇 #1' : rk.rank === 2 ? '🥈 #2' : rk.rank === 3 ? '🥉 #3' : `#${rk.rank}`}
                    </td>
                    <td className="py-2 px-3 text-slate-900 dark:text-white">{rk.studentName}</td>
                    <td className="py-2 px-3 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      <span className="inline-flex items-center gap-1">
                        <IconClock size={12} /> {(rk.bestTimeMs / 1000).toFixed(2)}s
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono tabular-nums">{rk.bestBlockCount} blocks</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-orange-600 tabular-nums">
                      +{rk.xpEarned} XP
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
