import React, { useState, useEffect, useCallback, useRef } from 'react';
import { IconCalendar, IconDownload } from '@teky/shared';
import { Badge } from '@teky/shared';
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
} from '@teky/shared';

type TeacherTab = 'workspace' | 'attendance' | 'lab_control' | 'map_builder' | 'grading' | 'analytics';

const QUICK_PILLS = [
  'Lắp ráp khung cơ khí chắc chắn, gọn dây',
  'Giải thích lưu đồ thuật toán rõ ràng, mạch lạc',
  'Biết dùng vòng lặp tối ưu số khối lệnh Blockly',
  'Hỗ trợ bạn cùng nhóm xử lý lỗi cảm biến',
  'Cần kiểm tra lại góc quay động cơ servo 90°',
];

const FALLBACK_WORKSPACE: TeacherWorkspaceDto = {
  teacherId: 1,
  teacherName: 'Nguyễn Văn Nam',
  pendingTaskCount: 2,
  activeClassesCount: 1,
  weeklySchedule: [
    {
      sessionId: 6,
      classId: 3,
      classCode: 'ROBOT-K10-A',
      className: 'Lớp STEM Robot Sáng Tạo K10-A',
      sessionNumber: 2,
      title: 'Buổi học thực hành sa bàn cảm biến',
      sessionDate: '2026-11-13',
      startTime: '14:00',
      endTime: '16:00',
      roomName: 'Lab Robotics 202',
      status: 'Scheduled',
      enrolledStudentsCount: 3,
      presentCount: 3,
    },
    {
      sessionId: 5,
      classId: 3,
      classCode: 'ROBOT-K10-A',
      className: 'Lớp STEM Robot Sáng Tạo K10-A',
      sessionNumber: 1,
      title: 'Buổi học nhập môn động cơ & cảm biến',
      sessionDate: '2026-11-11',
      startTime: '08:30',
      endTime: '10:30',
      roomName: 'Lab Robotics 202',
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
      reason: 'Gia đình báo con bị sốt, xin học bù',
    },
  ],
};

export const TeacherDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TeacherTab>('workspace');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // SCR-TEA-01 Workspace & Classes
  const [workspace, setWorkspace] = useState<TeacherWorkspaceDto>(FALLBACK_WORKSPACE);
  const [classes, setClasses] = useState<TeacherClassSummaryDto[]>([
    { classId: 3, classCode: 'ROBOT-K10-A', className: 'Lớp STEM Robot Sáng Tạo K10-A', status: 'Open', studentCount: 3 },
  ]);
  const [selectedClassId, setSelectedClassId] = useState<number>(3);
  const [selectedSessionId, setSelectedSessionId] = useState<number>(6);

  // SCR-TEA-02 Attendance & Makeup
  const [attendanceSession, setAttendanceSession] = useState<ClassAttendanceSessionDto | null>(null);
  const [roster, setRoster] = useState<StudentAttendanceItemDto[]>([]);
  const [savingAttendance, setSavingAttendance] = useState<boolean>(false);
  const [makeupList, setMakeupList] = useState<MakeupRequestItemDto[]>([]);
  const [workstationStudentId, setWorkstationStudentId] = useState<number>(2);
  const [workstationIp, setWorkstationIp] = useState<string>('192.168.1.108');

  // SCR-TEA-03 Classroom Focus Mode & Spotlight
  const [isFocusLocked, setIsFocusLocked] = useState<boolean>(false);
  const [focusMessage, setFocusMessage] = useState<string>(
    'Các con tạm dừng bàn phím và nhìn lên màn hình máy chiếu để nghe thầy giải thích thuật toán nhé!'
  );
  const [spotlightStudentId, setSpotlightStudentId] = useState<number>(2);
  const [spotlightPayload, setSpotlightPayload] = useState<string>(
    'Giải thuật dùng 1 vòng lặp Repeat(4) kết hợp cảm biến siêu âm < 15cm chỉ với 7 khối lệnh Blockly!'
  );

  // SCR-TEA-04 STEM Map Builder & Generative AI
  const [mapName, setMapName] = useState<string>('Sa bàn Mê Cung Rừng Nhiệt Đới');
  const [mapTheme, setMapTheme] = useState<string>('JungleExpedition');
  const [startPos, setStartPos] = useState<{ x: number; y: number }>({ x: 1, y: 1 });
  const [obstacles, setObstacles] = useState<{ x: number; y: number }[]>([
    { x: 3, y: 3 },
    { x: 3, y: 4 },
    { x: 6, y: 5 },
    { x: 7, y: 8 },
  ]);
  const [checkpoints, setCheckpoints] = useState<CreateMapCheckpointDto[]>([
    { seqNo: 1, x: 4, y: 2, unlockMessage: 'Trạm 1: Khởi động cảm biến siêu âm!', isFinish: false },
    { seqNo: 2, x: 7, y: 6, unlockMessage: 'Trạm 2: Vượt qua hẻm núi đá!', isFinish: false },
    { seqNo: 3, x: 10, y: 10, unlockMessage: 'Đích đến: Giải cứu trạm nghiên cứu thành công!', isFinish: true },
  ]);
  const [gridTool, setGridTool] = useState<'obstacle' | 'checkpoint' | 'start'>('checkpoint');
  const [aiPrompt, setAiPrompt] = useState<string>(
    'Tạo sa bàn mê cung chủ đề Khám Phá Sao Hỏa với 3 trạm Checkpoint và chướng ngại vật'
  );
  const [masterBlocklyXml, setMasterBlocklyXml] = useState<string>(
    '<xml><block type="robot_start"><next><block type="robot_move_forward"><field name="STEPS">4</field></block></next></block></xml>'
  );
  const [generatingAiMap, setGeneratingAiMap] = useState<boolean>(false);
  const [savingMap, setSavingMap] = useState<boolean>(false);

  // SCR-TEA-05 Hybrid Practical Grading Studio & Voice-to-Text
  const [submissions, setSubmissions] = useState<GradingQueueItemDto[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null);
  const [assemblyScore, setAssemblyScore] = useState<number>(9.0);
  const [algorithmScore, setAlgorithmScore] = useState<number>(9.0);
  const [teamworkScore, setTeamworkScore] = useState<number>(9.5);
  const [remarkText, setRemarkText] = useState<string>(
    'Con nắm chắc cấu trúc lặp và điều kiện cảm biến, lắp khung xe cân đối.'
  );
  const [remarkSource, setRemarkSource] = useState<'Typed' | 'Voice'>('Typed');
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const [submittingGrade, setSubmittingGrade] = useState<boolean>(false);
  const recognitionRef = useRef<{ stop?: () => void } | null>(null);

  // SCR-TEA-06 Class Analytics & Excel Export
  const [analytics, setAnalytics] = useState<ClassPerformanceAnalyticsDto | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
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
          ? `${err.message} — Đang hiển thị dữ liệu dự phòng để bạn kiểm thử giao diện.`
          : 'Không thể kết nối Backend .NET.'
      );
      setRoster([
        {
          attendanceId: 6,
          studentId: 2,
          studentCode: 'TEKY-STU-001',
          studentName: 'Lê Bảo An',
          status: 'Present',
          absenceReason: 'Tự động check-in máy trạm IP: 192.168.1.105',
        },
        {
          attendanceId: 7,
          studentId: 3,
          studentCode: 'TEKY-STU-002',
          studentName: 'Trần Thị Mai',
          status: 'Present',
        },
        {
          attendanceId: 8,
          studentId: 4,
          studentCode: 'TEKY-STU-003',
          studentName: 'Nguyễn Minh Trí',
          status: 'Late',
          absenceReason: 'Đến muộn 10 phút',
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

  const handleSelectSessionForAttendance = async (sessionId: number) => {
    setSelectedSessionId(sessionId);
    try {
      const att = await teacherApi.getSessionAttendance(sessionId);
      setAttendanceSession(att);
      setRoster(att.students);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không tải được danh sách điểm danh.');
    }
  };

  const handleAttendanceStatusChange = (studentId: number, status: StudentAttendanceItemDto['status']) => {
    setRoster((prev) => prev.map((s) => (s.studentId === studentId ? { ...s, status } : s)));
  };

  const handleAttendanceReasonChange = (studentId: number, absenceReason: string) => {
    setRoster((prev) => prev.map((s) => (s.studentId === studentId ? { ...s, absenceReason } : s)));
  };

  const handleMarkAllPresent = () => {
    setRoster((prev) => prev.map((s) => ({ ...s, status: 'Present' })));
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
      showToast(res.message);
      const ws = await teacherApi.getWorkspace(1);
      setWorkspace(ws);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Lỗi khi lưu điểm danh.');
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleSimulateWorkstationLogin = async () => {
    try {
      const res = await teacherApi.syncWorkstation(selectedSessionId, workstationStudentId, workstationIp);
      emitRealtimeEvent({
        type: 'WORKSTATION_CHECKIN',
        sessionId: selectedSessionId,
        studentId: workstationStudentId,
        workstationIp,
        timestamp: new Date().toISOString(),
      });
      showToast(res.message);
      await handleSelectSessionForAttendance(selectedSessionId);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Lỗi đồng bộ máy trạm.');
    }
  };

  const handleReviewMakeup = async (makeupId: number, isApproved: boolean) => {
    try {
      const res = await teacherApi.reviewMakeup(
        makeupId,
        isApproved,
        isApproved ? 'Giáo viên đồng ý xếp lịch học bù' : 'Lớp đã đủ sĩ số phòng Lab',
        1
      );
      showToast(res.message);
      const mkList = await teacherApi.getMakeupRequests(1);
      setMakeupList(mkList);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể xử lý đơn học bù.');
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
      showToast(err instanceof Error ? err.message : 'Đã phát tín hiệu Focus Mode nội bộ.');
    }
  };

  const handleBroadcastSpotlight = async () => {
    const stu =
      roster.find((r) => r.studentId === spotlightStudentId)?.studentName ?? 'Lê Bảo An';
    try {
      const res = await teacherApi.broadcastSpotlight(
        selectedClassId,
        spotlightStudentId,
        stu,
        spotlightPayload
      );
      emitRealtimeEvent({
        type: 'SPOTLIGHT',
        classId: selectedClassId,
        studentId: spotlightStudentId,
        studentName: stu,
        screenPayload: spotlightPayload,
        timestamp: new Date().toISOString(),
      });
      showToast(res.message);
    } catch (err) {
      emitRealtimeEvent({
        type: 'SPOTLIGHT',
        classId: selectedClassId,
        studentId: spotlightStudentId,
        studentName: stu,
        screenPayload: spotlightPayload,
        timestamp: new Date().toISOString(),
      });
      showToast(err instanceof Error ? err.message : 'Đã phát sóng Spotlight nội bộ.');
    }
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
          unlockMessage: `Trạm ${prev.length + 1}: Đã mở khóa tọa độ (${x}, ${y})!`,
          isFinish: true,
        },
      ];
      return next;
    });
  };

  const handleGenerateAiMap = async () => {
    setGeneratingAiMap(true);
    try {
      const aiMap = await teacherApi.generateAiMap(aiPrompt);
      setMapName(aiMap.name);
      setMapTheme(aiMap.theme);
      setStartPos({ x: aiMap.startX, y: aiMap.startY });
      setCheckpoints(aiMap.checkpoints);
      setMasterBlocklyXml(aiMap.masterBlocklyXml);
      try {
        const parsed = JSON.parse(aiMap.layoutJson) as { obstacles?: { x: number; y: number }[] };
        if (parsed.obstacles) setObstacles(parsed.obstacles);
      } catch {
        // Keep current obstacles if JSON format differs
      }
      showToast('AI đã sinh sa bàn 2D, các trạm Checkpoint và mã chuẩn AST thành công!');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể gọi dịch vụ AI.');
    } finally {
      setGeneratingAiMap(false);
    }
  };

  const handleSaveStemMap = async () => {
    setSavingMap(true);
    try {
      const layoutJson = JSON.stringify({
        gridWidth: 12,
        gridHeight: 12,
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
      showToast(`${res.message} (Mã sa bàn #${res.mapId})`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Lỗi khi lưu sa bàn STEM.');
    } finally {
      setSavingMap(false);
    }
  };

  const selectedSubmission =
    submissions.find((s) => s.submissionId === selectedSubmissionId) ?? submissions[0] ?? null;

  const currentAstScore = selectedSubmission?.autoAstScore ?? 9.5;
  const currentHardwareAvg = Number(((assemblyScore + algorithmScore + teamworkScore) / 3).toFixed(2));
  const previewFinalScore = Number((currentAstScore * 0.6 + currentHardwareAvg * 0.4).toFixed(2));

  const handleToggleVoiceRecording = () => {
    if (isRecordingVoice) {
      recognitionRef.current?.stop?.();
      setIsRecordingVoice(false);
      return;
    }

    const SpeechRecognitionCtor =
      (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown })
        .SpeechRecognition ||
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
        'Ghi âm giọng nói: Con lắp ráp robot rất chắc chắn, thuật toán xử lý khúc cua thông minh và chủ động hỗ trợ bạn cùng bàn.'
      );
      setIsRecordingVoice(false);
      showToast('Đã chuyển giọng nói của giáo viên thành văn bản nhận xét (Voice-to-Text)!');
    }, 1400);
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
        `Đã công bố điểm Hybrid 60/40: Tổng ${res.finalScore}/10 (AST ${res.autoAstScore} • Phần cứng ${res.hardwareScore})`
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
      showToast(err instanceof Error ? err.message : 'Không thể lưu kết quả chấm bài.');
    } finally {
      setSubmittingGrade(false);
    }
  };

  return (
    <div className="space-y-6 py-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          role="status"
          className="fixed top-20 right-6 z-50 max-w-md px-4 py-3 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-xl border border-slate-700 flex items-center gap-2.5"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Error Recovery Banner (State 8: Error with actionable recovery) */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-800 dark:text-rose-200">
          <div>
            <span className="font-bold">Cảnh báo kết nối API: </span>
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => void loadAllTeacherData()}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold shrink-0"
          >
            Thử kết nối lại
          </button>
        </div>
      )}

      {/* Teacher Command Header (Staff Data-Dense Archetype) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-extrabold text-lg flex items-center justify-center border border-blue-200 dark:border-blue-800">
            GV
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Teacher Studio & Classroom Orchestration
              </h1>
              <Badge variant="success">Clean Architecture .NET 9</Badge>
              <Badge variant="info">SQL Server Live</Badge>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Giảng viên phụ trách: <strong className="text-slate-900 dark:text-white">{workspace.teacherName}</strong> •
              Đang mở <strong className="tabular-nums">{workspace.activeClassesCount}</strong> lớp thực hành •
              Bài chờ chấm: <strong className="text-orange-600 tabular-nums">{workspace.pendingTaskCount}</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Chọn lớp học phụ trách"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100"
          >
            {classes.map((c) => (
              <option key={c.classId} value={c.classId}>
                {c.classCode} — {c.className} ({c.studentCount} HS)
              </option>
            ))}
          </select>

          <a
            href={teacherApi.getExportExcelUrl(selectedClassId)}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm"
          >
            <IconDownload size={15} /> Xuất sổ điểm Excel (.xlsx)
          </a>
        </div>
      </div>

      {/* 6 Sub-Module Navigation Tabs (Mapping 1:1 with Tiến's 9 Teacher Features) */}
      <div
        role="tablist"
        aria-label="Các phân hệ Teacher Studio"
        className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-x-auto text-xs"
      >
        {(
          [
            { id: 'workspace', code: 'SCR-TEA-01', label: 'Bàn làm việc & Lịch dạy' },
            { id: 'attendance', code: 'SCR-TEA-02', label: 'Điểm danh 1-Chạm & Học bù' },
            { id: 'lab_control', code: 'SCR-TEA-03', label: 'Focus Mode & Spotlight' },
            { id: 'map_builder', code: 'SCR-TEA-04', label: 'Sa bàn STEM & AI Quest' },
            { id: 'grading', code: 'SCR-TEA-05', label: 'Chấm bài Hybrid 60/40 & Voice' },
            { id: 'analytics', code: 'SCR-TEA-06', label: 'Phân tích phổ điểm & Excel' },
          ] as { id: TeacherTab; code: string; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 rounded-lg font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
            }`}
          >
            <span
              className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                activeTab === tab.id
                  ? 'bg-blue-700 text-blue-100'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {tab.code}
            </span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Loading Skeleton State (State 6: CLS = 0) */}
      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
          <div className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="lg:col-span-2 h-64 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
      )}

      {/* ==================== TAB 1: SCR-TEA-01 WORKSPACE & SCHEDULE ==================== */}
      {!loading && activeTab === 'workspace' && (
        <div className="space-y-6">
          {/* KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500">Lớp đang phụ trách</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
                {workspace.activeClassesCount} lớp
              </p>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">Trạng thái: Đang mở (Open)</p>
            </div>
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500">Bài nộp chờ chấm (Pending/AutoGraded)</p>
              <p className="text-2xl font-bold text-orange-600 mt-1 tabular-nums">
                {workspace.pendingTaskCount} bài
              </p>
              <button
                onClick={() => setActiveTab('grading')}
                className="text-[11px] text-blue-600 font-semibold mt-1 hover:underline"
              >
                Mở Studio chấm bài 60/40 →
              </button>
            </div>
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500">Ca dạy trong tuần</p>
              <p className="text-2xl font-bold text-blue-600 mt-1 tabular-nums">
                {workspace.weeklySchedule.length} buổi
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Phòng Lab Robotics 202</p>
            </div>
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500">Đơn xin học bù chờ duyệt</p>
              <p className="text-2xl font-bold text-amber-600 mt-1 tabular-nums">
                {makeupList.filter((m) => m.status === 'Pending').length} đơn
              </p>
              <button
                onClick={() => setActiveTab('attendance')}
                className="text-[11px] text-blue-600 font-semibold mt-1 hover:underline"
              >
                Xử lý đơn học bù →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Weekly Schedule Table */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <IconCalendar size={18} className="text-blue-600" /> Thời khóa biểu giảng dạy trong tuần
                </h2>
                <Badge variant="info">Chuẩn giờ Lab TEKY</Badge>
              </div>

              {workspace.weeklySchedule.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                  Không có lịch giảng dạy nào trong tuần này.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Buổi</th>
                        <th className="py-2.5 px-3">Mã lớp & Tên lớp</th>
                        <th className="py-2.5 px-3">Ngày học & Khung giờ</th>
                        <th className="py-2.5 px-3">Phòng Lab</th>
                        <th className="py-2.5 px-3">Chuyên cần</th>
                        <th className="py-2.5 px-3">Trạng thái</th>
                        <th className="py-2.5 px-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {workspace.weeklySchedule.map((s) => (
                        <tr key={s.sessionId} className="h-10 hover:bg-slate-50 dark:hover:bg-slate-700/40">
                          <td className="py-2 px-3 font-mono font-bold text-blue-600 tabular-nums">
                            #{s.sessionNumber}
                          </td>
                          <td className="py-2 px-3">
                            <p className="font-bold text-slate-900 dark:text-white">{s.classCode}</p>
                            <p className="text-[11px] text-slate-500">{s.className}</p>
                          </td>
                          <td className="py-2 px-3 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                            <div>{s.sessionDate}</div>
                            <div className="text-[11px] text-slate-500">
                              {s.startTime} - {s.endTime}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-slate-700 dark:text-slate-300 font-medium">
                            {s.roomName}
                          </td>
                          <td className="py-2 px-3 font-mono font-semibold tabular-nums">
                            {s.presentCount}/{s.enrolledStudentsCount} HS
                          </td>
                          <td className="py-2 px-3">
                            <Badge variant={s.status === 'Done' ? 'success' : 'info'}>
                              {s.status === 'Done' ? 'Đã hoàn thành' : 'Đã lên lịch'}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              onClick={() => {
                                void handleSelectSessionForAttendance(s.sessionId);
                                setActiveTab('attendance');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-100"
                            >
                              Điểm danh →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Absent Alerts Panel */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Cảnh báo học sinh vắng mặt
                </h2>
                <Badge variant="danger">{workspace.recentAbsentAlerts.length} cảnh báo</Badge>
              </div>
              <p className="text-xs text-slate-500">
                Danh sách học sinh vắng mặt gần nhất cần giáo viên lưu ý hoặc xếp lịch học bù:
              </p>

              {workspace.recentAbsentAlerts.length === 0 ? (
                <div className="p-6 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                  100% học sinh có mặt đầy đủ trong các buổi gần đây.
                </div>
              ) : (
                <div className="space-y-3">
                  {workspace.recentAbsentAlerts.map((alert, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/70 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-rose-900 dark:text-rose-200">{alert.studentName}</span>
                        <span className="font-mono text-[11px] text-rose-700 dark:text-rose-300 tabular-nums">
                          {alert.date}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                        Lớp: {alert.classCode}
                      </p>
                      <p className="text-rose-800 dark:text-rose-200">{alert.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: SCR-TEA-02 1-CLICK ATTENDANCE & MAKEUP ==================== */}
      {!loading && activeTab === 'attendance' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Điểm danh 1-Chạm: {attendanceSession?.className ?? 'Lớp STEM Robot K10-A'}
                  </h2>
                  <Badge variant="info">Session #{selectedSessionId}</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ngày học: <span className="font-mono tabular-nums">{attendanceSession?.date}</span> • Tự động gửi
                  Push Notification về cổng Phụ huynh khi lưu
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Chọn buổi học điểm danh"
                  value={selectedSessionId}
                  onChange={(e) => void handleSelectSessionForAttendance(Number(e.target.value))}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-xs font-medium"
                >
                  {workspace.weeklySchedule.map((s) => (
                    <option key={s.sessionId} value={s.sessionId}>
                      Buổi #{s.sessionNumber} ({s.sessionDate})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleMarkAllPresent}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-200"
                >
                  ✓ Tất cả có mặt
                </button>
                <button
                  onClick={() => void handleSaveAttendance()}
                  disabled={savingAttendance}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs shadow-sm"
                >
                  {savingAttendance ? 'Đang lưu...' : 'Lưu điểm danh'}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Mã HS</th>
                    <th className="py-2.5 px-3">Họ và tên học sinh</th>
                    <th className="py-2.5 px-3">Trạng thái 1-Click Toggle</th>
                    <th className="py-2.5 px-3">Ghi chú / Máy trạm Lab</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {roster.map((s) => (
                    <tr key={s.studentId} className="h-11 hover:bg-slate-50/70 dark:hover:bg-slate-700/30">
                      <td className="py-2 px-3 font-mono font-semibold text-slate-600 dark:text-slate-400 tabular-nums">
                        {s.studentCode}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">{s.studentName}</td>
                      <td className="py-2 px-3">
                        <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-700 p-0.5 gap-0.5">
                          {(
                            [
                              { key: 'Present', label: 'Có mặt', active: 'bg-emerald-600 text-white' },
                              { key: 'Late', label: 'Đi muộn', active: 'bg-amber-500 text-white' },
                              { key: 'Absent', label: 'Vắng', active: 'bg-rose-600 text-white' },
                              { key: 'Excused', label: 'Có phép', active: 'bg-sky-600 text-white' },
                            ] as const
                          ).map((st) => (
                            <button
                              key={st.key}
                              type="button"
                              onClick={() => handleAttendanceStatusChange(s.studentId, st.key)}
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
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={s.absenceReason ?? ''}
                          onChange={(e) => handleAttendanceReasonChange(s.studentId, e.target.value)}
                          placeholder="Ghi chú hoặc IP máy trạm..."
                          className="w-full px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/60 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Workstation Auto Check-in Simulator & Makeup Review */}
          <div className="space-y-6">
            {/* Workstation Auto Check-in */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Đồng bộ đăng nhập Máy trạm Lab
                </h3>
                <Badge variant="info">Auto Check-in</Badge>
              </div>
              <p className="text-xs text-slate-500">
                Khi học sinh đăng nhập vào máy trạm phòng Lab, hệ thống tự động đánh dấu <strong>Có mặt</strong> và
                bắn thông báo thời gian thực cho Giáo viên & Phụ huynh.
              </p>
              <div className="space-y-2 text-xs">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Học sinh đăng nhập máy trạm:
                </label>
                <select
                  value={workstationStudentId}
                  onChange={(e) => setWorkstationStudentId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700"
                >
                  {roster.map((r) => (
                    <option key={r.studentId} value={r.studentId}>
                      {r.studentName} ({r.studentCode})
                    </option>
                  ))}
                </select>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Địa chỉ IP máy trạm Lab:
                </label>
                <input
                  type="text"
                  value={workstationIp}
                  onChange={(e) => setWorkstationIp(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 font-mono tabular-nums"
                />
                <button
                  onClick={() => void handleSimulateWorkstationLogin()}
                  className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold text-xs"
                >
                  ⚡ Giả lập Học sinh đăng nhập Máy trạm
                </button>
              </div>
            </div>

            {/* Makeup Requests Review */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Duyệt đơn xin học bù</h3>
                <Badge variant="warning">{makeupList.length} đơn</Badge>
              </div>
              {makeupList.length === 0 ? (
                <p className="text-xs text-slate-500">Hiện không có đơn xin học bù nào.</p>
              ) : (
                <div className="space-y-3">
                  {makeupList.map((m) => (
                    <div
                      key={m.makeupId}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 text-xs space-y-2"
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
                            ? 'Đã duyệt'
                            : m.status === 'Rejected'
                            ? 'Từ chối'
                            : 'Chờ duyệt'}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Lớp: <strong>{m.classCode}</strong> • Nghỉ buổi:{' '}
                        <span className="font-mono tabular-nums">{m.missedDate}</span>
                      </p>
                      <p className="text-slate-700 dark:text-slate-300 italic">"{m.reason}"</p>
                      {m.status === 'Pending' && (
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => void handleReviewMakeup(m.makeupId, true)}
                            className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                          >
                            Chấp thuận
                          </button>
                          <button
                            onClick={() => void handleReviewMakeup(m.makeupId, false)}
                            className="flex-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                          >
                            Từ chối
                          </button>
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

      {/* ==================== TAB 3: SCR-TEA-03 FOCUS MODE & SPOTLIGHT ==================== */}
      {!loading && activeTab === 'lab_control' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Focus Mode Lock */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Badge variant={isFocusLocked ? 'danger' : 'success'}>
                  {isFocusLocked ? '🔒 ĐANG KHÓA MÀN HÌNH LAB' : '🔓 MÀN HÌNH LAB ĐANG MỞ'}
                </Badge>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-2">
                  Classroom Focus Mode & Lab Lock (SignalR ClassroomHub)
                </h2>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Khi giáo viên cần giảng lý thuyết, kích hoạt <strong>Focus Mode</strong> sẽ lập tức khóa màn hình làm
              bài của toàn bộ máy trạm học sinh trong lớp qua WebSocket SignalR (bạn có thể chuyển sang vai trò{' '}
              <strong>Học sinh</strong> để thấy màn hình bị khóa ngay lập tức).
            </p>

            <div className="space-y-2 text-xs">
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Thông điệp hiển thị trên màn hình khóa của học sinh:
              </label>
              <textarea
                rows={3}
                value={focusMessage}
                onChange={(e) => setFocusMessage(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-xs"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => void handleToggleFocusMode(true)}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm"
              >
                🔒 Khóa toàn bộ máy trạm phòng Lab
              </button>
              <button
                onClick={() => void handleToggleFocusMode(false)}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
              >
                🔓 Mở khóa cho học sinh thực hành
              </button>
            </div>
          </div>

          {/* Live Screen Spotlight Broadcast */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-4">
            <div>
              <Badge variant="accent">🌟 Live Screen Spotlight</Badge>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-2">
                Phát sóng bài làm xuất sắc lên máy chiếu & toàn lớp
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Khi một học sinh có giải thuật lắp ghép hoặc lập trình sáng tạo, giáo viên chỉ cần 1 cú click để chiếu
              sáng (Spotlight) màn hình sa bàn của em đó lên toàn bộ máy trạm trong lớp để tuyên dương.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Chọn học sinh được tuyên dương Spotlight:
                </label>
                <select
                  value={spotlightStudentId}
                  onChange={(e) => setSpotlightStudentId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 font-semibold"
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
                  Mô tả giải thuật / Mã lệnh Blockly được phát sóng:
                </label>
                <textarea
                  rows={3}
                  value={spotlightPayload}
                  onChange={(e) => setSpotlightPayload(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 font-mono text-xs"
                />
              </div>

              <button
                onClick={() => void handleBroadcastSpotlight()}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm"
              >
                📡 Phát sóng Spotlight lên Máy chiếu & Phòng Lab ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 4: SCR-TEA-04 STEM MAP BUILDER & GEN AI ==================== */}
      {!loading && activeTab === 'map_builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Interactive 12x12 2D Coordinate Grid */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Thiết kế Sa bàn 2D & Trạm kiểm soát Checkpoint (12×12)
                </h2>
                <p className="text-xs text-slate-500">
                  Click vào từng ô tọa độ (X, Y) trên lưới để đặt điểm Xuất phát, Chướng ngại vật hoặc Trạm Checkpoint
                </p>
              </div>
              <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-700 p-1 gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setGridTool('start')}
                  className={`px-2.5 py-1 rounded-md font-semibold ${
                    gridTool === 'start' ? 'bg-emerald-600 text-white' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  🚀 Điểm xuất phát
                </button>
                <button
                  type="button"
                  onClick={() => setGridTool('checkpoint')}
                  className={`px-2.5 py-1 rounded-md font-semibold ${
                    gridTool === 'checkpoint' ? 'bg-orange-500 text-white' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  🚩 Trạm Checkpoint
                </button>
                <button
                  type="button"
                  onClick={() => setGridTool('obstacle')}
                  className={`px-2.5 py-1 rounded-md font-semibold ${
                    gridTool === 'obstacle' ? 'bg-slate-800 text-white' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  🧱 Chướng ngại vật
                </button>
              </div>
            </div>

            {/* 12x12 Coordinate Grid */}
            <div className="grid grid-cols-12 gap-1 p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 max-w-xl mx-auto">
              {Array.from({ length: 12 }).map((_, rowIdx) =>
                Array.from({ length: 12 }).map((__, colIdx) => {
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
                      className={`aspect-square rounded-md text-[10px] font-mono font-bold flex items-center justify-center border transition-all ${
                        isStart
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                          : cp
                          ? cp.isFinish
                            ? 'bg-orange-500 text-white border-orange-600 shadow-sm'
                            : 'bg-blue-600 text-white border-blue-700'
                          : isObs
                          ? 'bg-slate-700 text-slate-200 border-slate-800'
                          : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-blue-50'
                      }`}
                    >
                      {isStart ? 'S' : cp ? (cp.isFinish ? '🏁' : `C${cp.seqNo}`) : isObs ? '■' : ''}
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400 pt-2">
              <div className="flex items-center gap-4 font-mono tabular-nums">
                <span>🚀 Start: ({startPos.x}, {startPos.y})</span>
                <span>🚩 Checkpoints: {checkpoints.length} trạm</span>
                <span>🧱 Chướng ngại vật: {obstacles.length} ô</span>
              </div>
              <button
                onClick={() => void handleSaveStemMap()}
                disabled={savingMap}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm"
              >
                {savingMap ? 'Đang lưu vào SQL Server...' : '💾 Lưu Sa bàn vào Cơ sở dữ liệu'}
              </button>
            </div>
          </div>

          {/* Right: Generative AI Map & Quest Creator */}
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="accent">✨ Generative AI Quest Creator</Badge>
                <span className="font-mono text-[10px] text-slate-500">Gemini / AST Engine</span>
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Sinh tự động Sa bàn 2D & Code mẫu AST bằng câu lệnh tự nhiên
              </h3>
              <textarea
                rows={3}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Nhập chủ đề sa bàn mong muốn..."
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-xs"
              />
              <button
                onClick={() => void handleGenerateAiMap()}
                disabled={generatingAiMap}
                className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-xs shadow-sm"
              >
                {generatingAiMap ? 'Đang tính toán sa bàn AI...' : '⚡ AI Tự động sinh Sa bàn & Code mẫu (3 giây)'}
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Thông số Sa bàn & Checkpoints</h4>
              <div>
                <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Tên sa bàn:</label>
                <input
                  type="text"
                  value={mapName}
                  onChange={(e) => setMapName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 font-semibold"
                />
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {checkpoints.map((cp) => (
                  <div
                    key={cp.seqNo}
                    className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 flex items-center justify-between gap-2"
                  >
                    <span className="font-mono font-bold text-blue-600 tabular-nums">
                      #{cp.seqNo} ({cp.x},{cp.y})
                    </span>
                    <span className="truncate text-slate-700 dark:text-slate-300 flex-1">{cp.unlockMessage}</span>
                    {cp.isFinish && <Badge variant="accent">Đích</Badge>}
                  </div>
                ))}
              </div>
              <div>
                <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Mã chuẩn của Giáo viên (Master Blockly XML → AST):
                </label>
                <pre className="p-2.5 rounded-lg bg-slate-900 text-emerald-400 font-mono text-[10px] overflow-x-auto">
                  {masterBlocklyXml}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 5: SCR-TEA-05 HYBRID PRACTICAL GRADING STUDIO (3-COLUMN) ==================== */}
      {!loading && activeTab === 'grading' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Submissions Queue & Blockly Code Viewer */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                1. Hàng chờ bài nộp & Mã lệnh Blockly
              </h2>
              <Badge variant="info">{submissions.length} bài nộp</Badge>
            </div>

            <div className="space-y-2">
              {submissions.map((sub) => (
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
                  className={`w-full text-left p-3 rounded-xl border transition-all text-xs ${
                    selectedSubmission?.submissionId === sub.submissionId
                      ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40'
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
                      {sub.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {sub.studentCode} • Lần nộp #{sub.attemptNo} • Điểm hiện tại:{' '}
                    <strong className="tabular-nums">
                      {sub.finalScore != null ? `${sub.finalScore}/10` : 'Chưa chốt'}
                    </strong>
                  </p>
                </button>
              ))}
            </div>

            {selectedSubmission && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Khối lệnh Blockly của {selectedSubmission.studentName}:
                </p>
                <pre className="p-3 rounded-xl bg-slate-900 text-sky-300 font-mono text-[11px] overflow-x-auto max-h-44">
                  {selectedSubmission.blocklyJson}
                </pre>
              </div>
            )}
          </div>

          {/* Column 2: AI Code Doctor AST Auto-Score (60%) */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                2. Điểm thuật toán AST tự động (Trọng số 60%)
              </h2>
              <Badge variant="info">Zhang-Shasha TED</Badge>
            </div>
            <p className="text-xs text-slate-500">
              Hệ thống bóc tách XML/JSON thành Cây cú pháp trừu tượng (AST) và đo khoảng cách chỉnh sửa cây (Tree Edit
              Distance) so với bài giải chuẩn của giáo viên:
            </p>

            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">Điểm AST Auto-Grader (60%)</p>
                <p className="text-[11px] text-blue-700 dark:text-blue-300">
                  Độ tương đồng cấu trúc cây: {selectedSubmission?.matchPercent ?? 95}%
                </p>
              </div>
              <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                {currentAstScore.toFixed(2)}/10
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                3. Chấm điểm định tính phần cứng tại lớp (Trọng số 40%):
              </p>

              <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-700/40">
                <div>
                  <div className="flex justify-between mb-1">
                    <span>Độ chắc chắn lắp ráp cơ khí (Assembly)</span>
                    <strong className="font-mono tabular-nums text-blue-600">{assemblyScore.toFixed(1)}/10</strong>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={0.5}
                    value={assemblyScore}
                    onChange={(e) => setAssemblyScore(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span>Khả năng giải thích lưu đồ thuật toán</span>
                    <strong className="font-mono tabular-nums text-blue-600">{algorithmScore.toFixed(1)}/10</strong>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={0.5}
                    value={algorithmScore}
                    onChange={(e) => setAlgorithmScore(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span>Kỹ năng phối hợp nhóm (Teamwork)</span>
                    <strong className="font-mono tabular-nums text-blue-600">{teamworkScore.toFixed(1)}/10</strong>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={0.5}
                    value={teamworkScore}
                    onChange={(e) => setTeamworkScore(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* Hybrid 60/40 Formula Summary */}
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
              <div className="text-xs">
                <p className="font-bold text-emerald-900 dark:text-emerald-200">Điểm tổng kết Hybrid (60/40)</p>
                <p className="font-mono text-[11px] text-emerald-700 dark:text-emerald-300 tabular-nums">
                  ({currentAstScore.toFixed(1)} × 0.6) + ({currentHardwareAvg.toFixed(1)} × 0.4)
                </p>
              </div>
              <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                {previewFinalScore.toFixed(2)}/10
              </div>
            </div>
          </div>

          {/* Column 3: Quick-Pills Rubric & Voice-to-Text Qualitative Remarks */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Thẻ Quick-Pills & Ghi âm nhận xét Voice-to-Text
                </h2>
                <Badge variant={remarkSource === 'Voice' ? 'accent' : 'neutral'}>
                  Nguồn: {remarkSource}
                </Badge>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Chạm nhanh thẻ nhận xét mẫu (Quick-Pills Rubric):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PILLS.map((pill, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setRemarkSource('Typed');
                        setRemarkText((prev) => (prev ? `${prev} ${pill}.` : `${pill}.`));
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 text-[11px] font-medium text-slate-700 dark:text-slate-300 text-left"
                    >
                      + {pill}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Nhận xét gửi vào Sổ liên lạc điện tử của Phụ huynh:
                  </label>
                  <button
                    type="button"
                    onClick={handleToggleVoiceRecording}
                    className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                      isRecordingVoice
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800'
                    }`}
                  >
                    🎙️ {isRecordingVoice ? 'Đang thu âm giọng nói...' : 'Ghi âm Voice-to-Text'}
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={remarkText}
                  onChange={(e) => {
                    setRemarkSource('Typed');
                    setRemarkText(e.target.value);
                  }}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-xs"
                />
              </div>
            </div>

            <button
              onClick={() => void handleSubmitHybridGrade()}
              disabled={submittingGrade || !selectedSubmission}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm"
            >
              {submittingGrade
                ? 'Đang chốt điểm & sinh chứng nhận QR...'
                : '✓ Chốt điểm Hybrid 60/40 & Xuất bản Sổ liên lạc + QR Portfolio'}
            </button>
          </div>
        </div>
      )}

      {/* ==================== TAB 6: SCR-TEA-06 CLASS ANALYTICS & EXCEL EXPORT ==================== */}
      {!loading && activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500">Sĩ số lớp</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
                {analytics?.totalStudents ?? 3} HS
              </p>
            </div>
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500">Điểm TB Hybrid (60/40)</p>
              <p className="text-2xl font-bold text-blue-600 mt-1 tabular-nums">
                {analytics?.averageScore?.toFixed(2) ?? '9.30'}/10
              </p>
            </div>
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500">Điểm TB Thuật toán AST (60%)</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1 tabular-nums">
                {analytics?.astAverage?.toFixed(2) ?? '9.50'}/10
              </p>
            </div>
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500">Điểm TB Lắp ráp Phần cứng (40%)</p>
              <p className="text-2xl font-bold text-orange-600 mt-1 tabular-nums">
                {analytics?.hardwareAverage?.toFixed(2) ?? '9.00'}/10
              </p>
            </div>
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500">Biên độ điểm (Min – Max)</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
                {analytics?.minScore?.toFixed(1) ?? '9.3'} – {analytics?.maxScore?.toFixed(1) ?? '9.3'}
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Biểu đồ phân phối điểm số của lớp ({analytics?.className ?? 'Lớp STEM Robot K10-A'})
                </h2>
                <p className="text-xs text-slate-500">
                  Xác định nhanh nhóm học sinh cần phụ đạo thêm hoặc nhóm học sinh giỏi để giao thử thách nâng cao
                </p>
              </div>
              <a
                href={teacherApi.getExportExcelUrl(selectedClassId)}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <IconDownload size={16} /> Tải Bảng điểm ClosedXML (.xlsx)
              </a>
            </div>

            <div className="space-y-3 pt-2">
              {(analytics?.scoreBuckets ?? []).map((b, idx) => {
                const total = Math.max(analytics?.totalStudents ?? 1, 1);
                const pct = Math.round((b.count / total) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{b.range}</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                        {b.count} học sinh ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(pct, b.count > 0 ? 12 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
