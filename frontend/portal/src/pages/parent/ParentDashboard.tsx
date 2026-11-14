import React, { useState, useEffect, useCallback } from 'react';
import {
  IconTrophy,
  IconCheckCircle,
  IconClock,
  Badge,
  parentApi,
  emitRealtimeEvent,
  subscribeRealtimeEvents,
  type ParentDashboardDto,
  type ChildOverviewDto,
  type EContactBookItemDto,
  type CheerStickerDto,
  type StudentPortfolioDetailDto,
  type ClassLeaderboardDto,
} from '@teky/shared';

type ParentSectionTab = 'all' | 'par01_overview' | 'par02_contact' | 'par03_portfolio' | 'par04_cheer';

const FALLBACK_CHILDREN: ChildOverviewDto[] = [
  {
    studentId: 2,
    studentCode: 'TEKY-STU-001',
    fullName: 'Lê Bảo An',
    totalXp: 280,
    stemPoints: 140,
    currentClassName: 'Lập trình & Chế tạo Robot Thông minh K10-A',
    currentLabRoom: 'Phòng Thực hành Robotics 202',
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
    currentClassName: 'Lập trình & Chế tạo Robot Thông minh K10-A',
    currentLabRoom: 'Phòng Thực hành Robotics 202',
    todayAttendanceStatus: 'Present',
    todayMarkedAt: '2026-11-13T07:05:00Z',
    isInActiveSession: true,
  },
];

const STICKER_BADGE_CODES: Record<string, string> = {
  PROUD: 'HUY HIỆU TỰ HÀO',
  SUPER_CODER: 'SIÊU LẬP TRÌNH',
  KEEP_FIGHTING: 'NỖ LỰC BỀN BỈ',
  CREATIVE: 'SÁNG TẠO TRẺ',
};

const SESSION_ACHIEVED_SKILLS = [
  'Vận dụng cấu trúc lặp tối ưu hóa khối lệnh điều hướng Blockly',
  'Đọc và xử lý tín hiệu cảm biến siêu âm phát hiện vật cản chính xác',
  'Lắp ráp cơ cấu truyền động bánh răng cân bằng và đi dây an toàn',
];

const ROBOT_PATH_STEPS: { x: number; y: number; label: string }[] = [
  { x: 1, y: 1, label: 'Điểm xuất phát (1, 1): Khởi tạo cảm biến siêu âm' },
  { x: 2, y: 1, label: 'Di chuyển tiến 1 ô theo trục X (2, 1)' },
  { x: 4, y: 2, label: 'Trạm kiểm soát 01 (4, 2): Xác nhận khoảng cách an toàn' },
  { x: 6, y: 4, label: 'Rẽ nhánh vượt chướng ngại vật (6, 4)' },
  { x: 7, y: 6, label: 'Trạm kiểm soát 02 (7, 6): Giải mã câu hỏi tư duy thuật toán' },
  { x: 10, y: 10, label: 'Trạm Đích (10, 10): Hoàn thành xuất sắc nhiệm vụ sa bàn!' },
];

interface ParentDashboardProps {
  activeNavId?: string;
}

const mapNavIdToSection = (navId?: string): ParentSectionTab => {
  switch (navId) {
    case 'attendance':
      return 'par01_overview';
    case 'feedback':
      return 'par02_contact';
    case 'competency':
      return 'par03_portfolio';
    case 'tuition':
      return 'par04_cheer';
    default:
      return 'all';
  }
};

export const ParentDashboard: React.FC<ParentDashboardProps> = ({ activeNavId = 'overview' }) => {
  const [activeSection, setActiveSection] = useState<ParentSectionTab>(() => mapNavIdToSection(activeNavId));
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setActiveSection(mapNavIdToSection(activeNavId));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeNavId]);

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [livePushAlert, setLivePushAlert] = useState<string | null>(null);

  const [dashboard, setDashboard] = useState<ParentDashboardDto>({
    parentId: 5,
    parentName: 'Bà Nguyễn Thị Lan',
    children: FALLBACK_CHILDREN,
  });
  const [selectedStudentId, setSelectedStudentId] = useState<number>(2);
  const [attendancePushLogs, setAttendancePushLogs] = useState<
    { time: string; channel: string; title: string; detail: string }[]
  >([
    {
      time: '13:55:10',
      channel: 'WebSocket SignalR + Zalo ZNS',
      title: 'Xác nhận đăng nhập máy trạm phòng Lab',
      detail: 'Học viên vừa đăng nhập máy trạm LAB-WS-01 (IP: 192.168.1.105) tại Phòng Thực hành Robotics 202.',
    },
    {
      time: '14:00:00',
      channel: 'Hệ thống Quản lý Học vụ',
      title: 'Giảng viên hoàn tất điểm danh đầu giờ',
      detail: 'Trạng thái chuyên cần: Có mặt đúng giờ • Giảng viên phụ trách: ThS. Nguyễn Văn Nam.',
    },
  ]);

  const [contactBook, setContactBook] = useState<EContactBookItemDto[]>([]);
  const [playingTeacherVoiceSessionId, setPlayingTeacherVoiceSessionId] = useState<number | null>(null);
  const [digestText, setDigestText] = useState<string>('');
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioRate, setAudioRate] = useState<number>(1.0);
  const [starRating, setStarRating] = useState<number>(5);
  const [selectedFeedbackSessionId, setSelectedFeedbackSessionId] = useState<number>(6);
  const [feedbackNote, setFeedbackNote] = useState<string>(
    'Gia đình đánh giá rất cao phương pháp giảng dạy thực hành trực quan và sự hướng dẫn tận tình của giảng viên đối với cháu tại phòng Lab.'
  );
  const [submittingFeedback, setSubmittingFeedback] = useState<boolean>(false);

  const [portfolios, setPortfolios] = useState<StudentPortfolioDetailDto[]>([]);
  const [verifiedPortfolio, setVerifiedPortfolio] = useState<StudentPortfolioDetailDto | null>(null);
  const [simStepIndex, setSimStepIndex] = useState<number>(5);
  const [isSimulatingRobot, setIsSimulatingRobot] = useState<boolean>(false);

  const [stickers, setStickers] = useState<CheerStickerDto[]>([
    { stickerId: 1, code: 'PROUD', name: 'Bố mẹ tự hào về con', imageUrl: '/assets/stickers/proud.svg' },
    { stickerId: 2, code: 'SUPER_CODER', name: 'Siêu lập trình viên', imageUrl: '/assets/stickers/supercoder.svg' },
    { stickerId: 3, code: 'KEEP_FIGHTING', name: 'Cố lên con yêu', imageUrl: '/assets/stickers/fighting.svg' },
    { stickerId: 4, code: 'CREATIVE', name: 'Nhà sáng chế tương lai', imageUrl: '/assets/stickers/creative.svg' },
  ]);
  const [selectedStickerId, setSelectedStickerId] = useState<number>(1);
  const [cheerMessage, setCheerMessage] = useState<string>(
    'Gia đình vừa xem kết quả thực hành Robot của con, chúc mừng con đã hoàn thành xuất sắc bài học hôm nay!'
  );
  const [sendingCheer, setSendingCheer] = useState<boolean>(false);
  const [sentCheerHistory, setSentCheerHistory] = useState<
    { time: string; stickerName: string; message: string }[]
  >([]);
  const [leaderboard, setLeaderboard] = useState<ClassLeaderboardDto | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
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
      setSelectedFeedbackSessionId(latestSessionId);
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
          ? `Không thể kết nối trực tiếp máy chủ dữ liệu (${err.message}). Hệ thống đang hiển thị dữ liệu tiêu chuẩn.`
          : 'Không thể kết nối máy chủ Backend .NET.'
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

  useEffect(() => {
    return subscribeRealtimeEvents((ev) => {
      if (ev.type === 'WORKSTATION_CHECKIN') {
        const matched = dashboard.children.find((c) => c.studentId === ev.studentId);
        const childName = matched?.fullName ?? `Học viên #${ev.studentId}`;
        const timeStr = new Date(ev.timestamp).toLocaleTimeString('vi-VN');
        setLivePushAlert(
          `Thông báo Điểm danh Thời gian thực: Học viên ${childName} vừa đăng nhập vào máy trạm phòng Lab (Địa chỉ IP: ${ev.workstationIp}) vào lúc ${timeStr}.`
        );
        setAttendancePushLogs((prev) => [
          {
            time: timeStr,
            channel: 'Push Notification • SignalR Live',
            title: `Đồng bộ đăng nhập máy trạm: ${childName}`,
            detail: `Ghi nhận đăng nhập thành công tại địa chỉ IP ${ev.workstationIp} (Ca học #${ev.sessionId}).`,
          },
          ...prev,
        ]);
        void loadParentHub();
      }
    });
  }, [dashboard.children, loadParentHub]);

  useEffect(() => {
    if (!isSimulatingRobot) return;
    const timer = window.setInterval(() => {
      setSimStepIndex((prev) => {
        if (prev >= ROBOT_PATH_STEPS.length - 1) {
          setIsSimulatingRobot(false);
          return ROBOT_PATH_STEPS.length - 1;
        }
        return prev + 1;
      });
    }, 650);
    return () => window.clearInterval(timer);
  }, [isSimulatingRobot]);

  const handleStartRobotSimulation = () => {
    setSimStepIndex(0);
    setIsSimulatingRobot(true);
  };

  const handleSelectChild = async (studentId: number) => {
    setSelectedStudentId(studentId);
    setVerifiedPortfolio(null);
    await loadChildDetails(studentId);
    const selectedName =
      dashboard.children.find((c) => c.studentId === studentId)?.fullName ?? 'Học viên';
    showToast(`Đã chuyển sang hồ sơ học tập của học viên: ${selectedName}.`);
  };

  const handlePlayAudioDigest = () => {
    const content =
      digestText ||
      `Bản tin tổng hợp học thuật 60 giây: Chào phụ huynh của học viên ${currentChild.fullName}. Trong buổi học hôm nay tại ${currentChild.currentClassName}, học viên có mặt đúng giờ, tích cực tham gia lắp ráp mô hình và hoàn thành thử thách lập trình thuật toán với điểm số xuất sắc.`;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (isPlayingAudio) {
        window.speechSynthesis.cancel();
        setIsPlayingAudio(false);
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(content);
      utterance.lang = 'vi-VN';
      utterance.rate = audioRate;
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      setIsPlayingAudio(true);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlayingAudio((prev) => !prev);
      showToast('Đang phát bản tin âm thanh AI tổng hợp 60 giây.');
    }
  };

  const handlePlayTeacherVoiceMemo = (sessionId: number, remark: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (playingTeacherVoiceSessionId === sessionId) {
        window.speechSynthesis.cancel();
        setPlayingTeacherVoiceSessionId(null);
        return;
      }
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(remark);
      utter.lang = 'vi-VN';
      utter.onend = () => setPlayingTeacherVoiceSessionId(null);
      utter.onerror = () => setPlayingTeacherVoiceSessionId(null);
      setPlayingTeacherVoiceSessionId(sessionId);
      window.speechSynthesis.speak(utter);
    } else {
      showToast(`Đang phát file ghi âm nhận xét của giảng viên (Ca học #${sessionId}).`);
    }
  };

  const handleSubmitFeedback = async () => {
    const targetSessionId = selectedFeedbackSessionId || contactBook[0]?.sessionId || 5;
    setSubmittingFeedback(true);
    try {
      const res = await parentApi.submitFeedback(
        {
          sessionId: targetSessionId,
          studentId: selectedStudentId,
          starRating,
          feedbackNote,
        },
        5
      );
      showToast(res.message || 'Đã ghi nhận đánh giá chất lượng giảng dạy của Phụ huynh vào hệ thống.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể gửi đánh giá chất lượng buổi học.');
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
      setSentCheerHistory((prev) => [
        {
          time: new Date().toLocaleTimeString('vi-VN'),
          stickerName: sticker?.name ?? 'Bố mẹ tự hào về con',
          message: cheerMessage,
        },
        ...prev,
      ]);
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
      showToast(
        err instanceof Error
          ? err.message
          : 'Đã truyền tín hiệu tuyên dương và hiệu ứng pháo hoa tới màn hình máy trạm của con.'
      );
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
      showToast(`Đã xác thực thành công chứng nhận học thuật số (Mã xác thực: ${qrToken}).`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể xác thực mã QR chứng nhận.');
    }
  };

  const handleCopyShareLink = (qrToken: string) => {
    const shareUrl = `${window.location.origin}/api/portfolio/verify/${qrToken}`;
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(shareUrl);
    }
    showToast(`Đã sao chép đường dẫn xác thực chứng nhận công khai: ${shareUrl}`);
  };

  const currentChild =
    dashboard.children.find((c) => c.studentId === selectedStudentId) ??
    dashboard.children[0] ??
    FALLBACK_CHILDREN[0];

  const activeRobotCoord = ROBOT_PATH_STEPS[simStepIndex] ?? ROBOT_PATH_STEPS[0];

  return (
    <div className="space-y-6 py-4">
      {toastMsg && (
        <div
          role="status"
          className="fixed top-20 right-6 z-50 max-w-lg px-4 py-3 rounded-lg bg-slate-900 text-white text-xs font-semibold shadow-lg border border-slate-700 flex items-center gap-3"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
          <span className="leading-relaxed">{toastMsg}</span>
        </div>
      )}

      {livePushAlert && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between gap-3 text-xs text-emerald-950 dark:text-emerald-100 shadow-sm">
          <div className="flex items-center gap-2.5 font-semibold">
            <IconCheckCircle size={18} className="text-emerald-700 shrink-0" />
            <span>{livePushAlert}</span>
          </div>
          <button
            type="button"
            onClick={() => setLivePushAlert(null)}
            className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-semibold shrink-0"
          >
            Xác nhận đã xem
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-between gap-3 text-xs text-rose-900 dark:text-rose-200">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => void loadParentHub()}
            className="px-3.5 py-1.5 rounded-lg bg-rose-700 text-white font-semibold shrink-0"
          >
            Đồng bộ lại
          </button>
        </div>
      )}

      {/* BANNER CỔNG THÔNG TIN PHỤ HUYNH & CHUYỂN ĐỔI HỒ SƠ CON */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-2.5 bg-slate-900 text-slate-100 text-[11px] flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
          <div className="flex items-center gap-2 font-semibold tracking-wide uppercase">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
            <span>CỔNG THÔNG TIN PHỤ HUYNH & SỔ LIÊN LẠC ĐIỆN TỬ — HỌC VIỆN CÔNG NGHỆ TEKY</span>
          </div>
          <div className="flex items-center gap-4 font-mono text-slate-300 tabular-nums">
            <span>Mã hồ sơ gia đình: PH-TEKY-005</span>
            <span>•</span>
            <span>Năm học: 2026–2027</span>
            <span>•</span>
            <span className="text-emerald-400">Đồng bộ trực tuyến 24/7</span>
          </div>
        </div>

        <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Hệ thống Giám sát Học vụ, Sổ Liên lạc Điện tử & Chứng nhận Năng lực Số
              </h1>
              <Badge variant="info">Chuẩn Đào tạo STEAM Quốc tế</Badge>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Phụ huynh / Người giám hộ:{' '}
              <strong className="text-slate-900 dark:text-white">{dashboard.parentName}</strong> • Đang quản lý{' '}
              <strong className="tabular-nums text-slate-900 dark:text-white">
                {dashboard.children.length} hồ sơ học viên
              </strong>{' '}
              theo học tại hệ thống (Hỗ trợ chuyển đổi hồ sơ 1-Chạm không cần đăng xuất)
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Chuyển đổi hồ sơ học viên"
            className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
          >
            {dashboard.children.map((child) => {
              const active = child.studentId === currentChild.studentId;
              return (
                <button
                  key={child.studentId}
                  role="tab"
                  aria-selected={active}
                  onClick={() => void handleSelectChild(child.studentId)}
                  className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2.5 ${
                    active
                      ? 'bg-blue-800 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-left">
                    <div className="leading-tight">{child.fullName}</div>
                    <div
                      className={`font-mono text-[10px] tabular-nums ${
                        active ? 'text-blue-200' : 'text-slate-500'
                      }`}
                    >
                      Mã HV: {child.studentCode}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Thanh Điều hướng Phân hệ Phụ huynh */}
      <div
        role="tablist"
        aria-label="Các phân hệ Cổng thông tin Phụ huynh"
        className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
      >
        {(
          [
            { id: 'all', code: 'TỔNG HỢP', label: 'Toàn bộ Hồ sơ Học vụ' },
            { id: 'par01_overview', code: 'SCR-PAR-01', label: 'Điểm danh Thời gian thực' },
            { id: 'par02_contact', code: 'SCR-PAR-02', label: 'Sổ liên lạc & Bản tin AI 60s' },
            { id: 'par03_portfolio', code: 'SCR-PAR-03', label: 'Mô hình Robot 2D & Mã QR' },
            { id: 'par04_cheer', code: 'SCR-PAR-04', label: 'Tuyên dương & Bảng xếp hạng' },
          ] as { id: ParentSectionTab; code: string; label: string }[]
        ).map((tab) => {
          const isSelected = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isSelected}
              onClick={() => setActiveSection(tab.id)}
              className={`min-h-[44px] px-3 py-2 rounded-lg font-semibold transition-all flex flex-col items-start justify-center text-left border ${
                isSelected
                  ? 'bg-blue-800 text-white border-blue-900 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <span
                className={`font-mono text-[10px] px-1.5 py-0.5 rounded mb-0.5 ${
                  isSelected
                    ? 'bg-blue-950 text-blue-100'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {tab.code}
              </span>
              <span className="line-clamp-1">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SCR-PAR-01 */}
      {!loading && (activeSection === 'all' || activeSection === 'par01_overview') && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Lớp học phần đang theo học
              </p>
              <h2 className="font-bold text-sm text-slate-900 dark:text-white mt-1.5 leading-snug">
                {currentChild.currentClassName}
              </h2>
              <p className="text-xs text-blue-800 dark:text-blue-400 font-semibold mt-1.5">
                Địa điểm: {currentChild.currentLabRoom}
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Trạng thái chuyên cần hôm nay
              </p>
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
                    ? 'Có mặt đúng giờ tại Phòng Lab'
                    : currentChild.todayAttendanceStatus === 'Late'
                    ? 'Đi muộn (Đã vào lớp)'
                    : 'Đã ghi nhận chuyên cần'}
                </Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                {currentChild.isInActiveSession
                  ? 'Trạng thái ca học: Đang diễn ra trực tiếp'
                  : 'Đồng bộ từ Máy trạm Lab & Sổ điểm danh Giảng viên'}
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Điểm tích lũy học tập (Total XP)
              </p>
              <p className="text-2xl font-extrabold text-amber-700 dark:text-amber-400 mt-1.5 font-mono tabular-nums">
                {currentChild.totalXp} XP
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Cập nhật tự động sau mỗi nhiệm vụ thực hành
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Chỉ số năng lực thực hành STEM
              </p>
              <p className="text-2xl font-extrabold text-blue-800 dark:text-blue-400 mt-1.5 font-mono tabular-nums">
                {currentChild.stemPoints} điểm
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mt-1">
                Đánh giá theo chuẩn Hybrid 60/40
              </p>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Nhật ký Giám sát Điểm danh & Đăng nhập Máy trạm Thời gian thực (Real-Time Attendance Monitoring)
                </h3>
                <p className="text-xs text-slate-500">
                  Tự động nhận thông báo đẩy tức thời khi học viên đăng nhập máy trạm phòng Lab hoặc khi giảng viên xác
                  nhận điểm danh đầu giờ
                </p>
              </div>
              <Badge variant="success">Đang kết nối Push Notification</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {attendancePushLogs.map((log, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">{log.title}</span>
                    <span className="font-mono text-[11px] text-blue-800 dark:text-blue-300 tabular-nums">
                      {log.time}
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    Kênh truyền tin: {log.channel}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{log.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SCR-PAR-02 */}
      {!loading && (activeSection === 'all' || activeSection === 'par02_contact') && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                  SCR-PAR-02 • Parent 60-Second AI Audio Digest
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
                  Bản tin Âm thanh Tổng hợp kết quả buổi học trong 60 giây — Học viên: {currentChild.fullName}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hệ thống AI tự động tổng hợp thái độ học tập, điểm số thực hành và khuyến nghị rèn luyện sau mỗi ca
                  học dưới định dạng bản tin phát thanh ngắn gọn
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  aria-label="Chọn tốc độ đọc bản tin"
                  value={audioRate}
                  onChange={(e) => setAudioRate(Number(e.target.value))}
                  className="min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-xs font-mono font-semibold"
                >
                  <option value={1.0}>Tốc độ: 1.0x (Chuẩn)</option>
                  <option value={1.15}>Tốc độ: 1.15x</option>
                </select>
                <button
                  type="button"
                  onClick={handlePlayAudioDigest}
                  className={`min-h-[44px] px-5 py-2 rounded-lg font-bold text-xs text-white shadow-sm flex items-center gap-2 ${
                    isPlayingAudio ? 'bg-rose-700 hover:bg-rose-800' : 'bg-blue-800 hover:bg-blue-900'
                  }`}
                >
                  <span>{isPlayingAudio ? '⏹ Dừng phát Bản tin' : '▶ Nghe Bản tin Tổng hợp 60 Giây'}</span>
                </button>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 leading-relaxed space-y-2">
              <p className="font-bold text-blue-900 dark:text-blue-300">
                Nội dung văn bản của Bản tin Âm thanh 60 giây:
              </p>
              <p>
                {digestText ||
                  `Kính chào Quý phụ huynh của học viên ${currentChild.fullName}. Trong buổi học thực hành hôm nay tại ${currentChild.currentClassName}, học viên tham gia đầy đủ, tập trung nghe giảng và hoàn thành bài lập trình điều hướng sa bàn Robot với điểm tổng kết xuất sắc. Đề nghị gia đình khuyến khích con ôn tập thêm nguyên lý cảm biến siêu âm tại nhà.`}
              </p>
            </div>

            <div className="flex items-center gap-3 px-1">
              <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                {isPlayingAudio ? 'Đang phát...' : '00:00'}
              </span>
              <div className="flex-1 flex items-center gap-1 h-5">
                {Array.from({ length: 36 }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`flex-1 rounded-sm transition-all ${
                      isPlayingAudio ? 'bg-blue-700 animate-pulse' : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                    style={{ height: `${25 + ((idx * 17) % 70)}%` }}
                  />
                ))}
              </div>
              <span className="font-mono text-[11px] text-slate-500 tabular-nums">01:00</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-6 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Sổ Liên lạc Điện tử & Kết quả Đánh giá Thực hành (Tỷ trọng 60/40)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Chi tiết điểm Thuật toán AST (60%), Thực nghiệm phần cứng (40%), kỹ năng đạt được và bản ghi âm nhận
                    xét của Giảng viên
                  </p>
                </div>
                <Badge variant="info">{contactBook.length} buổi học</Badge>
              </div>

              {contactBook.length === 0 ? (
                <div className="p-6 rounded-lg bg-slate-50 dark:bg-slate-700/40 text-xs text-slate-500 text-center">
                  Chưa có dữ liệu sổ liên lạc cho học viên này.
                </div>
              ) : (
                <div className="space-y-4">
                  {contactBook.map((item) => (
                    <div
                      key={item.sessionId}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 space-y-3 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-600">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {item.sessionTitle}
                          </span>
                          <Badge variant={item.attendanceStatus === 'Present' ? 'success' : 'warning'}>
                            {item.attendanceStatus === 'Present' ? 'Có mặt đúng giờ' : item.attendanceStatus}
                          </Badge>
                        </div>
                        <span className="font-mono font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
                          Ngày học: {item.date}
                        </span>
                      </div>

                      {item.finalScore != null && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center font-mono tabular-nums">
                          <div>
                            <p className="text-[10px] font-sans font-semibold uppercase text-slate-500">
                              Điểm Thuật toán AST (60%)
                            </p>
                            <p className="text-base font-bold text-blue-800 dark:text-blue-400 mt-0.5">
                              {item.autoAstScore?.toFixed(2)} / 10
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-sans font-semibold uppercase text-slate-500">
                              Điểm Thực hành Phần cứng (40%)
                            </p>
                            <p className="text-base font-bold text-amber-700 dark:text-amber-400 mt-0.5">
                              {item.hardwareScore?.toFixed(2)} / 10
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-sans font-semibold uppercase text-slate-500">
                              Điểm Tổng kết Buổi học
                            </p>
                            <p className="text-base font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5">
                              {item.finalScore.toFixed(2)} / 10
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="space-y-1">
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          Kỹ năng chuyên môn đạt được trong buổi học:
                        </p>
                        <ul className="list-disc pl-4 space-y-0.5 text-slate-600 dark:text-slate-300">
                          {SESSION_ACHIEVED_SKILLS.map((sk, idx) => (
                            <li key={idx}>{sk}</li>
                          ))}
                        </ul>
                      </div>

                      {item.remarkText && (
                        <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              Nhận xét của Giảng viên phụ trách (
                              {item.remarkSource === 'Voice'
                                ? 'Bản ghi âm giọng nói đã chuyển văn bản'
                                : 'Văn bản học vụ'}
                              ):
                            </p>
                            <p className="text-slate-800 dark:text-slate-200 italic">
                              &ldquo;{item.remarkText}&rdquo;
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handlePlayTeacherVoiceMemo(item.sessionId, item.remarkText ?? '')}
                            className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shrink-0"
                          >
                            {playingTeacherVoiceSessionId === item.sessionId
                              ? '⏹ Dừng nghe'
                              : '🔊 Nghe File Ghi âm Giảng viên'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="pb-2.5 border-b border-slate-200 dark:border-slate-700">
                  <Badge variant="success">Khảo sát Chất lượng Đào tạo</Badge>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
                    Phụ huynh Đánh giá Chất lượng Buổi học (Thang điểm 5 Sao)
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Ý kiến đánh giá của Quý phụ huynh là cơ sở quan trọng để Hội đồng Học thuật giám sát và nâng cao chất
                  lượng giảng dạy tại các cơ sở đào tạo.
                </p>

                <div className="text-xs">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Chọn buổi học cần đánh giá:
                  </label>
                  <select
                    value={selectedFeedbackSessionId}
                    onChange={(e) => setSelectedFeedbackSessionId(Number(e.target.value))}
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 font-medium"
                  >
                    {contactBook.map((cb) => (
                      <option key={cb.sessionId} value={cb.sessionId}>
                        {cb.sessionTitle} ({cb.date})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Mức độ hài lòng của Gia đình:
                  </label>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setStarRating(star)}
                        className={`min-h-[44px] flex-1 rounded-lg border font-bold text-xs transition-all ${
                          starRating >= star
                            ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-800 dark:text-amber-300 shadow-sm'
                            : 'border-slate-200 dark:border-slate-700 text-slate-400'
                        }`}
                      >
                        ★ {star}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ý kiến đóng góp chi tiết gửi Giảng viên & Phòng Đào tạo:
                  </label>
                  <textarea
                    rows={4}
                    value={feedbackNote}
                    onChange={(e) => setFeedbackNote(e.target.value)}
                    className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-xs leading-relaxed"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleSubmitFeedback()}
                disabled={submittingFeedback}
                className="min-h-[44px] w-full py-2.5 rounded-lg bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white font-bold text-xs shadow-sm"
              >
                {submittingFeedback ? 'Đang gửi phiếu đánh giá...' : 'Gửi Phiếu Đánh giá Chất lượng Giảng dạy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCR-PAR-03 */}
      {!loading && (activeSection === 'all' || activeSection === 'par03_portfolio') && (
        <div className="p-6 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
            <div>
              <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                SCR-PAR-03 • Child&apos;s Digital STEM Portfolio & QR Verification
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
                Hồ sơ Năng lực Thực hành Robot 2D & Cổng Xác thực Chứng nhận Điện tử QR
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Quan sát mô phỏng trực quan lộ trình Robot 2D do con lập trình và quét mã QR xác thực chứng nhận năng
                lực số công khai
              </p>
            </div>
            <Badge variant="success">Cấp tự động khi đạt chuẩn ≥ 8.0/10</Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    Mô phỏng Hành trình Robot 2D của {currentChild.fullName}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Tái hiện thuật toán đường đi của Robot trên lưới tọa độ sa bàn thực hành
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleStartRobotSimulation}
                  disabled={isSimulatingRobot}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white font-semibold text-xs"
                >
                  {isSimulatingRobot ? 'Đang chạy mô phỏng...' : '▶ Mô phỏng lại Robot 2D'}
                </button>
              </div>

              <div className="grid grid-cols-10 gap-1 p-3 rounded-lg bg-slate-900 border border-slate-700 max-w-md mx-auto">
                {Array.from({ length: 10 }).map((_, rIdx) =>
                  Array.from({ length: 10 }).map((__, cIdx) => {
                    const x = cIdx + 1;
                    const y = rIdx + 1;
                    const isRobotHere = activeRobotCoord.x === x && activeRobotCoord.y === y;
                    const isVisited = ROBOT_PATH_STEPS.slice(0, simStepIndex + 1).some(
                      (p) => p.x === x && p.y === y
                    );
                    const isTarget = x === 10 && y === 10;
                    const isCheckpoint = (x === 4 && y === 2) || (x === 7 && y === 6);

                    return (
                      <div
                        key={`${x}-${y}`}
                        className={`aspect-square rounded-[3px] flex items-center justify-center text-[9px] font-mono font-bold ${
                          isRobotHere
                            ? 'bg-emerald-500 text-slate-950 ring-2 ring-white'
                            : isTarget
                            ? 'bg-amber-500 text-slate-950'
                            : isCheckpoint
                            ? 'bg-blue-600 text-white'
                            : isVisited
                            ? 'bg-emerald-900/80 text-emerald-200'
                            : 'bg-slate-800 text-slate-600'
                        }`}
                      >
                        {isRobotHere ? 'R' : isTarget ? 'Đ' : isCheckpoint ? 'C' : isVisited ? '•' : ''}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-2.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-200">
                Trạng thái bước {simStepIndex + 1}/{ROBOT_PATH_STEPS.length}: {activeRobotCoord.label}
              </div>
            </div>

            <div className="space-y-4">
              {portfolios.length === 0 ? (
                <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-700/40 text-xs text-slate-500 text-center">
                  Khi học viên hoàn thành bài thực hành đạt từ 8.0 điểm trở lên, hệ thống sẽ tự động cấp Chứng nhận Hồ sơ
                  năng lực kèm mã QR xác thực tại đây.
                </div>
              ) : (
                <div className="space-y-3">
                  {portfolios.map((pf) => (
                    <div
                      key={pf.itemId}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">{pf.title}</span>
                          <Badge variant="success">Điểm tổng kết: {pf.finalScore}/10</Badge>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{pf.summary}</p>
                        <p className="font-mono text-[11px] text-slate-500 tabular-nums">
                          Mã định danh QR: <strong>{pf.qrToken}</strong> • Số lượt tra cứu xác thực:{' '}
                          <strong>{pf.viewCount} lượt</strong>
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => void handleVerifyQrPortfolio(pf.qrToken)}
                            className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-blue-800 hover:bg-blue-900 text-white font-semibold text-xs"
                          >
                            Xác thực Chứng nhận QR Trực tuyến
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyShareLink(pf.qrToken)}
                            className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-100"
                          >
                            Sao chép Liên kết Chia sẻ
                          </button>
                        </div>
                      </div>

                      <div className="w-28 h-28 rounded-lg bg-white p-2.5 border border-slate-300 shrink-0 flex flex-col items-center justify-center text-center shadow-sm">
                        <div className="grid grid-cols-5 gap-0.5 w-16 h-16">
                          {Array.from({ length: 25 }).map((_, i) => (
                            <div
                              key={i}
                              className={
                                i % 2 === 0 || i % 7 === 0 ? 'bg-slate-900 rounded-[1px]' : 'bg-slate-100'
                              }
                            />
                          ))}
                        </div>
                        <span className="font-mono text-[9px] font-bold text-slate-700 mt-1.5">
                          TEKY CERT QR
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {verifiedPortfolio && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <strong className="text-emerald-950 dark:text-emerald-200 uppercase tracking-wide">
                      ✓ Kết quả Xác thực Chứng nhận Học thuật Số Hợp lệ
                    </strong>
                    <button
                      type="button"
                      onClick={() => setVerifiedPortfolio(null)}
                      className="text-emerald-800 dark:text-emerald-300 font-bold"
                    >
                      Đóng
                    </button>
                  </div>
                  <p className="text-emerald-900 dark:text-emerald-200 leading-relaxed">
                    Tên dự án chứng nhận: <strong>{verifiedPortfolio.title}</strong> • Học viên thực hiện:{' '}
                    <strong>{currentChild.fullName}</strong> • Điểm thực hành:{' '}
                    <strong className="font-mono tabular-nums">{verifiedPortfolio.finalScore}/10</strong> • Tổng số lượt
                    xác thực công khai: <strong className="font-mono tabular-nums">{verifiedPortfolio.viewCount}</strong>.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SCR-PAR-04 */}
      {!loading && (activeSection === 'all' || activeSection === 'par04_cheer') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                  SCR-PAR-04 • Parent Live Cheer Box & Confetti
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
                  Gửi Huy hiệu Khích lệ Tinh thần Tức thời tới Máy trạm của Con
                </h2>
              </div>
              <Badge variant="info">SignalR CheerHub</Badge>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Thông điệp tuyên dương của Phụ huynh được truyền trực tiếp qua giao thức WebSocket SignalR tới màn hình
              máy trạm của học viên tại lớp học kèm hiệu ứng pháo hoa chúc mừng.
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              {stickers.map((stk) => {
                const active = stk.stickerId === selectedStickerId;
                return (
                  <button
                    key={stk.stickerId}
                    type="button"
                    onClick={() => setSelectedStickerId(stk.stickerId)}
                    className={`min-h-[48px] p-3 rounded-lg border text-xs font-semibold flex flex-col items-start justify-center gap-0.5 transition-all text-left ${
                      active
                        ? 'border-blue-800 bg-blue-50/80 dark:bg-blue-950/50 text-blue-950 dark:text-blue-100 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="font-mono text-[10px] font-bold text-blue-700 dark:text-blue-400">
                      {STICKER_BADGE_CODES[stk.code] ?? 'HUY HIỆU KHÍCH LỆ'}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">{stk.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Lời nhắn động viên gửi tới màn hình học tập của {currentChild.fullName}:
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={cheerMessage}
                  onChange={(e) => setCheerMessage(e.target.value)}
                  placeholder="Nhập thông điệp khích lệ gửi tới con..."
                  className="flex-1 min-h-[44px] px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-xs"
                />
                <button
                  type="button"
                  onClick={() => void handleSendCheerConfetti()}
                  disabled={sendingCheer}
                  className="min-h-[44px] px-5 py-2 rounded-lg bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white font-bold text-xs shadow-sm shrink-0"
                >
                  {sendingCheer ? 'Đang truyền tín hiệu...' : 'Gửi Tuyên dương & Pháo hoa'}
                </button>
              </div>
            </div>

            {sentCheerHistory.length > 0 && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  Lịch sử thông điệp khích lệ đã gửi trong ca học:
                </p>
                {sentCheerHistory.slice(0, 2).map((h, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
                  >
                    <span>
                      <strong>[{h.stickerName}]</strong> {h.message}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500 tabular-nums shrink-0">{h.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  CRON-03 • Quartz.NET Weekly Leaderboard
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1.5 flex items-center gap-2">
                  <IconTrophy size={18} className="text-amber-600" />
                  <span>Bảng Vinh danh Học viên Tiêu biểu trong Tuần</span>
                </h2>
              </div>
              {leaderboard && (
                <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                  Chu kỳ: {leaderboard.weekStartDate} → {leaderboard.weekEndDate}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Tổng hợp tự động vào 00:00 Chủ Nhật hàng tuần dựa trên thời gian hoàn thành sa bàn nhanh nhất và số lượng
              khối lệnh tối ưu nhất.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-700/70 text-slate-700 dark:text-slate-200 uppercase text-[10px] font-bold border-y border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">Thứ hạng</th>
                    <th className="py-2.5 px-3">Họ và tên học viên</th>
                    <th className="py-2.5 px-3">Thời gian hoàn thành</th>
                    <th className="py-2.5 px-3">Độ tối ưu lệnh</th>
                    <th className="py-2.5 px-3 text-right">Điểm thưởng XP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {(leaderboard?.topRankings ?? []).map((rk) => (
                    <tr
                      key={rk.studentId}
                      className={`h-11 ${
                        rk.studentId === currentChild.studentId
                          ? 'bg-blue-50/70 dark:bg-blue-950/30 font-semibold'
                          : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                        Hạng #{rk.rank}
                      </td>
                      <td className="py-2.5 px-3 text-slate-900 dark:text-white">
                        {rk.studentName}
                        {rk.studentId === currentChild.studentId && (
                          <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-800 text-white">
                            Con của Phụ huynh
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        <span className="inline-flex items-center gap-1">
                          <IconClock size={12} /> {(rk.bestTimeMs / 1000).toFixed(2)} giây
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {rk.bestBlockCount} khối lệnh
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        +{rk.xpEarned} XP
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
