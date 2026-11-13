/**
 * TEKY Learning Hub — Typed API Client cho phân hệ của Tiến (Mtien)
 * Teacher Studio (SCR-TEA-01..06) · Parent Hub (SCR-PAR-01..04) · System Agent
 * Kết nối trực tiếp tới .NET 9 Web API (http://localhost:5268/api).
 */

export const API_ORIGIN =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_ORIGIN ||
  'http://localhost:5268';

export const API_BASE_URL = `${API_ORIGIN}/api`;

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('teky_token') : null;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Lỗi kết nối máy chủ (HTTP ${response.status})`);
  }

  return response.json();
}

/* ==================== TEACHER STUDIO DTOs ==================== */

export interface TeacherScheduleSessionDto {
  sessionId: number;
  classId: number;
  classCode: string;
  className: string;
  sessionNumber: number;
  title: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  roomName: string;
  status: string;
  enrolledStudentsCount: number;
  presentCount: number;
}

export interface AbsentAlertDto {
  studentId: number;
  studentName: string;
  classCode: string;
  date: string;
  reason: string;
}

export interface TeacherWorkspaceDto {
  teacherId: number;
  teacherName: string;
  pendingTaskCount: number;
  activeClassesCount: number;
  weeklySchedule: TeacherScheduleSessionDto[];
  recentAbsentAlerts: AbsentAlertDto[];
}

export interface TeacherClassSummaryDto {
  classId: number;
  classCode: string;
  className: string;
  status: string;
  studentCount: number;
}

export interface StudentAttendanceItemDto {
  attendanceId: number;
  studentId: number;
  studentCode: string;
  studentName: string;
  avatarUrl?: string;
  status: 'Present' | 'Late' | 'Absent' | 'Excused';
  absenceReason?: string;
  markedAt?: string;
}

export interface ClassAttendanceSessionDto {
  sessionId: number;
  className: string;
  date: string;
  students: StudentAttendanceItemDto[];
}

export interface MakeupRequestItemDto {
  makeupId: number;
  studentId: number;
  studentName: string;
  classCode: string;
  missedDate: string;
  preferredSessionId?: number;
  preferredDate?: string;
  reason?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
}

export interface CreateMapCheckpointDto {
  seqNo: number;
  x: number;
  y: number;
  unlockMessage?: string;
  isFinish: boolean;
}

export interface GeneratedMapResultDto {
  name: string;
  theme: string;
  layoutJson: string;
  startX: number;
  startY: number;
  checkpoints: CreateMapCheckpointDto[];
  masterBlocklyXml: string;
}

export interface GradingQueueItemDto {
  submissionId: number;
  assignmentId: number;
  assignmentTitle: string;
  classId: number;
  classCode: string;
  studentId: number;
  studentCode: string;
  studentName: string;
  attemptNo: number;
  status: 'Pending' | 'AutoGraded' | 'Finalized';
  submittedAt: string;
  blocklyJson: string;
  autoAstScore?: number;
  matchPercent?: number;
  hardwareScore?: number;
  finalScore?: number;
  remarkText?: string;
  remarkSource?: 'Typed' | 'Voice';
}

export interface GradeSubmissionRequest {
  submissionId: number;
  assemblyScore: number;
  algorithmExplainScore: number;
  teamworkScore: number;
  remarkText?: string;
  remarkSource?: 'Typed' | 'Voice';
}

export interface SubmissionGradingResultDto {
  submissionId: number;
  autoAstScore: number;
  hardwareScore: number;
  finalScore: number;
  status: string;
}

export interface ScoreDistributionBucketDto {
  range: string;
  count: number;
}

export interface ClassPerformanceAnalyticsDto {
  classId: number;
  className: string;
  totalStudents: number;
  averageScore: number;
  minScore: number;
  maxScore: number;
  hardwareAverage: number;
  astAverage: number;
  scoreBuckets: ScoreDistributionBucketDto[];
}

/* ==================== PARENT GUARDIAN HUB DTOs ==================== */

export interface ChildOverviewDto {
  studentId: number;
  studentCode: string;
  fullName: string;
  avatarUrl?: string;
  totalXp: number;
  stemPoints: number;
  currentClassName: string;
  currentLabRoom: string;
  todayAttendanceStatus: string;
  todayMarkedAt?: string;
  isInActiveSession: boolean;
}

export interface ParentDashboardDto {
  parentId: number;
  parentName: string;
  children: ChildOverviewDto[];
}

export interface EContactBookItemDto {
  sessionId: number;
  sessionTitle: string;
  date: string;
  attendanceStatus: string;
  absenceReason?: string;
  autoAstScore?: number;
  hardwareScore?: number;
  finalScore?: number;
  remarkText?: string;
  remarkSource?: string;
}

export interface CheerStickerDto {
  stickerId: number;
  code: string;
  name: string;
  imageUrl: string;
}

export interface StudentPortfolioDetailDto {
  itemId: number;
  studentId: number;
  submissionId: number;
  title: string;
  summary?: string;
  thumbnailUrl?: string;
  finalScore?: number;
  qrToken: string;
  qrCodeShareUrl: string;
  viewCount: number;
  completedAt: string;
}

export interface LeaderboardRankItemDto {
  rank?: number;
  studentId: number;
  studentName: string;
  avatarUrl?: string;
  xpEarned: number;
  bestTimeMs: number;
  bestBlockCount: number;
}

export interface ClassLeaderboardDto {
  classId: number;
  className: string;
  weekStartDate: string;
  weekEndDate: string;
  topRankings: LeaderboardRankItemDto[];
}

/* ==================== API FUNCTIONS ==================== */

export const teacherApi = {
  getWorkspace: (teacherId = 1, weekStart?: string) =>
    apiRequest<TeacherWorkspaceDto>(
      `/teacher/workspace?teacherId=${teacherId}${weekStart ? `&weekStart=${weekStart}` : ''}`
    ),
  getClasses: (teacherId = 1) =>
    apiRequest<TeacherClassSummaryDto[]>(`/teacher/classes?teacherId=${teacherId}`),
  getSessionAttendance: (sessionId: number) =>
    apiRequest<ClassAttendanceSessionDto>(`/teacher/attendance/${sessionId}`),
  updateAttendance: (
    sessionId: number,
    attendanceList: { studentId: number; status: string; reason?: string }[],
    teacherId = 1
  ) =>
    apiRequest<{ success: boolean; message: string }>(`/teacher/attendance/update?teacherId=${teacherId}`, {
      method: 'POST',
      body: JSON.stringify({ sessionId, attendanceList }),
    }),
  syncWorkstation: (sessionId: number, studentId: number, workstationIp: string) =>
    apiRequest<{ success: boolean; message: string }>(
      `/teacher/attendance/sync-workstation?sessionId=${sessionId}&studentId=${studentId}&workstationIp=${encodeURIComponent(workstationIp)}`,
      { method: 'POST' }
    ),
  getMakeupRequests: (teacherId = 1) =>
    apiRequest<MakeupRequestItemDto[]>(`/teacher/makeup?teacherId=${teacherId}`),
  reviewMakeup: (makeupId: number, isApproved: boolean, teacherNote?: string, teacherId = 1) =>
    apiRequest<{ success: boolean; message: string }>(`/teacher/makeup/review?teacherId=${teacherId}`, {
      method: 'POST',
      body: JSON.stringify({ makeupId, isApproved, teacherNote }),
    }),
  toggleFocusMode: (classId: number, isLocked: boolean, message?: string) =>
    apiRequest<{ success: boolean; isLocked: boolean; message: string }>(
      `/teacher/classroom/${classId}/focus-mode?isLocked=${isLocked}${message ? `&message=${encodeURIComponent(message)}` : ''}`,
      { method: 'POST' }
    ),
  broadcastSpotlight: (classId: number, studentId: number, studentName: string, screenPayload: string) =>
    apiRequest<{ success: boolean; message: string }>(
      `/teacher/classroom/${classId}/spotlight?studentId=${studentId}&studentName=${encodeURIComponent(studentName)}`,
      { method: 'POST', body: JSON.stringify(screenPayload) }
    ),
  generateAiMap: (prompt: string) =>
    apiRequest<GeneratedMapResultDto>(`/teacher/maps/generate-ai?prompt=${encodeURIComponent(prompt)}`, {
      method: 'POST',
    }),
  createStemMap: (
    request: {
      name: string;
      theme?: string;
      layoutJson: string;
      startX: number;
      startY: number;
      checkpoints: CreateMapCheckpointDto[];
    },
    teacherId = 1
  ) =>
    apiRequest<{ mapId: number; message: string }>(`/teacher/maps?teacherId=${teacherId}`, {
      method: 'POST',
      body: JSON.stringify(request),
    }),
  getSubmissions: (teacherId = 1, classId?: number) =>
    apiRequest<GradingQueueItemDto[]>(
      `/teacher/submissions?teacherId=${teacherId}${classId ? `&classId=${classId}` : ''}`
    ),
  gradeSubmission: (request: GradeSubmissionRequest, teacherId = 1) =>
    apiRequest<SubmissionGradingResultDto>(`/teacher/grade?teacherId=${teacherId}`, {
      method: 'POST',
      body: JSON.stringify(request),
    }),
  getAnalytics: (classId: number) =>
    apiRequest<ClassPerformanceAnalyticsDto>(`/teacher/analytics/${classId}`),
  getExportExcelUrl: (classId: number) => `${API_BASE_URL}/teacher/export-excel/${classId}`,
};

export const parentApi = {
  getDashboard: (parentId = 5) =>
    apiRequest<ParentDashboardDto>(`/parent/dashboard?parentId=${parentId}`),
  getContactBook: (studentId: number, parentId = 5) =>
    apiRequest<EContactBookItemDto[]>(`/parent/contact-book?studentId=${studentId}&parentId=${parentId}`),
  submitFeedback: (
    request: { sessionId: number; studentId: number; starRating: number; feedbackNote?: string },
    parentId = 5
  ) =>
    apiRequest<{ success: boolean; message: string }>(`/parent/feedback?parentId=${parentId}`, {
      method: 'POST',
      body: JSON.stringify(request),
    }),
  getAudioDigest: (sessionId: number, studentId: number) =>
    apiRequest<{ summaryText: string }>(`/parent/audio-digest?sessionId=${sessionId}&studentId=${studentId}`),
  getStickers: () => apiRequest<CheerStickerDto[]>('/parent/stickers'),
  sendCheer: (request: {
    parentId: number;
    studentId: number;
    stickerId?: number;
    sessionId?: number;
    message: string;
  }) =>
    apiRequest<{ success: boolean; message: string }>('/parent/cheer', {
      method: 'POST',
      body: JSON.stringify(request),
    }),
  getPortfolios: (studentId: number) =>
    apiRequest<StudentPortfolioDetailDto[]>(`/parent/portfolios/${studentId}`),
  verifyPortfolioByQr: (qrToken: string) =>
    apiRequest<StudentPortfolioDetailDto>(`/portfolio/verify/${qrToken}`),
  getLeaderboard: (classId: number) =>
    apiRequest<ClassLeaderboardDto>(`/parent/leaderboard/${classId}`),
};

/* ==================== REALTIME EVENT BUS (Cross-Tab + SignalR Ready) ==================== */

export type RealtimeChannelEvent =
  | { type: 'FOCUS_MODE'; classId: number; isLocked: boolean; message: string; timestamp: string }
  | { type: 'SPOTLIGHT'; classId: number; studentId: number; studentName: string; screenPayload: string; timestamp: string }
  | { type: 'CHEER_CONFETTI'; studentId: number; stickerCode: string; stickerName: string; message: string; timestamp: string }
  | { type: 'WORKSTATION_CHECKIN'; sessionId: number; studentId: number; workstationIp: string; timestamp: string };

const CHANNEL_NAME = 'teky_lms_realtime_bus';

export function emitRealtimeEvent(event: RealtimeChannelEvent): void {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(CHANNEL_NAME);
      bc.postMessage(event);
      bc.close();
    }
    localStorage.setItem(CHANNEL_NAME, JSON.stringify({ ...event, _nonce: Math.random() }));
    window.dispatchEvent(new CustomEvent(CHANNEL_NAME, { detail: event }));
  } catch {
    // Ignore storage quota errors in private mode
  }
}

export function subscribeRealtimeEvents(handler: (event: RealtimeChannelEvent) => void): () => void {
  const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;
  if (bc) {
    bc.onmessage = (ev) => handler(ev.data as RealtimeChannelEvent);
  }
  const onCustom = (ev: Event) => {
    const detail = (ev as CustomEvent<RealtimeChannelEvent>).detail;
    if (detail) handler(detail);
  };
  const onStorage = (ev: StorageEvent) => {
    if (ev.key === CHANNEL_NAME && ev.newValue) {
      try {
        handler(JSON.parse(ev.newValue) as RealtimeChannelEvent);
      } catch {
        // Ignore malformed payloads
      }
    }
  };
  window.addEventListener(CHANNEL_NAME, onCustom);
  window.addEventListener('storage', onStorage);
  return () => {
    bc?.close();
    window.removeEventListener(CHANNEL_NAME, onCustom);
    window.removeEventListener('storage', onStorage);
  };
}
