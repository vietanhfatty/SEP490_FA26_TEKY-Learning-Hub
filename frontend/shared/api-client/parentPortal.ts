import { useCallback, useEffect, useState } from 'react';
import { API_BASE_URL } from './auth';
import type { StudentSession } from './studentClasses';
import type { StudentOverview } from './studentOverview';

export type Child = { studentId: number; studentCode: string; fullName: string; relationship: string | null; gradeLevel: string | null; schoolName: string | null };
export type CourseProgress = { courseId: number; courseCode: string; name: string; totalLessons: number; reviewedLessons: number };
export type Enrollment = { classId: number; classCode: string; className: string; courseId: number; courseName: string; status: string; progressPercent: number; teacherName: string | null };
export type Lesson = { courseId: number; courseName: string; lessonId: number; orderNo: number; title: string; viewedAt: string | null; completedAt: string | null };
export type Attendance = { sessionId: number; classCode: string; title: string; status: string; absenceReason: string | null; date: string; startsAt: string; endsAt: string };
export type Result = { type: 'Assignment' | 'Project' | 'Assessment'; itemId: number; title: string; classCode: string; date: string; score: number | null; maxScore: number | null; status: string | null; feedback: string | null };
export type Assignment = { assignmentId: number; title: string; classCode: string; dueAt: string | null; status: string; submittedAt: string | null };
export type Learning = {
  child: Child; enrollments: Enrollment[]; courses: CourseProgress[]; lessons: Lesson[]; attendance: Attendance[];
  scheduledAttendanceMinutes: number; assignments: Assignment[]; results: Result[];
  upcomingAssignments: StudentOverview['upcomingAssignments']; upcomingSessions: StudentSession[];
};
export type Course = { courseId: number; courseCode: string; name: string; description: string | null; levelCode: string | null; tuitionVnd: number | null; lessonCount: number; openClassCount: number };
export type ClassOffer = { classId: number; classCode: string; name: string; status: string; startDate: string | null; endDate: string | null; teacherName: string | null; nextDate: string | null; startsAt: string | null; endsAt: string | null; schedule: { sessionId: number; title: string; date: string; startsAt: string; endsAt: string }[] };
export type CourseDetail = { course: Course; learningObjectives: string | null; lessons: { lessonId: number; orderNo: number; title: string }[]; classes: ClassOffer[] };
export type Registration = { requestId: number; classId: number; classCode: string; courseName: string; status: string; requestedAt: string };
export type Payment = {
  paymentId: number; reference: string; invoiceNumber: string | null; courseName: string; amountVnd: number; status: string;
  createdAt: string; paidAt: string | null; refundStatus: string | null; refundReason: string | null; refundRequestedAt: string | null;
};
export type Checkout = {
  paymentId: number; courseName: string; classCode: string; amountVnd: number; status: string;
  provider: 'PayOS' | 'Demo'; expiresAt: string; checkoutUrl: string | null; qrCode: string | null; demoReference: string | null;
};
export type Contact = { parentId: number; studentId: number; teacherId: number; parentName: string; studentName: string; teacherName: string; specialty: string | null; bio: string | null; unread: number };
export type Message = { messageId: number; mine: boolean; body: string | null; attachmentName: string | null; sentAt: string };
export type MessagePage = { messages: Message[]; olderThan: number | null };

export async function portalRequest(path: string, init: RequestInit = {}) {
  const token = sessionStorage.getItem('teky_access_token') || localStorage.getItem('teky_access_token') ||
    localStorage.getItem('teky_token') || sessionStorage.getItem('teky_token');
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token ?? ''}`);
  const response = await fetch(`${API_BASE_URL}/${path}`, { ...init, headers });
  if (!response.ok) {
    if (response.status === 401) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    if (response.status === 403 || response.status === 404) throw new Error('Thông tin không tồn tại hoặc bạn chưa có quyền truy cập.');
    const problem = await response.json().catch(() => null) as { title?: string } | null;
    throw new Error(problem?.title || (response.status === 413 ? 'Tệp đính kèm vượt quá dung lượng cho phép.' : 'Không thể hoàn thành thao tác. Vui lòng thử lại.'));
  }
  return response;
}

export async function portalRead<T>(path: string, signal?: AbortSignal): Promise<T> {
  return (await portalRequest(path, { signal })).json() as Promise<T>;
}

export async function portalPost(path: string, data: object) {
  await portalRequest(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}

export async function buyCourse(studentId: number, classId: number): Promise<Checkout> {
  const response = await portalRequest(`parent/children/${studentId}/checkouts`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ classId }),
  });
  return response.json();
}

export async function portalDownload(path: string, name: string) {
  const response = await portalRequest(path);
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function usePortalResource<T>(path: string | null, refreshMs?: number) {
  const [revision, setRevision] = useState(0);
  const [response, setResponse] = useState<{ path: string; revision: number; data?: T; error?: string }>();
  const retry = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    if (!path) return;
    const requestPath = path;
    const controller = new AbortController();
    let timer: number | undefined;
    let first = true;
    async function load() {
      try {
        const data = await portalRead<T>(requestPath, controller.signal);
        if (!controller.signal.aborted) setResponse({ path: requestPath, revision, data });
      } catch (error) {
        if (!controller.signal.aborted) setResponse(previous => ({
          path: requestPath, revision, data: previous?.path === requestPath ? previous.data : undefined,
          error: first || previous?.path !== requestPath || !previous.data ? describeError(error) : undefined,
        }));
      } finally {
        first = false;
        schedule();
      }
    }
    function schedule() {
      if (refreshMs && !controller.signal.aborted) {
        timer = window.setTimeout(() => {
          if (document.hidden) schedule();
          else void load();
        }, refreshMs);
      }
    }
    void load();
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [path, revision, refreshMs]);
  const current = response?.path === path ? response : undefined;
  return { data: current?.data, error: current?.error, loading: !!path && current?.revision !== revision, retry };
}

export function describeError(error: unknown) {
  return error instanceof Error ? error.message : 'Không thể tải dữ liệu. Vui lòng thử lại.';
}

const formatter = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' });
export function dateTime(value: string | null) {
  if (!value) return '—';
  const iso = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : value + 'Z';
  return formatter.format(new Date(iso));
}
export function localDay(value: string | null) {
  return value?.split('-').reverse().join('/') ?? '—';
}
export const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
