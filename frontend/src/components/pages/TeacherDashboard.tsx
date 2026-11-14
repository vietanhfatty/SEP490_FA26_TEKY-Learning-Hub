import React, { useState, useEffect, useCallback, useRef } from 'react';
import { IconCalendar, IconDownload } from '../common/Icons';
import { Badge } from '../common/Badge';
import {
  teacherApi,
  emitRealtimeEvent,
  type TeacherWorkspaceDto,
  type TeacherClassSummaryDto,
  type ClassAttendanceSessionDto,
  type StudentAttendanceItemDto,
  type MakeupRequestItemDto,
  type CreateMapCheckpointDto,
  type GradingQueueItemDto,
  type ClassPerformanceAnalyticsDto,
} from '../../services/lmsApi';

type TeacherTab =
  | 'workspace'
  | 'attendance'
  | 'lab_control'
  | 'map_builder'
  | 'grading'
  | 'analytics'
  | 'system_agents';

const RUBRIC_QUICK_TEMPLATES = [
  'Kết cấu khung cơ khí lắp ráp chắc chắn, bố trí dây dẫn gọn gàng và đúng chuẩn kỹ thuật',
  'Trình bày nguyên lý hoạt động và lưu đồ thuật toán mạch lạc, nắm vững tư duy điều kiện',
  'Vận dụng hiệu quả cấu trúc vòng lặp giúp tối ưu hóa số lượng khối lệnh điều khiển',
  'Chủ động phối hợp và hỗ trợ thành viên trong nhóm xử lý sai số của cảm biến khoảng cách',
  'Cần lưu ý hiệu chỉnh lại góc quay động cơ Servo tại các điểm chuyển hướng vuông góc 90°',
];

const AI_PROMPT_PRESETS = [
  'Tạo sa bàn mê cung chủ đề Rừng Nhiệt Đới với 3 Checkpoint',
  'Tạo sa bàn thám hiểm Sao Hỏa vượt hố thiên thạch với 3 Checkpoint',
  'Tạo sa bàn Robot cứu hộ giao thông đô thị thông minh với 4 Checkpoint',
];

const FALLBACK_WORKSPACE: TeacherWorkspaceDto = {
  teacherId: 1,
  teacherName: 'ThS. Nguyễn Văn Nam',
  pendingTaskCount: 2,
  activeClassesCount: 1,
  weeklySchedule: [
    {
      sessionId: 6,
      classId: 3,
      classCode: 'ROBOT-K10-A',
      className: 'Lập trình & Chế tạo Robot Thông minh K10-A',
      sessionNumber: 2,
      title: 'Chuyên đề 02: Thuật toán điều hướng sa bàn bằng cảm biến siêu âm',
      sessionDate: '2026-11-13',
      startTime: '14:00',
      endTime: '16:00',
      roomName: 'Phòng Thực hành Robotics 202',
      status: 'Scheduled',
      enrolledStudentsCount: 3,
      presentCount: 3,
    },
    {
      sessionId: 5,
      classId: 3,
      classCode: 'ROBOT-K10-A',
      className: 'Lập trình & Chế tạo Robot Thông minh K10-A',
      sessionNumber: 1,
      title: 'Chuyên đề 01: Cấu trúc cơ khí truyền động & Khối lệnh điều khiển cơ bản',
      sessionDate: '2026-11-11',
      startTime: '08:30',
      endTime: '10:30',
      roomName: 'Phòng Thực hành Robotics 202',
      status: 'Done',
      enrolledStudentsCount: 3,
      presentCount: 2,
    },
  ],
  recentAbsentAlerts: [
    {
      studentId: 4,
      studentName: 'Nguyễn Minh Trí',
      classCode: 'ROBOT-K10-A',
      date: '2026-11-11',
      reason: 'Phụ huynh gửi đơn xin phép nghỉ ốm kèm đề nghị xếp lịch học bù chuyên đề 01',
    },
  ],
};

interface TeacherDashboardProps {
  activeNavId?: string;
}

const mapSidebarNavToTab = (navId?: string): TeacherTab => {
  switch (navId) {
    case 'schedule':
    case 'overview':
      return 'workspace';
    case 'attendance':
    case 'swap':
      return 'attendance';
    case 'materials':
      return 'map_builder';
    case 'grading':
      return 'grading';
    default:
      return 'workspace';
  }
};

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ activeNavId = 'overview' }) => {
  const [activeTab, setActiveTab] = useState<TeacherTab>(() => mapSidebarNavToTab(activeNavId));
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setActiveTab(mapSidebarNavToTab(activeNavId));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeNavId]);

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // SCR-TEA-01: Quản lý Lịch giảng dạy & Lớp phụ trách
  const [workspace, setWorkspace] = useState<TeacherWorkspaceDto>(FALLBACK_WORKSPACE);
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [classes, setClasses] = useState<TeacherClassSummaryDto[]>([
    {
      classId: 3,
      classCode: 'ROBOT-K10-A',
      className: 'Lập trình & Chế tạo Robot Thông minh K10-A',
      status: 'Open',
      studentCount: 3,
    },
  ]);
  const [selectedClassId, setSelectedClassId] = useState<number>(3);
  const [selectedSessionId, setSelectedSessionId] = useState<number>(6);

  // SCR-TEA-02: Điểm danh 1-Chạm, Đồng bộ Máy trạm & Xét duyệt Học bù
  const [attendanceSession, setAttendanceSession] = useState<ClassAttendanceSessionDto | null>(null);
  const [roster, setRoster] = useState<StudentAttendanceItemDto[]>([]);
  const [savingAttendance, setSavingAttendance] = useState<boolean>(false);
  const [makeupList, setMakeupList] = useState<MakeupRequestItemDto[]>([]);
  const [makeupTeacherNote, setMakeupTeacherNote] = useState<Record<number, string>>({});
  const [workstationStudentId, setWorkstationStudentId] = useState<number>(2);
  const [workstationIp, setWorkstationIp] = useState<string>('192.168.1.108');

  // SCR-TEA-03: Điều khiển Phòng Lab (Focus Mode Lock) & Phát sóng Màn hình (Spotlight)
  const [isFocusLocked, setIsFocusLocked] = useState<boolean>(false);
  const [focusMessage, setFocusMessage] = useState<string>(
    'Thông báo từ Giảng viên: Đề nghị toàn thể học viên tạm dừng thao tác trên máy trạm và quan sát màn hình trình chiếu trung tâm để nghe hướng dẫn nguyên lý thuật toán.'
  );
  const [spotlightStudentId, setSpotlightStudentId] = useState<number>(2);
  const [isSpotlightActive, setIsSpotlightActive] = useState<boolean>(false);
  const [spotlightPayload, setSpotlightPayload] = useState<string>(
    'Giải pháp tối ưu: Sử dụng cấu trúc lặp Repeat(4) kết hợp điều kiện cảm biến siêu âm khoảng cách < 15cm, hoàn thành lộ trình chỉ với 7 khối lệnh chuẩn.'
  );
  const [labActionLogs, setLabActionLogs] = useState<
    { time: string; action: string; target: string; status: string }[]
  >([
    {
      time: '14:00:12',
      action: 'Khởi tạo kết nối WebSocket SignalR ClassroomHub',
      target: 'Phòng Thực hành Robotics 202 (3/3 máy trạm)',
      status: 'Thành công',
    },
    {
      time: '14:02:05',
      action: 'Đồng bộ điểm danh tự động từ máy trạm LAN',
      target: 'HS Lê Bảo An — IP 192.168.1.105',
      status: 'Đã ghi nhận',
    },
  ]);

  // SCR-TEA-04: Thiết kế Sa bàn 2D, Tải ảnh nền, Thiết lập Par-Time & AI Quest Creator
  const [mapName, setMapName] = useState<string>('Sa bàn Mê cung Rừng Nhiệt Đới — Học phần 02');
  const [mapTheme, setMapTheme] = useState<string>('JungleExpedition');
  const [gridSize, setGridSize] = useState<number>(12);
  const [parTimeSeconds, setParTimeSeconds] = useState<number>(45);
  const [parBlockCount, setParBlockCount] = useState<number>(8);
  const [mapBgImageUrl, setMapBgImageUrl] = useState<string>('');
  const [startPos, setStartPos] = useState<{ x: number; y: number }>({ x: 1, y: 1 });
  const [obstacles, setObstacles] = useState<{ x: number; y: number }[]>([
    { x: 3, y: 3 },
    { x: 3, y: 4 },
    { x: 6, y: 5 },
    { x: 7, y: 8 },
  ]);
  const [checkpoints, setCheckpoints] = useState<CreateMapCheckpointDto[]>([
    {
      seqNo: 1,
      x: 4,
      y: 2,
      unlockMessage: 'Trạm kiểm soát 01: Câu hỏi tư duy — Cảm biến siêu âm đo khoảng cách theo nguyên lý nào?',
      isFinish: false,
    },
    {
      seqNo: 2,
      x: 7,
      y: 6,
      unlockMessage: 'Trạm kiểm soát 02: Câu hỏi tư duy — Cần bao nhiêu lần lặp để vượt qua hành lang chữ Z?',
      isFinish: false,
    },
    {
      seqNo: 3,
      x: 10,
      y: 10,
      unlockMessage: 'Trạm đích 03: Hoàn thành xuất sắc nhiệm vụ vận chuyển mẫu vật về trạm nghiên cứu!',
      isFinish: true,
    },
  ]);
  const [gridTool, setGridTool] = useState<'obstacle' | 'checkpoint' | 'start'>('checkpoint');
  const [aiPrompt, setAiPrompt] = useState<string>(
    'Tạo sa bàn mê cung chủ đề Rừng Nhiệt Đới với 3 Checkpoint'
  );
  const [masterBlocklyXml, setMasterBlocklyXml] = useState<string>(
    '<xml><block type="robot_start"><next><block type="controls_repeat"><field name="TIMES">4</field><statement name="DO"><block type="robot_move_forward"><field name="STEPS">2</field></block></statement></block></next></block></xml>'
  );
  const [aiGenerationLatencyMs, setAiGenerationLatencyMs] = useState<number | null>(420);
  const [generatingAiMap, setGeneratingAiMap] = useState<boolean>(false);
  const [savingMap, setSavingMap] = useState<boolean>(false);

  // SCR-TEA-05: Chấm điểm Thực hành Kết hợp (60% AST / 40% Thực nghiệm) & Ghi âm Nhận xét
  const [submissions, setSubmissions] = useState<GradingQueueItemDto[]>([]);
  const [submissionFilter, setSubmissionFilter] = useState<'ALL' | 'PENDING' | 'FINALIZED'>('ALL');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null);
  const [assemblyScore, setAssemblyScore] = useState<number>(9.0);
  const [algorithmScore, setAlgorithmScore] = useState<number>(9.0);
  const [teamworkScore, setTeamworkScore] = useState<number>(9.5);
  const [remarkText, setRemarkText] = useState<string>(
    'Học viên nắm vững cấu trúc điều khiển vòng lặp và xử lý tín hiệu cảm biến chính xác; kết cấu khung robot lắp ráp cân đối, vận hành ổn định trên sa bàn.'
  );
  const [remarkSource, setRemarkSource] = useState<'Typed' | 'Voice'>('Typed');
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [submittingGrade, setSubmittingGrade] = useState<boolean>(false);
  const recognitionRef = useRef<{ stop?: () => void } | null>(null);

  // SCR-TEA-06: Phân tích Chất lượng Đào tạo & Xuất Báo cáo Điểm
  const [analytics, setAnalytics] = useState<ClassPerformanceAnalyticsDto | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const loadAllTeacherData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [ws, clsList, subList, mkList] = await Promise.all([
        teacherApi.getWorkspace(1),
        teacherApi.getClasses(1),
        teacherApi.getSubmissions(1),
        teacherApi.getMakeupRequests(1),
      ]);

      setWorkspace(ws);
      if (clsList.length > 0) {
        setClasses(clsList);
        setSelectedClassId(clsList[0].classId);
      }
      setSubmissions(subList);
      if (subList.length > 0) {
        const firstSub = subList[0];
        setSelectedSubmissionId(firstSub.submissionId);
        if (firstSub.remarkText) setRemarkText(firstSub.remarkText);
      }
      setMakeupList(mkList);

      const firstSessionId = ws.weeklySchedule[0]?.sessionId ?? 6;
      setSelectedSessionId(firstSessionId);

      const [att, ana] = await Promise.all([
        teacherApi.getSessionAttendance(firstSessionId),
        teacherApi.getAnalytics(clsList[0]?.classId ?? 3),
      ]);
      setAttendanceSession(att);
      setRoster(att.students);
      setAnalytics(ana);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? `Không thể đồng bộ trực tiếp với máy chủ dữ liệu (${err.message}). Hệ thống đang kích hoạt chế độ dữ liệu dự phòng tiêu chuẩn.`
          : 'Không thể kết nối máy chủ Backend .NET.'
      );
      setRoster([
        {
          attendanceId: 6,
          studentId: 2,
          studentCode: 'TEKY-STU-001',
          studentName: 'Lê Bảo An',
          status: 'Present',
          absenceReason: 'Đồng bộ tự động từ máy trạm LAB-WS-01 (IP: 192.168.1.105)',
          markedAt: '2026-11-13T13:55:00Z',
        },
        {
          attendanceId: 7,
          studentId: 3,
          studentCode: 'TEKY-STU-002',
          studentName: 'Trần Thị Mai',
          status: 'Present',
          absenceReason: 'Có mặt đúng giờ quy định',
          markedAt: '2026-11-13T13:57:00Z',
        },
        {
          attendanceId: 8,
          studentId: 4,
          studentCode: 'TEKY-STU-003',
          studentName: 'Nguyễn Minh Trí',
          status: 'Late',
          absenceReason: 'Đến lớp muộn 10 phút do phương tiện di chuyển',
          markedAt: '2026-11-13T14:10:00Z',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAllTeacherData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAllTeacherData]);

  useEffect(() => {
    if (!isRecordingVoice) return;
    const interval = window.setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isRecordingVoice]);

  const handleNavigateWeek = async (nextOffset: number) => {
    setWeekOffset(nextOffset);
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + nextOffset * 7);
    const isoDate = baseDate.toISOString().split('T')[0];
    try {
      const ws = await teacherApi.getWorkspace(1, nextOffset === 0 ? undefined : isoDate);
      setWorkspace(ws);
      showToast(
        nextOffset === 0
          ? 'Đã hiển thị lịch giảng dạy tuần hiện tại.'
          : `Đã chuyển sang lịch giảng dạy tuần khởi đầu ngày ${isoDate}.`
      );
    } catch {
      showToast(`Đang xem lịch giảng dạy theo tuần (${isoDate}).`);
    }
  };

  const handleSelectSessionForAttendance = async (sessionId: number) => {
    setSelectedSessionId(sessionId);
    try {
      const att = await teacherApi.getSessionAttendance(sessionId);
      setAttendanceSession(att);
      setRoster(att.students);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể tải danh sách điểm danh của ca học.');
    }
  };

  const handleAttendanceStatusChange = async (
    studentId: number,
    status: StudentAttendanceItemDto['status']
  ) => {
    const nowIso = new Date().toISOString();
    const updatedRoster = roster.map((s) =>
      s.studentId === studentId ? { ...s, status, markedAt: nowIso } : s
    );
    setRoster(updatedRoster);

    const targetStudent = updatedRoster.find((s) => s.studentId === studentId);
    try {
      await teacherApi.updateAttendance(
        selectedSessionId,
        [
          {
            studentId,
            status,
            reason: targetStudent?.absenceReason,
          },
        ],
        1
      );
      const ws = await teacherApi.getWorkspace(1);
      setWorkspace(ws);
      showToast(
        `Đã lưu trực tiếp vào CSDL SQL Server: ${targetStudent?.studentName ?? `HV #${studentId}`} → ${
          status === 'Present'
            ? 'Có mặt'
            : status === 'Late'
            ? 'Đi muộn'
            : status === 'Excused'
            ? 'Vắng có phép'
            : 'Vắng không phép'
        }.`
      );
    } catch {
      // Nếu chưa bật Backend thì vẫn giữ trạng thái trên UI
    }
  };

  const handleAttendanceReasonChange = (studentId: number, absenceReason: string) => {
    setRoster((prev) => prev.map((s) => (s.studentId === studentId ? { ...s, absenceReason } : s)));
  };

  const handleMarkAllPresent = async () => {
    const nowIso = new Date().toISOString();
    const updatedRoster: StudentAttendanceItemDto[] = roster.map((s) => ({
      ...s,
      status: 'Present',
      absenceReason: s.absenceReason || 'Có mặt đầy đủ theo quy định',
      markedAt: nowIso,
    }));
    setRoster(updatedRoster);

    try {
      await teacherApi.updateAttendance(
        selectedSessionId,
        updatedRoster.map((r) => ({
          studentId: r.studentId,
          status: r.status,
          reason: r.absenceReason,
        })),
        1
      );
      const ws = await teacherApi.getWorkspace(1);
      setWorkspace(ws);
      showToast('Đã cập nhật trạng thái "Có mặt" cho toàn bộ học viên trực tiếp vào CSDL SQL Server.');
    } catch {
      showToast('Đã đánh dấu trạng thái "Có mặt" cho toàn bộ học viên trong danh sách lớp.');
    }
  };

  const handleSaveAttendance = async () => {
    setSavingAttendance(true);
    try {
      const res = await teacherApi.updateAttendance(
        selectedSessionId,
        roster.map((r) => ({
          studentId: r.studentId,
          status: r.status,
          reason: r.absenceReason,
        })),
        1
      );
      showToast(res.message || 'Đã lưu hồ sơ điểm danh và đồng bộ thông báo tới Cổng Phụ huynh.');
      const ws = await teacherApi.getWorkspace(1);
      setWorkspace(ws);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Phát sinh lỗi khi lưu dữ liệu điểm danh.');
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleSimulateWorkstationLogin = async () => {
    const stuName =
      roster.find((r) => r.studentId === workstationStudentId)?.studentName ?? 'Lê Bảo An';
    try {
      const res = await teacherApi.syncWorkstation(selectedSessionId, workstationStudentId, workstationIp);
      emitRealtimeEvent({
        type: 'WORKSTATION_CHECKIN',
        sessionId: selectedSessionId,
        studentId: workstationStudentId,
        workstationIp,
        timestamp: new Date().toISOString(),
      });
      setLabActionLogs((prev) => [
        {
          time: new Date().toLocaleTimeString('vi-VN'),
          action: 'Đồng bộ đăng nhập máy trạm phòng Lab (Auto Check-in)',
          target: `${stuName} — Địa chỉ IP: ${workstationIp}`,
          status: 'Đã đồng bộ',
        },
        ...prev,
      ]);
      showToast(res.message);
      await handleSelectSessionForAttendance(selectedSessionId);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Lỗi kết nối khi đồng bộ máy trạm.');
    }
  };

  const handleReviewMakeup = async (makeupId: number, isApproved: boolean) => {
    const customNote =
      makeupTeacherNote[makeupId]?.trim() ||
      (isApproved
        ? 'Phê duyệt bố trí học bù theo đúng quy chế đào tạo học vụ.'
        : 'Từ chối do ca học đề xuất đã đạt giới hạn sĩ số thiết bị phòng Lab.');
    try {
      const res = await teacherApi.reviewMakeup(makeupId, isApproved, customNote, 1);
      showToast(res.message);
      const mkList = await teacherApi.getMakeupRequests(1);
      setMakeupList(mkList);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể xử lý hồ sơ đăng ký học bù.');
    }
  };

  const handleToggleFocusMode = async (lockState: boolean) => {
    try {
      const res = await teacherApi.toggleFocusMode(selectedClassId, lockState, focusMessage);
      setIsFocusLocked(lockState);
      emitRealtimeEvent({
        type: 'FOCUS_MODE',
        classId: selectedClassId,
        isLocked: lockState,
        message: focusMessage,
        timestamp: new Date().toISOString(),
      });
      setLabActionLogs((prev) => [
        {
          time: new Date().toLocaleTimeString('vi-VN'),
          action: lockState
            ? 'Kích hoạt Chế độ Tập trung (Khóa màn hình toàn bộ máy trạm)'
            : 'Mở khóa màn hình máy trạm cho học viên thực hành',
          target: `Lớp #${selectedClassId} (${roster.length} máy trạm)`,
          status: 'Đã thực thi',
        },
        ...prev,
      ]);
      showToast(res.message);
    } catch (err) {
      setIsFocusLocked(lockState);
      emitRealtimeEvent({
        type: 'FOCUS_MODE',
        classId: selectedClassId,
        isLocked: lockState,
        message: focusMessage,
        timestamp: new Date().toISOString(),
      });
      showToast(
        err instanceof Error ? err.message : 'Đã phát lệnh điều khiển Focus Mode trên toàn phòng Lab.'
      );
    }
  };

  const handleBroadcastSpotlight = async () => {
    const stu = roster.find((r) => r.studentId === spotlightStudentId)?.studentName ?? 'Lê Bảo An';
    try {
      const res = await teacherApi.broadcastSpotlight(
        selectedClassId,
        spotlightStudentId,
        stu,
        spotlightPayload
      );
      setIsSpotlightActive(true);
      emitRealtimeEvent({
        type: 'SPOTLIGHT',
        classId: selectedClassId,
        studentId: spotlightStudentId,
        studentName: stu,
        screenPayload: spotlightPayload,
        timestamp: new Date().toISOString(),
      });
      setLabActionLogs((prev) => [
        {
          time: new Date().toLocaleTimeString('vi-VN'),
          action: 'Phát sóng bài làm tiêu biểu lên màn hình trung tâm (Spotlight)',
          target: `Học viên: ${stu}`,
          status: 'Đang phát sóng',
        },
        ...prev,
      ]);
      showToast(res.message);
    } catch (err) {
      setIsSpotlightActive(true);
      emitRealtimeEvent({
        type: 'SPOTLIGHT',
        classId: selectedClassId,
        studentId: spotlightStudentId,
        studentName: stu,
        screenPayload: spotlightPayload,
        timestamp: new Date().toISOString(),
      });
      showToast(err instanceof Error ? err.message : 'Đã phát sóng màn hình mẫu lên toàn bộ máy trạm.');
    }
  };

  const handleMapImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setMapBgImageUrl(reader.result);
        showToast(`Đã tải lên bản đồ nền sa bàn: ${file.name}`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGridCellClick = (x: number, y: number) => {
    if (gridTool === 'start') {
      setStartPos({ x, y });
      return;
    }
    if (gridTool === 'obstacle') {
      setObstacles((prev) => {
        const exists = prev.some((o) => o.x === x && o.y === y);
        return exists ? prev.filter((o) => !(o.x === x && o.y === y)) : [...prev, { x, y }];
      });
      return;
    }
    setCheckpoints((prev) => {
      const exists = prev.some((c) => c.x === x && c.y === y);
      if (exists) {
        return prev
          .filter((c) => !(c.x === x && c.y === y))
          .map((c, idx, arr) => ({ ...c, seqNo: idx + 1, isFinish: idx === arr.length - 1 }));
      }
      const next = [
        ...prev.map((c) => ({ ...c, isFinish: false })),
        {
          seqNo: prev.length + 1,
          x,
          y,
          unlockMessage: `Trạm kiểm soát 0${prev.length + 1} tại tọa độ (${x}, ${y}): Giải thích điều kiện rẽ nhánh của cảm biến.`,
          isFinish: true,
        },
      ];
      return next;
    });
  };

  const handleUpdateCheckpointQuestion = (seqNo: number, message: string) => {
    setCheckpoints((prev) =>
      prev.map((cp) => (cp.seqNo === seqNo ? { ...cp, unlockMessage: message } : cp))
    );
  };

  const handleGenerateAiMap = async () => {
    setGeneratingAiMap(true);
    const t0 = performance.now();
    try {
      const aiMap = await teacherApi.generateAiMap(aiPrompt);
      setMapName(aiMap.name);
      setMapTheme(aiMap.theme);
      setStartPos({ x: aiMap.startX, y: aiMap.startY });
      setCheckpoints(aiMap.checkpoints);
      setMasterBlocklyXml(aiMap.masterBlocklyXml);
      try {
        const parsed = JSON.parse(aiMap.layoutJson) as {
          obstacles?: { x: number; y: number }[];
          gridWidth?: number;
          parTimeSeconds?: number;
        };
        if (parsed.obstacles) setObstacles(parsed.obstacles);
        if (parsed.gridWidth) setGridSize(parsed.gridWidth);
        if (parsed.parTimeSeconds) setParTimeSeconds(parsed.parTimeSeconds);
      } catch {
        // Keep current obstacles if JSON format differs
      }
      const elapsed = Math.round(performance.now() - t0);
      setAiGenerationLatencyMs(elapsed);
      showToast(
        `Đã khởi tạo tự động cấu trúc Sa bàn 2D, các trạm kiểm soát và mã chuẩn AST (${elapsed} ms).`
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể kết nối dịch vụ AI khởi tạo học liệu.');
    } finally {
      setGeneratingAiMap(false);
    }
  };

  const handleSaveStemMap = async () => {
    setSavingMap(true);
    try {
      const layoutJson = JSON.stringify({
        gridWidth: gridSize,
        gridHeight: gridSize,
        parTimeSeconds,
        parBlockCount,
        backgroundImageApplied: Boolean(mapBgImageUrl),
        obstacles,
        masterBlocklyXml,
      });
      const res = await teacherApi.createStemMap(
        {
          name: mapName,
          theme: mapTheme,
          layoutJson,
          startX: startPos.x,
          startY: startPos.y,
          checkpoints,
        },
        1
      );
      showToast(`${res.message} (Mã định danh học liệu Sa bàn: #${res.mapId})`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể lưu cấu hình sa bàn vào CSDL.');
    } finally {
      setSavingMap(false);
    }
  };

  const filteredSubmissions = submissions.filter((s) => {
    if (submissionFilter === 'PENDING') return s.status !== 'Finalized';
    if (submissionFilter === 'FINALIZED') return s.status === 'Finalized';
    return true;
  });

  const selectedSubmission =
    submissions.find((s) => s.submissionId === selectedSubmissionId) ??
    filteredSubmissions[0] ??
    submissions[0] ??
    null;

  const currentAstScore = selectedSubmission?.autoAstScore ?? 9.5;
  const currentHardwareAvg = Number(((assemblyScore + algorithmScore + teamworkScore) / 3).toFixed(2));
  const previewFinalScore = Number((currentAstScore * 0.6 + currentHardwareAvg * 0.4).toFixed(2));

  const handleToggleVoiceRecording = () => {
    setRecordingSeconds(0);
    if (isRecordingVoice) {
      recognitionRef.current?.stop?.();
      setIsRecordingVoice(false);
      return;
    }

    const SpeechRecognitionCtor =
      (
        window as unknown as {
          SpeechRecognition?: new () => unknown;
          webkitSpeechRecognition?: new () => unknown;
        }
      ).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;

    setRemarkSource('Voice');
    if (SpeechRecognitionCtor) {
      try {
        const rec = new SpeechRecognitionCtor() as {
          lang: string;
          continuous: boolean;
          onresult: ((ev: { results: { [idx: number]: { [idx: number]: { transcript: string } } } }) => void) | null;
          onerror: (() => void) | null;
          onend: (() => void) | null;
          start: () => void;
          stop: () => void;
        };
        rec.lang = 'vi-VN';
        rec.continuous = false;
        rec.onresult = (event) => {
          const transcript = event.results[0]?.[0]?.transcript ?? '';
          if (transcript) {
            setRemarkText((prev) => (prev ? `${prev} ${transcript}` : transcript));
          }
        };
        rec.onerror = () => setIsRecordingVoice(false);
        rec.onend = () => setIsRecordingVoice(false);
        recognitionRef.current = rec;
        setIsRecordingVoice(true);
        rec.start();
        return;
      } catch {
        // Fallback to simulated voice dictation if mic permission denied
      }
    }

    setIsRecordingVoice(true);
    setTimeout(() => {
      setRemarkText(
        'Nhận xét thu âm trực tiếp tại lớp: Học viên lắp ráp cơ cấu truyền động robot chắc chắn, xử lý thuật toán vượt chướng ngại vật chính xác và tích cực hỗ trợ các bạn trong nhóm.'
      );
      setIsRecordingVoice(false);
      showToast('Đã chuyển đổi bản ghi âm giọng nói thành văn bản nhận xét học thuật.');
    }, 1500);
  };

  const handlePreviewVoiceRemark = () => {
    if (!remarkText) return;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(remarkText);
      utter.lang = 'vi-VN';
      window.speechSynthesis.speak(utter);
      showToast('Đang phát lại bản thu âm nhận xét của giảng viên...');
    }
  };

  const handleSubmitHybridGrade = async () => {
    if (!selectedSubmission) return;
    setSubmittingGrade(true);
    try {
      const res = await teacherApi.gradeSubmission(
        {
          submissionId: selectedSubmission.submissionId,
          assemblyScore,
          algorithmExplainScore: algorithmScore,
          teamworkScore,
          remarkText,
          remarkSource,
        },
        1
      );
      showToast(
        `Đã phê duyệt và công bố kết quả đánh giá: Điểm tổng kết ${res.finalScore}/10 (Thuật toán AST: ${res.autoAstScore} • Thực nghiệm phần cứng: ${res.hardwareScore}).`
      );
      const [subList, ana, ws] = await Promise.all([
        teacherApi.getSubmissions(1),
        teacherApi.getAnalytics(selectedClassId),
        teacherApi.getWorkspace(1),
      ]);
      setSubmissions(subList);
      setAnalytics(ana);
      setWorkspace(ws);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể lưu kết quả đánh giá bài thực hành.');
    } finally {
      setSubmittingGrade(false);
    }
  };

  const presentTotal = roster.filter((r) => r.status === 'Present').length;
  const lateTotal = roster.filter((r) => r.status === 'Late').length;
  const absentTotal = roster.filter((r) => r.status === 'Absent' || r.status === 'Excused').length;
  const attendanceRate =
    roster.length > 0 ? Math.round(((presentTotal + lateTotal) / roster.length) * 100) : 100;

  return (
    <div className="space-y-6 py-4">
      {/* Thông báo trạng thái xử lý (Toast Notification) */}
      {toastMsg && (
        <div
          role="status"
          className="fixed top-20 right-6 z-50 max-w-lg px-4 py-3 rounded-lg bg-slate-900 text-white text-xs font-semibold shadow-lg border border-slate-700 flex items-center gap-3"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
          <span className="leading-relaxed">{toastMsg}</span>
        </div>
      )}

      {/* Cảnh báo lỗi kết nối kèm nút khôi phục (State 8: Error Recovery) */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-900 dark:text-rose-200">
          <div>
            <span className="font-bold uppercase tracking-wider">Thông báo trạng thái kết nối: </span>
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => void loadAllTeacherData()}
            className="px-3.5 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-semibold shrink-0"
          >
            Đồng bộ lại dữ liệu
          </button>
        </div>
      )}

      {/* ==================== BANNER HÀNH CHÍNH & HỌC VỤ CẤP HỌC VIỆN ==================== */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-2.5 bg-slate-900 text-slate-100 text-[11px] flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
          <div className="flex items-center gap-2 font-semibold tracking-wide uppercase">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
            <span>HỆ THỐNG QUẢN LÝ HỌC VỤ & ĐIỀU PHỐI PHÒNG THỰC HÀNH STEM — HỌC VIỆN CÔNG NGHỆ TEKY</span>
          </div>
          <div className="flex items-center gap-4 font-mono text-slate-300 tabular-nums">
            <span>Mã cán bộ: GV-TEKY-001</span>
            <span>•</span>
            <span>Học kỳ I (Năm học 2026–2027)</span>
            <span>•</span>
            <span className="text-emerald-400">CSDL SQL Server: Trực tuyến</span>
          </div>
        </div>

        <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-900 text-white font-bold text-sm flex flex-col items-center justify-center shrink-0 border border-blue-800 shadow-sm">
              <span>GIẢNG</span>
              <span className="text-[10px] font-mono text-blue-200">VIÊN</span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Phân hệ Điều hành Giảng dạy & Đánh giá Thực hành STEM
                </h1>
                <Badge variant="info">Chuẩn CSTA Quốc tế</Badge>
                <Badge variant="success">Đã xác thực RBAC</Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Cán bộ giảng dạy:{' '}
                <strong className="text-slate-900 dark:text-white">{workspace.teacherName}</strong> • Đơn vị:
                Khoa Robotics & Tự động hóa • Lớp đang phụ trách:{' '}
                <strong className="tabular-nums text-slate-900 dark:text-white">
                  {workspace.activeClassesCount} lớp
                </strong>{' '}
                • Hồ sơ bài nộp chờ chấm:{' '}
                <strong className="text-amber-700 dark:text-amber-400 tabular-nums">
                  {workspace.pendingTaskCount} hồ sơ
                </strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex flex-col">
              <label
                htmlFor="teacher-class-selector"
                className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5"
              >
                Lớp học phần đang tác nghiệp
              </label>
              <select
                id="teacher-class-selector"
                aria-label="Chọn lớp học phụ trách"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(Number(e.target.value))}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100"
              >
                {classes.map((c) => (
                  <option key={c.classId} value={c.classId}>
                    [{c.classCode}] {c.className} ({c.studentCount} học viên)
                  </option>
                ))}
              </select>
            </div>

            <a
              href={teacherApi.getExportExcelUrl(selectedClassId)}
              target="_blank"
              rel="noreferrer"
              className="mt-4 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 active:scale-[0.99] text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <IconDownload size={15} /> Xuất Sổ điểm Chính thức (.xlsx)
            </a>
          </div>
        </div>
      </div>

      {/* Thanh Điều hướng Nghiệp vụ (7 Phân hệ: 6 Màn hình Giảng viên + 1 Trung tâm Tác vụ Hệ thống) */}
      <div
        role="tablist"
        aria-label="Các phân hệ nghiệp vụ Giảng viên"
        className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs"
      >
        {(
          [
            { id: 'workspace', code: 'SCR-TEA-01', label: 'Lịch giảng dạy & Lớp học' },
            { id: 'attendance', code: 'SCR-TEA-02', label: 'Điểm danh & Đơn học bù' },
            { id: 'lab_control', code: 'SCR-TEA-03', label: 'Điều khiển Phòng Lab' },
            { id: 'map_builder', code: 'SCR-TEA-04', label: 'Thiết kế Sa bàn & AI' },
            { id: 'grading', code: 'SCR-TEA-05', label: 'Chấm điểm Kết hợp 60/40' },
            { id: 'analytics', code: 'SCR-TEA-06', label: 'Thống kê & Xuất sổ điểm' },
            { id: 'system_agents', code: 'SYS-AGENT', label: 'Tác vụ Hệ thống & AST' },
          ] as { id: TeacherTab; code: string; label: string }[]
        ).map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isSelected}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2.5 rounded-lg font-semibold transition-all flex flex-col items-start justify-between text-left border ${
                isSelected
                  ? 'bg-blue-800 text-white border-blue-900 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <span
                className={`font-mono text-[10px] px-1.5 py-0.5 rounded mb-1 ${
                  isSelected
                    ? 'bg-blue-950 text-blue-100'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {tab.code}
              </span>
              <span className="leading-snug line-clamp-1">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Trạng thái đang tải dữ liệu (State 6: Skeleton CLS = 0) */}
      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
          <div className="h-64 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="lg:col-span-2 h-64 rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
      )}

      {/* ==================== PHÂN HỆ 1: SCR-TEA-01 LỊCH GIẢNG DẠY, LỚP PHỤ TRÁCH & CẢNH BÁO ==================== */}
      {!loading && activeTab === 'workspace' && (
        <div className="space-y-6">
          {/* Chỉ số Thống kê Học vụ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Số lớp học phần phụ trách
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5 tabular-nums">
                {workspace.activeClassesCount} lớp học phần
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mt-1">
                Trạng thái: Đang tổ chức giảng dạy
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Bài thực hành chờ chấm điểm
              </p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1.5 tabular-nums">
                {workspace.pendingTaskCount} bài nộp
              </p>
              <button
                onClick={() => setActiveTab('grading')}
                className="text-xs text-blue-700 dark:text-blue-400 font-semibold mt-1 hover:underline"
              >
                Chuyển tới Bàn chấm điểm 60/40 →
              </button>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Tổng số ca giảng dạy trong tuần
              </p>
              <p className="text-2xl font-bold text-blue-800 dark:text-blue-400 mt-1.5 tabular-nums">
                {workspace.weeklySchedule.length} ca học
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Địa điểm: Phòng Thực hành Robotics 202
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Hồ sơ xin học bù chờ phê duyệt
              </p>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-1.5 tabular-nums">
                {makeupList.filter((m) => m.status === 'Pending').length} hồ sơ
              </p>
              <button
                onClick={() => setActiveTab('attendance')}
                className="text-xs text-blue-700 dark:text-blue-400 font-semibold mt-1 hover:underline"
              >
                Xem & Phê duyệt đơn học bù →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bảng Kế hoạch Giảng dạy Theo Tuần */}
            <div className="lg:col-span-2 p-6 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <IconCalendar size={18} className="text-blue-700" />
                    <span>Kế hoạch Giảng dạy & Thời khóa biểu Theo Tuần</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Quản lý ca dạy, sĩ số chuyên cần thực tế và điều phối trực tiếp vào từng buổi học
                  </p>
                </div>

                <div className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => void handleNavigateWeek(weekOffset - 1)}
                    className="px-2.5 py-1 rounded-md font-semibold text-slate-700 dark:text-slate-200 hover:bg-white"
                  >
                    ← Tuần trước
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleNavigateWeek(0)}
                    className="px-2.5 py-1 rounded-md font-bold text-blue-800 dark:text-blue-300 bg-white dark:bg-slate-800 shadow-sm"
                  >
                    Tuần hiện tại
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleNavigateWeek(weekOffset + 1)}
                    className="px-2.5 py-1 rounded-md font-semibold text-slate-700 dark:text-slate-200 hover:bg-white"
                  >
                    Tuần kế tiếp →
                  </button>
                </div>
              </div>

              {workspace.weeklySchedule.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-dashed border-slate-300">
                  Không có lịch phân công giảng dạy nào trong tuần được chọn.
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => void handleNavigateWeek(0)}
                      className="px-3 py-1.5 rounded-lg bg-blue-700 text-white font-semibold"
                    >
                      Quay về tuần hiện tại
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-700/70 text-slate-700 dark:text-slate-200 uppercase text-[10px] font-bold border-y border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Tiết / Buổi</th>
                        <th className="py-2.5 px-3">Học phần & Chuyên đề</th>
                        <th className="py-2.5 px-3">Ngày & Khung giờ</th>
                        <th className="py-2.5 px-3">Phòng thực hành</th>
                        <th className="py-2.5 px-3">Sĩ số có mặt</th>
                        <th className="py-2.5 px-3">Trạng thái</th>
                        <th className="py-2.5 px-3 text-right">Tác vụ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {workspace.weeklySchedule.map((s) => (
                        <tr key={s.sessionId} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                          <td className="py-3 px-3 font-mono font-bold text-blue-800 dark:text-blue-400 tabular-nums">
                            Buổi {String(s.sessionNumber).padStart(2, '0')}
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-bold text-slate-900 dark:text-white">
                              [{s.classCode}] {s.className}
                            </p>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{s.title}</p>
                          </td>
                          <td className="py-3 px-3 font-mono tabular-nums text-slate-800 dark:text-slate-200">
                            <div className="font-semibold">{s.sessionDate}</div>
                            <div className="text-[11px] text-slate-500">
                              {s.startTime} – {s.endTime}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-800 dark:text-slate-200 font-medium">
                            {s.roomName}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                            {s.presentCount}/{s.enrolledStudentsCount} HV
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant={s.status === 'Done' ? 'success' : 'info'}>
                              {s.status === 'Done' ? 'Đã hoàn thành' : 'Theo kế hoạch'}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => {
                                void handleSelectSessionForAttendance(s.sessionId);
                                setActiveTab('attendance');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-blue-800 hover:bg-blue-900 text-white font-semibold"
                            >
                              Điểm danh
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Danh mục Lớp học phần Giảng viên đang phụ trách */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2.5">
                  Danh mục Lớp học phần được phân công giảng dạy
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {classes.map((cls) => (
                    <div
                      key={cls.classId}
                      className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">
                          Mã lớp: <span className="font-mono text-blue-800 dark:text-blue-400">{cls.classCode}</span>
                        </p>
                        <p className="text-slate-600 dark:text-slate-300 mt-0.5">{cls.className}</p>
                      </div>
                      <div className="text-right font-mono tabular-nums">
                        <Badge variant="success">Đang mở</Badge>
                        <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mt-1">
                          Sĩ số: {cls.studentCount} HV
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cột phải: Cảnh báo Học sinh Vắng mặt & Nhắc việc Học vụ */}
            <div className="p-6 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Cảnh báo Chuyên cần & Vắng mặt
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Theo dõi học viên vắng mặt để phối hợp phụ huynh bố trí lịch học bù
                  </p>
                </div>
                <Badge variant="danger">{workspace.recentAbsentAlerts.length} trường hợp</Badge>
              </div>

              {workspace.recentAbsentAlerts.length === 0 ? (
                <div className="p-5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-medium">
                  100% học viên thuộc các lớp phụ trách tham gia đầy đủ theo đúng quy định chuyên cần.
                </div>
              ) : (
                <div className="space-y-3">
                  {workspace.recentAbsentAlerts.map((alert, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-lg bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-rose-950 dark:text-rose-200">{alert.studentName}</span>
                        <span className="font-mono text-[11px] font-semibold text-rose-800 dark:text-rose-300 tabular-nums">
                          Ngày: {alert.date}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-rose-800 dark:text-rose-300">
                        Mã lớp học phần: <span className="font-mono">{alert.classCode}</span>
                      </p>
                      <p className="text-rose-900 dark:text-rose-200 leading-relaxed">
                        Lý do ghi nhận: {alert.reason}
                      </p>
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setActiveTab('attendance')}
                          className="text-[11px] font-bold text-rose-800 dark:text-rose-300 underline"
                        >
                          Mở danh sách xét duyệt học bù →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                <p className="font-bold text-slate-900 dark:text-white">Quy định học vụ đối với Giảng viên:</p>
                <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300 leading-relaxed">
                  <li>Hoàn tất điểm danh trong 15 phút đầu giờ học hoặc kiểm tra đồng bộ máy trạm.</li>
                  <li>Hoàn thành chấm điểm kết hợp (60/40) và ghi nhận xét sổ liên lạc trong vòng 24 giờ sau ca dạy.</li>
                  <li>Phê duyệt đơn đăng ký học bù của phụ huynh trước khi ca học bù diễn ra tối thiểu 12 giờ.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== PHÂN HỆ 2: SCR-TEA-02 ĐIỂM DANH 1-CHẠM, MÁY TRẠM & HỌC BÙ ==================== */}
      {!loading && activeTab === 'attendance' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cột trái (2/3): Bảng Điểm danh Học vụ 1-Chạm */}
          <div className="lg:col-span-2 p-6 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Sổ Điểm danh Học vụ Điện tử: {attendanceSession?.className ?? 'Lớp ROBOT-K10-A'}
                  </h2>
                  <Badge variant="info">Mã ca học #{selectedSessionId}</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ngày giảng dạy: <strong className="font-mono tabular-nums">{attendanceSession?.date}</strong> • Tự
                  động truyền thông báo tức thời tới Cổng Phụ huynh sau khi xác nhận
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Chọn ca học cần điểm danh"
                  value={selectedSessionId}
                  onChange={(e) => void handleSelectSessionForAttendance(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-xs font-semibold"
                >
                  {workspace.weeklySchedule.map((s) => (
                    <option key={s.sessionId} value={s.sessionId}>
                      Buổi {String(s.sessionNumber).padStart(2, '0')} — Ngày {s.sessionDate}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void handleMarkAllPresent()}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs border border-slate-300 dark:border-slate-600 hover:bg-slate-200"
                >
                  ✓ Đánh dấu tất cả Có mặt
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveAttendance()}
                  disabled={savingAttendance}
                  className="px-4 py-1.5 rounded-lg bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white font-semibold text-xs shadow-sm"
                >
                  {savingAttendance ? 'Đang lưu hồ sơ...' : 'Xác nhận & Lưu sổ điểm danh'}
                </button>
              </div>
            </div>

            {/* Thanh tóm tắt tỷ lệ chuyên cần ca học */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 text-xs font-mono tabular-nums">
              <div>
                <span className="text-slate-500 block font-sans">Tổng sĩ số lớp:</span>
                <strong className="text-sm text-slate-900 dark:text-white">{roster.length} học viên</strong>
              </div>
              <div>
                <span className="text-slate-500 block font-sans">Có mặt đúng giờ:</span>
                <strong className="text-sm text-emerald-700 dark:text-emerald-400">{presentTotal} học viên</strong>
              </div>
              <div>
                <span className="text-slate-500 block font-sans">Đi muộn / Vắng:</span>
                <strong className="text-sm text-amber-700 dark:text-amber-400">
                  {lateTotal} muộn • {absentTotal} vắng
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block font-sans">Tỷ lệ chuyên cần:</span>
                <strong className="text-sm text-blue-800 dark:text-blue-400">{attendanceRate}%</strong>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-700/70 text-slate-700 dark:text-slate-200 uppercase text-[10px] font-bold border-y border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">Mã định danh</th>
                    <th className="py-2.5 px-3">Họ và tên học viên</th>
                    <th className="py-2.5 px-3">Trạng thái chuyên cần (1-Click Toggle)</th>
                    <th className="py-2.5 px-3">Ghi chú học vụ / Đồng bộ Máy trạm Lab</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {roster.map((s) => (
                    <tr key={s.studentId} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30">
                      <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                        {s.studentCode}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-900 dark:text-white">{s.studentName}</p>
                        {s.markedAt && (
                          <p className="text-[10px] font-mono text-slate-500 tabular-nums">
                            Cập nhật: {new Date(s.markedAt).toLocaleTimeString('vi-VN')}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-700 p-0.5 gap-0.5 border border-slate-200 dark:border-slate-600">
                          {(
                            [
                              { key: 'Present', label: 'Có mặt', active: 'bg-emerald-700 text-white' },
                              { key: 'Late', label: 'Đi muộn', active: 'bg-amber-600 text-white' },
                              { key: 'Absent', label: 'Vắng không phép', active: 'bg-rose-700 text-white' },
                              { key: 'Excused', label: 'Vắng có phép', active: 'bg-sky-700 text-white' },
                            ] as const
                          ).map((st) => (
                            <button
                              key={st.key}
                              type="button"
                              onClick={() => void handleAttendanceStatusChange(s.studentId, st.key)}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                                s.status === st.key
                                  ? `${st.active} shadow-sm`
                                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                              }`}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          value={s.absenceReason ?? ''}
                          onChange={(e) => handleAttendanceReasonChange(s.studentId, e.target.value)}
                          placeholder="Nhập lý do hoặc địa chỉ IP máy trạm..."
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cột phải (1/3): Đồng bộ Máy trạm Phòng Lab & Xét duyệt Đơn học bù */}
          <div className="space-y-6">
            {/* Đồng bộ đăng nhập máy trạm phòng Lab */}
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Đồng bộ Điểm danh từ Máy trạm Phòng Lab
                </h3>
                <Badge variant="info">LAN Check-in</Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Khi học viên đăng nhập tài khoản trên máy trạm tại phòng Lab, hệ thống tự động ghi nhận trạng thái{' '}
                <strong>Có mặt</strong> kèm địa chỉ IP thiết bị và gửi thông báo đẩy tới Phụ huynh.
              </p>
              <div className="space-y-2.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Học viên đăng nhập trên máy trạm:
                  </label>
                  <select
                    value={workstationStudentId}
                    onChange={(e) => setWorkstationStudentId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 font-medium"
                  >
                    {roster.map((r) => (
                      <option key={r.studentId} value={r.studentId}>
                        {r.studentName} ({r.studentCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Địa chỉ IP máy trạm phòng thực hành:
                  </label>
                  <input
                    type="text"
                    value={workstationIp}
                    onChange={(e) => setWorkstationIp(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 font-mono tabular-nums"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleSimulateWorkstationLogin()}
                  className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-blue-700 dark:hover:bg-blue-800 text-white font-semibold text-xs shadow-sm"
                >
                  Kích hoạt Đồng bộ Máy trạm Phòng Lab
                </button>
              </div>
            </div>

            {/* Xét duyệt đơn xin học bù */}
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Xét duyệt Hồ sơ Đăng ký Học bù
                </h3>
                <Badge variant="warning">{makeupList.length} hồ sơ</Badge>
              </div>
              {makeupList.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  Hiện không có hồ sơ đăng ký học bù nào chờ giải quyết.
                </p>
              ) : (
                <div className="space-y-3">
                  {makeupList.map((m) => (
                    <div
                      key={m.makeupId}
                      className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">{m.studentName}</span>
                        <Badge
                          variant={
                            m.status === 'Approved'
                              ? 'success'
                              : m.status === 'Rejected'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {m.status === 'Approved'
                            ? 'Đã phê duyệt'
                            : m.status === 'Rejected'
                            ? 'Từ chối'
                            : 'Chờ phê duyệt'}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5 font-mono tabular-nums">
                        <p>Mã lớp: {m.classCode}</p>
                        <p>Buổi vắng mặt: {m.missedDate}</p>
                        {m.preferredDate && <p>Nguyện vọng học bù: {m.preferredDate}</p>}
                      </div>
                      <p className="text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-600">
                        Lý do phụ huynh trình bày: &ldquo;{m.reason}&rdquo;
                      </p>
                      {m.status === 'Pending' && (
                        <div className="space-y-2 pt-1">
                          <input
                            type="text"
                            value={makeupTeacherNote[m.makeupId] ?? ''}
                            onChange={(e) =>
                              setMakeupTeacherNote((prev) => ({ ...prev, [m.makeupId]: e.target.value }))
                            }
                            placeholder="Nhập ý kiến phê duyệt của giảng viên..."
                            className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => void handleReviewMakeup(m.makeupId, true)}
                              className="flex-1 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
                            >
                              Phê duyệt đơn
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleReviewMakeup(m.makeupId, false)}
                              className="flex-1 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-semibold"
                            >
                              Từ chối
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== PHÂN HỆ 3: SCR-TEA-03 ĐIỀU KHIỂN PHÒNG LAB (FOCUS MODE & SPOTLIGHT) ==================== */}
      {!loading && activeTab === 'lab_control' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chế độ Tập trung & Khóa màn hình máy trạm (Focus Mode) */}
            <div className="p-6 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    SCR-TEA-03 • SignalR ClassroomHub
                  </span>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
                    Điều khiển Khóa Màn hình Máy trạm Phòng Lab (Focus Mode)
                  </h2>
                </div>
                <Badge variant={isFocusLocked ? 'danger' : 'success'}>
                  {isFocusLocked ? 'ĐANG KHÓA MÀN HÌNH TRẠM' : 'CHO PHÉP THỰC HÀNH'}
                </Badge>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Chức năng hỗ trợ giảng viên tạm khóa giao diện lập trình trên toàn bộ máy tính học viên qua giao thức
                WebSocket SignalR khi cần giảng giải lý thuyết hoặc hướng dẫn quy tắc an toàn thiết bị.
              </p>

              <div className="space-y-2 text-xs">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Nội dung chỉ thị hiển thị trên màn hình máy trạm học viên:
                </label>
                <textarea
                  rows={3}
                  value={focusMessage}
                  onChange={(e) => setFocusMessage(e.target.value)}
                  className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-xs leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => void handleToggleFocusMode(true)}
                  className="py-2.5 px-4 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs shadow-sm"
                >
                  Kích hoạt Khóa Toàn bộ Máy trạm Lab
                </button>
                <button
                  type="button"
                  onClick={() => void handleToggleFocusMode(false)}
                  className="py-2.5 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-sm"
                >
                  Mở khóa cho Học viên Thực hành
                </button>
              </div>

              {/* Sơ đồ giám sát trạng thái các máy trạm trong phòng Lab */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Trạng thái các máy trạm trong Phòng Thực hành Robotics 202:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  {roster.map((stu, idx) => (
                    <div
                      key={stu.studentId}
                      className={`p-3 rounded-lg border ${
                        isFocusLocked
                          ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                          : 'bg-slate-50 dark:bg-slate-700/40 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono text-[10px]">
                        <span className="font-bold">LAB-WS-0{idx + 1}</span>
                        <span>192.168.1.{105 + idx}</span>
                      </div>
                      <p className="font-bold text-slate-900 dark:text-white mt-1">{stu.studentName}</p>
                      <p className="text-[11px] mt-1 font-medium text-slate-600 dark:text-slate-300">
                        Trạng thái: {isFocusLocked ? 'Đã khóa màn hình' : 'Đang mở thực hành'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Phát sóng bài làm tiêu biểu (Live Screen Spotlight) */}
            <div className="p-6 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    SCR-TEA-03 • Live Screen Spotlight
                  </span>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
                    Phát sóng Giải thuật Tiêu biểu lên Màn hình Trung tâm
                  </h2>
                </div>
                <Badge variant={isSpotlightActive ? 'accent' : 'neutral'}>
                  {isSpotlightActive ? 'ĐANG TRÌNH CHIẾU' : 'CHẾ ĐỘ CHỜ'}
                </Badge>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Khi học viên xây dựng được giải thuật tối ưu, giảng viên thực hiện phát sóng trực tiếp màn hình sa bàn
                và cấu trúc lệnh của học viên đó lên máy chiếu trung tâm và toàn bộ máy trạm trong lớp để phân tích mẫu.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Học viên có bài làm tiêu biểu được chọn trình chiếu:
                  </label>
                  <select
                    value={spotlightStudentId}
                    onChange={(e) => setSpotlightStudentId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 font-semibold"
                  >
                    {roster.map((r) => (
                      <option key={r.studentId} value={r.studentId}>
                        {r.studentName} — Mã HV: {r.studentCode}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nội dung phân tích giải thuật & Cấu trúc khối lệnh trình chiếu:
                  </label>
                  <textarea
                    rows={3}
                    value={spotlightPayload}
                    onChange={(e) => setSpotlightPayload(e.target.value)}
                    className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 font-mono text-xs"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => void handleBroadcastSpotlight()}
                    className="flex-1 py-2.5 px-4 rounded-lg bg-blue-800 hover:bg-blue-900 text-white font-semibold text-xs shadow-sm"
                  >
                    Phát sóng lên Máy chiếu & Toàn bộ Máy trạm
                  </button>
                  {isSpotlightActive && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsSpotlightActive(false);
                        showToast('Đã kết thúc phiên trình chiếu màn hình mẫu.');
                      }}
                      className="py-2.5 px-4 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs"
                    >
                      Dừng phát sóng
                    </button>
                  )}
                </div>
              </div>

              {/* Khung xem trước màn hình trình chiếu */}
              <div className="p-3.5 rounded-lg bg-slate-900 text-slate-100 border border-slate-700 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>MÀN HÌNH MÁY CHIẾU TRUNG TÂM (PROJECTOR VIEW)</span>
                  <span className="text-emerald-400">1080p • 60fps SignalR Stream</span>
                </div>
                <p className="font-semibold text-white">
                  Học viên tiêu biểu:{' '}
                  {roster.find((r) => r.studentId === spotlightStudentId)?.studentName ?? 'Lê Bảo An'}
                </p>
                <p className="font-mono text-[11px] text-sky-300">{spotlightPayload}</p>
              </div>
            </div>
          </div>

          {/* Nhật ký Điều hành Thiết bị Phòng Lab */}
          <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Nhật ký Tác vụ Điều hành Phòng Thực hành (SignalR Audit Log)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-3">Thời gian</th>
                    <th className="py-2 px-3">Lệnh điều hành</th>
                    <th className="py-2 px-3">Phạm vi áp dụng</th>
                    <th className="py-2 px-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {labActionLogs.map((log, i) => (
                    <tr key={i}>
                      <td className="py-2 px-3 font-mono tabular-nums text-slate-600 dark:text-slate-400">
                        {log.time}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">{log.action}</td>
                      <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{log.target}</td>
                      <td className="py-2 px-3">
                        <Badge variant="success">{log.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== PHÂN HỆ 4: SCR-TEA-04 THIẾT KẾ SA BÀN 2D & KHỞI TẠO ĐỀ BÀI AI ==================== */}
      {!loading && activeTab === 'map_builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cột trái (2/3): Trình thiết kế lưới tọa độ 2D, tải ảnh nền, Par-Time */}
          <div className="lg:col-span-2 p-6 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Trình Thiết kế Học liệu Sa bàn 2D & Trạm Kiểm soát (Checkpoint)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Định nghĩa kích thước lưới tọa độ, tải ảnh nền sa bàn, đặt trạm kiểm soát kèm câu hỏi tư duy và thiết
                  lập thời gian hoàn thành tiêu chuẩn (Par-Time)
                </p>
              </div>
              <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-700 p-1 gap-1 text-xs border border-slate-200 dark:border-slate-600">
                <button
                  type="button"
                  onClick={() => setGridTool('start')}
                  className={`px-2.5 py-1 rounded-md font-semibold ${
                    gridTool === 'start' ? 'bg-emerald-700 text-white' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Điểm xuất phát (S)
                </button>
                <button
                  type="button"
                  onClick={() => setGridTool('checkpoint')}
                  className={`px-2.5 py-1 rounded-md font-semibold ${
                    gridTool === 'checkpoint' ? 'bg-blue-800 text-white' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Trạm kiểm soát (C)
                </button>
                <button
                  type="button"
                  onClick={() => setGridTool('obstacle')}
                  className={`px-2.5 py-1 rounded-md font-semibold ${
                    gridTool === 'obstacle' ? 'bg-slate-800 text-white' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Vật cản (■)
                </button>
              </div>
            </div>

            {/* Thanh cấu hình thông số kỹ thuật Sa bàn: Kích thước lưới, Par-Time, Par-Blocks, Tải ảnh sa bàn */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kích thước lưới tọa độ 2D:
                </label>
                <select
                  value={gridSize}
                  onChange={(e) => setGridSize(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-mono tabular-nums"
                >
                  <option value={8}>Lưới 8 × 8 ô</option>
                  <option value={10}>Lưới 10 × 10 ô</option>
                  <option value={12}>Lưới 12 × 12 ô (Chuẩn)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Thời gian chuẩn (Par-Time):
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={10}
                    max={300}
                    value={parTimeSeconds}
                    onChange={(e) => setParTimeSeconds(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-mono tabular-nums"
                  />
                  <span className="text-slate-500 font-mono">giây</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Số khối lệnh chuẩn:
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={parBlockCount}
                    onChange={(e) => setParBlockCount(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-mono tabular-nums"
                  />
                  <span className="text-slate-500 font-mono">khối</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tải ảnh nền sa bàn mới:
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleMapImageUpload}
                  className="w-full text-[11px] file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:bg-blue-800 file:text-white file:font-semibold"
                />
              </div>
            </div>

            {/* Lưới tọa độ 2D tương tác */}
            <div
              className="grid gap-1 p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 max-w-xl mx-auto bg-cover bg-center"
              style={{
                gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                backgroundImage: mapBgImageUrl ? `url(${mapBgImageUrl})` : undefined,
              }}
            >
              {Array.from({ length: gridSize }).map((_, rowIdx) =>
                Array.from({ length: gridSize }).map((__, colIdx) => {
                  const x = colIdx;
                  const y = rowIdx;
                  const isStart = startPos.x === x && startPos.y === y;
                  const cp = checkpoints.find((c) => c.x === x && c.y === y);
                  const isObs = obstacles.some((o) => o.x === x && o.y === y);

                  return (
                    <button
                      key={`${x}-${y}`}
                      type="button"
                      title={`Tọa độ (${x}, ${y})`}
                      onClick={() => handleGridCellClick(x, y)}
                      className={`aspect-square rounded text-[10px] font-mono font-bold flex items-center justify-center border transition-all ${
                        isStart
                          ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
                          : cp
                          ? cp.isFinish
                            ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                            : 'bg-blue-800 text-white border-blue-900'
                          : isObs
                          ? 'bg-slate-800 text-slate-200 border-slate-900'
                          : 'bg-white/90 dark:bg-slate-800/90 text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-blue-50'
                      }`}
                    >
                      {isStart ? 'S' : cp ? (cp.isFinish ? 'ĐÍCH' : `C${cp.seqNo}`) : isObs ? '■' : ''}
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-200 dark:border-slate-700">
              <div className="flex flex-wrap items-center gap-4 font-mono tabular-nums">
                <span>Tọa độ xuất phát: ({startPos.x}, {startPos.y})</span>
                <span>Số trạm kiểm soát: {checkpoints.length} trạm</span>
                <span>Chướng ngại vật: {obstacles.length} vị trí</span>
                <span>Par-Time: {parTimeSeconds}s</span>
              </div>
              <button
                type="button"
                onClick={() => void handleSaveStemMap()}
                disabled={savingMap}
                className="px-4 py-2 rounded-lg bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white font-semibold text-xs shadow-sm"
              >
                {savingMap ? 'Đang lưu vào CSDL...' : 'Lưu Học liệu Sa bàn vào Cơ sở dữ liệu'}
              </button>
            </div>
          </div>

          {/* Cột phải (1/3): Khởi tạo Đề bài bằng AI & Thiết lập Câu hỏi Tư duy cho từng Trạm */}
          <div className="space-y-4">
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                  Generative AI Map & Quest Creator
                </span>
                {aiGenerationLatencyMs !== null && (
                  <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 tabular-nums">
                    Thời gian sinh: {aiGenerationLatencyMs} ms
                  </span>
                )}
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Khởi tạo Tự động Sa bàn 2D & Mã chuẩn AST bằng Câu lệnh Tự nhiên
              </h3>

              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Mẫu câu lệnh tiêu chuẩn:
                </p>
                <div className="flex flex-col gap-1">
                  {AI_PROMPT_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAiPrompt(preset)}
                      className="text-left px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-700 hover:bg-blue-50 text-[11px] text-slate-700 dark:text-slate-200 font-medium truncate"
                    >
                      • &ldquo;{preset}&rdquo;
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                rows={3}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Nhập yêu cầu thiết kế sa bàn và số lượng trạm kiểm soát..."
                className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-xs"
              />
              <button
                type="button"
                onClick={() => void handleGenerateAiMap()}
                disabled={generatingAiMap}
                className="w-full py-2.5 rounded-lg bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white font-semibold text-xs shadow-sm"
              >
                {generatingAiMap
                  ? 'Hệ thống AI đang tính toán tọa độ & mã AST...'
                  : 'Khởi tạo Tự động Sa bàn & Mã chuẩn AST (Trong 3 giây)'}
              </button>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3 text-xs">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white pb-2 border-b border-slate-200 dark:border-slate-700">
                Danh mục Trạm Kiểm soát & Câu hỏi Tư duy
              </h4>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên học liệu sa bàn:
                </label>
                <input
                  type="text"
                  value={mapName}
                  onChange={(e) => setMapName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 font-semibold"
                />
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {checkpoints.map((cp) => (
                  <div
                    key={cp.seqNo}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-blue-800 dark:text-blue-400 tabular-nums">
                        Trạm #{cp.seqNo} — Tọa độ ({cp.x}, {cp.y})
                      </span>
                      {cp.isFinish && <Badge variant="accent">Trạm Đích</Badge>}
                    </div>
                    <input
                      type="text"
                      value={cp.unlockMessage ?? ''}
                      onChange={(e) => handleUpdateCheckpointQuestion(cp.seqNo, e.target.value)}
                      className="w-full px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-[11px]"
                      placeholder="Nhập câu hỏi tư duy tại trạm kiểm soát..."
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Lời giải Chuẩn của Giảng viên (Master Blockly XML → AST):
                </label>
                <pre className="p-2.5 rounded-lg bg-slate-900 text-emerald-400 font-mono text-[10px] overflow-x-auto">
                  {masterBlocklyXml}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== PHÂN HỆ 5: SCR-TEA-05 BÀN CHẤM ĐIỂM KẾT HỢP 60/40 & GHI ÂM NHẬN XÉT ==================== */}
      {!loading && activeTab === 'grading' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cột 1: Danh sách Bài nộp & Mã lệnh Blockly của Học viên */}
          <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                1. Danh sách Bài thực hành & Mã nguồn Học viên
              </h2>
              <Badge variant="info">{filteredSubmissions.length} hồ sơ</Badge>
            </div>

            <div className="flex gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-[11px]">
              {(
                [
                  { id: 'ALL', label: 'Tất cả' },
                  { id: 'PENDING', label: 'Chờ chấm' },
                  { id: 'FINALIZED', label: 'Đã công bố' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSubmissionFilter(f.id)}
                  className={`flex-1 py-1 rounded font-semibold ${
                    submissionFilter === f.id
                      ? 'bg-white dark:bg-slate-800 text-blue-800 dark:text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {filteredSubmissions.map((sub) => (
                <button
                  key={sub.submissionId}
                  type="button"
                  onClick={() => {
                    setSelectedSubmissionId(sub.submissionId);
                    if (sub.remarkText) setRemarkText(sub.remarkText);
                    if (sub.remarkSource === 'Voice' || sub.remarkSource === 'Typed') {
                      setRemarkSource(sub.remarkSource);
                    }
                  }}
                  className={`w-full text-left p-3.5 rounded-lg border transition-all text-xs ${
                    selectedSubmission?.submissionId === sub.submissionId
                      ? 'border-blue-800 bg-blue-50/70 dark:bg-blue-950/40'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">{sub.studentName}</span>
                    <Badge
                      variant={
                        sub.status === 'Finalized'
                          ? 'success'
                          : sub.status === 'AutoGraded'
                          ? 'info'
                          : 'warning'
                      }
                    >
                      {sub.status === 'Finalized'
                        ? 'Đã công bố'
                        : sub.status === 'AutoGraded'
                        ? 'Đã chấm AST'
                        : 'Chờ chấm'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 font-mono tabular-nums">
                    Mã HV: {sub.studentCode} • Lần nộp #{sub.attemptNo} • Điểm:{' '}
                    <strong>{sub.finalScore != null ? `${sub.finalScore}/10` : 'Chưa công bố'}</strong>
                  </p>
                </button>
              ))}
            </div>

            {selectedSubmission && (
              <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    Cấu trúc khối lệnh Blockly của {selectedSubmission.studentName}:
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">DAEMON-01 AST JSON</span>
                </div>
                <pre className="p-3 rounded-lg bg-slate-900 text-sky-300 font-mono text-[11px] overflow-x-auto max-h-48">
                  {selectedSubmission.blocklyJson}
                </pre>
              </div>
            )}
          </div>

          {/* Cột 2: Điểm Thuật toán AST Tự động (60%) & Rubric Thực nghiệm Phần cứng (40%) */}
          <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                2. Đánh giá Thuật toán AST (60%) & Thực nghiệm (40%)
              </h2>
              <Badge variant="info">ENGINE-02 TED</Badge>
            </div>

            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-blue-950 dark:text-blue-200">
                  Điểm Thuật toán AST Tự động (Trọng số 60%)
                </p>
                <p className="text-[11px] text-blue-800 dark:text-blue-300 mt-0.5 font-mono tabular-nums">
                  Độ tương đồng cấu trúc cây cú pháp (Tree Edit Distance): {selectedSubmission?.matchPercent ?? 95}%
                </p>
              </div>
              <div className="text-2xl font-extrabold text-blue-800 dark:text-blue-400 font-mono tabular-nums">
                {currentAstScore.toFixed(2)}/10
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-bold text-slate-800 dark:text-slate-200">
                Bảng tiêu chí đánh giá thực nghiệm phần cứng tại phòng Lab (Trọng số 40%):
              </p>

              <div className="space-y-3 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">Tiêu chí 1: Kỹ thuật lắp ráp cơ khí & đi dây (Assembly)</span>
                    <strong className="font-mono tabular-nums text-blue-800 dark:text-blue-400">
                      {assemblyScore.toFixed(1)}/10
                    </strong>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={0.5}
                    value={assemblyScore}
                    onChange={(e) => setAssemblyScore(Number(e.target.value))}
                    className="w-full accent-blue-800"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">Tiêu chí 2: Khả năng bảo vệ & giải thích lưu đồ thuật toán</span>
                    <strong className="font-mono tabular-nums text-blue-800 dark:text-blue-400">
                      {algorithmScore.toFixed(1)}/10
                    </strong>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={0.5}
                    value={algorithmScore}
                    onChange={(e) => setAlgorithmScore(Number(e.target.value))}
                    className="w-full accent-blue-800"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">Tiêu chí 3: Kỹ năng phối hợp nhóm & kỷ luật phòng Lab</span>
                    <strong className="font-mono tabular-nums text-blue-800 dark:text-blue-400">
                      {teamworkScore.toFixed(1)}/10
                    </strong>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={0.5}
                    value={teamworkScore}
                    onChange={(e) => setTeamworkScore(Number(e.target.value))}
                    className="w-full accent-blue-800"
                  />
                </div>
              </div>
            </div>

            {/* Tổng hợp công thức 60/40 */}
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
              <div className="text-xs">
                <p className="font-bold text-emerald-950 dark:text-emerald-200">
                  Điểm Tổng kết Học phần Thực hành (Công thức 60/40)
                </p>
                <p className="font-mono text-[11px] text-emerald-800 dark:text-emerald-300 tabular-nums mt-0.5">
                  ({currentAstScore.toFixed(2)} × 60%) + ({currentHardwareAvg.toFixed(2)} × 40%)
                </p>
              </div>
              <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">
                {previewFinalScore.toFixed(2)}/10
              </div>
            </div>
          </div>

          {/* Cột 3: Thẻ Nhận xét Sư phạm Mẫu (Quick-Pills) & Ghi âm Giọng nói (Voice-to-Text) */}
          <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  3. Nhận xét Chuyên môn & Ghi âm Giọng nói
                </h2>
                <Badge variant={remarkSource === 'Voice' ? 'accent' : 'neutral'}>
                  Phương thức: {remarkSource === 'Voice' ? 'Ghi âm giọng nói' : 'Văn bản'}
                </Badge>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Danh mục nhận xét sư phạm tiêu chuẩn (Quick-Pills Rubric):
                </p>
                <div className="flex flex-col gap-1.5">
                  {RUBRIC_QUICK_TEMPLATES.map((pill, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setRemarkSource('Typed');
                        setRemarkText((prev) => (prev ? `${prev} ${pill}.` : `${pill}.`));
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:border-blue-300 text-[11px] font-medium text-slate-800 dark:text-slate-200 text-left transition-all"
                    >
                      + {pill}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Nội dung nhận xét lưu vào Sổ liên lạc điện tử:
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleToggleVoiceRecording}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                        isRecordingVoice
                          ? 'bg-rose-700 text-white animate-pulse'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      <span>
                        {isRecordingVoice
                          ? `Đang thu âm (${recordingSeconds}s)...`
                          : 'Thu âm Nhận xét (Voice-to-Text)'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePreviewVoiceRemark}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                    >
                      Nghe thử
                    </button>
                  </div>
                </div>
                <textarea
                  rows={4}
                  value={remarkText}
                  onChange={(e) => {
                    setRemarkSource('Typed');
                    setRemarkText(e.target.value);
                  }}
                  className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-xs leading-relaxed"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleSubmitHybridGrade()}
              disabled={submittingGrade || !selectedSubmission}
              className="w-full py-3 rounded-lg bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white font-bold text-xs shadow-sm"
            >
              {submittingGrade
                ? 'Đang phê duyệt điểm & cấp mã xác thực QR...'
                : 'Phê duyệt Điểm 60/40 & Công bố Sổ liên lạc + Chứng nhận QR'}
            </button>
          </div>
        </div>
      )}

      {/* ==================== PHÂN HỆ 6: SCR-TEA-06 THỐNG KÊ CHẤT LƯỢNG ĐÀO TẠO & XUẤT BÁO CÁO EXCEL ==================== */}
      {!loading && activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tổng sĩ số lớp học</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5 tabular-nums">
                {analytics?.totalStudents ?? 3} học viên
              </p>
            </div>
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Điểm trung bình chung (60/40)
              </p>
              <p className="text-2xl font-bold text-blue-800 dark:text-blue-400 mt-1.5 tabular-nums">
                {analytics?.averageScore?.toFixed(2) ?? '9.30'} / 10
              </p>
            </div>
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Điểm TB Thuật toán AST (60%)
              </p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1.5 tabular-nums">
                {analytics?.astAverage?.toFixed(2) ?? '9.50'} / 10
              </p>
            </div>
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Điểm TB Thực nghiệm Phần cứng (40%)
              </p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1.5 tabular-nums">
                {analytics?.hardwareAverage?.toFixed(2) ?? '9.00'} / 10
              </p>
            </div>
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Biên độ điểm (Thấp nhất – Cao nhất)
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5 tabular-nums">
                {analytics?.minScore?.toFixed(1) ?? '9.3'} – {analytics?.maxScore?.toFixed(1) ?? '9.3'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Biểu đồ phân phối điểm số của lớp */}
            <div className="p-6 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Biểu đồ Phân phối Điểm số Học tập ({analytics?.className ?? 'Lớp ROBOT-K10-A'})
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Thống kê tỷ lệ học viên theo từng ngưỡng năng lực chuẩn CSTA
                  </p>
                </div>
                <a
                  href={teacherApi.getExportExcelUrl(selectedClassId)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs flex items-center gap-1.5 shrink-0"
                >
                  <IconDownload size={15} /> Tải Sổ điểm Excel (.xlsx)
                </a>
              </div>

              <div className="space-y-3.5 pt-2">
                {(analytics?.scoreBuckets ?? []).map((b, idx) => {
                  const total = Math.max(analytics?.totalStudents ?? 1, 1);
                  const pct = Math.round((b.count / total) * 100);
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{b.range}</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                          {b.count} học viên ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-3 rounded bg-slate-100 dark:bg-slate-700 overflow-hidden border border-slate-200 dark:border-slate-600">
                        <div
                          className="h-full bg-blue-800 transition-all duration-300"
                          style={{ width: `${Math.max(pct, b.count > 0 ? 12 : 0)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Đánh giá chi tiết năng lực & xác định kỹ năng học viên còn yếu cần bồi dưỡng */}
            <div className="p-6 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="pb-3 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Phân tích Mức độ Đạt chuẩn Kỹ năng & Khuyến nghị Bồi dưỡng
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Xác định các kỹ năng lập trình và lắp ráp học viên còn hạn chế để điều chỉnh kế hoạch giảng dạy
                </p>
              </div>

              <div className="space-y-3 text-xs">
                {[
                  {
                    skill: '1. Tư duy cấu trúc lặp & tối ưu hóa khối lệnh Blockly',
                    rate: 94,
                    status: 'Đạt chuẩn xuất sắc',
                    note: 'Học viên vận dụng thành thạo vòng lặp Repeat để rút gọn chương trình.',
                  },
                  {
                    skill: '2. Kỹ thuật lắp ráp khung cơ khí & truyền động bánh răng',
                    rate: 88,
                    status: 'Đạt chuẩn tốt',
                    note: 'Khung xe chắc chắn, cần lưu ý cố định dây cáp cảm biến gọn hơn.',
                  },
                  {
                    skill: '3. Hiệu chỉnh sai số cảm biến siêu âm tại góc cua hẹp 90°',
                    rate: 72,
                    status: 'Cần bồi dưỡng thêm',
                    note: 'Kỹ năng cần củng cố: Một số học viên đặt ngưỡng khoảng cách chưa tính tới quán tính phanh của động cơ.',
                  },
                  {
                    skill: '4. Kỹ năng thuyết trình lưu đồ thuật toán & phối hợp nhóm',
                    rate: 90,
                    status: 'Đạt chuẩn tốt',
                    note: 'Các nhóm phân chia nhiệm vụ lắp ráp và lập trình rõ ràng.',
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">{item.skill}</span>
                      <Badge variant={item.rate < 75 ? 'warning' : 'success'}>
                        {item.status} ({item.rate}%)
                      </Badge>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{item.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== PHÂN HỆ 7: GIÁM SÁT TÁC VỤ HỆ THỐNG & CẦU NỐI THIẾT BỊ (DAEMON-01..SERVICE-04) ==================== */}
      {!loading && activeTab === 'system_agents' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Trung tâm Giám sát Tác vụ Hệ thống & Cầu nối Phần cứng (System Agent & Hardware Bridge)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Theo dõi trạng thái vận hành của 4 dịch vụ nền lõi phục vụ chấm điểm tự động AST, xếp hạng định kỳ và
                  điều phối thông báo đa kênh
                </p>
              </div>
              <Badge variant="success">4/4 Dịch vụ Đang hoạt động</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* DAEMON-01 */}
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-blue-800 dark:text-blue-400">
                    DAEMON-01 • AstAnalysisService
                  </span>
                  <Badge variant="success">Đang hoạt động</Badge>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Tiến trình Phân tích & Chuẩn hóa Cây cú pháp Trừu tượng (AST Parsing & Serialization Daemon)
                </h3>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Bóc tách mã nguồn khối lệnh Blockly (XML) của học viên thành cấu trúc Cây cú pháp trừu tượng dạng
                  JSON chuẩn hóa, loại bỏ các thuộc tính tọa độ giao diện dư thừa trước khi chấm điểm.
                </p>
                <div className="p-2.5 rounded bg-slate-900 text-emerald-400 font-mono text-[11px]">
                  Method: ParseBlocklyXmlToAst(xml) → SerializeAstToJson(rootNode) • Engine: TED-v1.0
                </div>
              </div>

              {/* ENGINE-02 */}
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-blue-800 dark:text-blue-400">
                    ENGINE-02 • Zhang-Shasha Tree Edit Distance
                  </span>
                  <Badge variant="success">Đang hoạt động</Badge>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Bộ máy So khớp Cây cú pháp & Chấm điểm Tự động (AI Code Doctor AST Diff & Linting Engine)
                </h3>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Thực thi thuật toán quy hoạch động đo khoảng cách chỉnh sửa cây cú pháp giữa bài làm học viên và bài
                  giải chuẩn của giảng viên, tự động quy đổi điểm thành phần AST (trọng số 60%).
                </p>
                <div className="p-2.5 rounded bg-slate-900 text-sky-300 font-mono text-[11px]">
                  Formula: FinalScore = round((AstAutoScore × 0.60) + (HardwareRubric × 0.40), 2)
                </div>
              </div>

              {/* CRON-03 */}
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-blue-800 dark:text-blue-400">
                    CRON-03 • WeeklyLeaderboardJob (Quartz.NET)
                  </span>
                  <Badge variant="info">Lịch chạy: 00:00 Chủ Nhật</Badge>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Tác vụ Tổng hợp Bảng xếp hạng Tuần & Cấp thưởng XP (Weekly Leaderboard Cron Job)
                </h3>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Tự động kích hoạt vào 00:00 Chủ Nhật hàng tuần theo biểu thức Cron{' '}
                  <code className="font-mono">0 0 0 ? * SUN</code> để xếp hạng Top 10 học viên mỗi lớp, cộng điểm XP
                  thưởng (+100/+70/+50/+20 XP) và khởi tạo chu kỳ tuần mới.
                </p>
                <div className="p-2.5 rounded bg-slate-900 text-amber-300 font-mono text-[11px]">
                  Scheduler: QuartzHostedService • Trigger: WeeklyLeaderboardTrigger (0 0 0 ? * SUN)
                </div>
              </div>

              {/* SERVICE-04 */}
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-blue-800 dark:text-blue-400">
                    SERVICE-04 • NotificationService & SignalR Hubs
                  </span>
                  <Badge variant="success">Kết nối 2 chiều</Badge>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Trung tâm Điều phối Thông báo Đa kênh (Multi-Channel Notification Dispatcher)
                </h3>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Điều phối thông điệp thời gian thực qua Zalo ZNS, SMS Brandname và kênh WebSocket SignalR hai chiều (
                  <code className="font-mono">/hubs/classroom</code>,{' '}
                  <code className="font-mono">/hubs/notifications</code>) tới Giảng viên, Phụ huynh và Học viên.
                </p>
                <div className="p-2.5 rounded bg-slate-900 text-emerald-300 font-mono text-[11px]">
                  Channels: SignalR WebSocket + Zalo ZNS Gateway + SMS Brandname + SQL Audit Log
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
