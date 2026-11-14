import { API_BASE_URL } from './auth';

export interface StudentProject {
  fileName: string;
  submittedAt: string;
}

export interface StudentAssignment {
  assignmentId: number;
  title: string;
  instructions: string | null;
  dueAt: string | null;
  canSubmit: boolean;
  submission: StudentProject | null;
}

export interface StudentSession {
  sessionId: number; classId: number; classCode: string; className: string;
  courseId: number; courseCode: string; courseName: string; lessonId: number | null;
  title: string; content: string | null; startsAt: string; endsAt: string; status: string;
  teacherName: string | null; teacherEmail: string | null; roomName: string | null;
  assignments: StudentAssignment[];
  materials: { materialId: number; title: string; materialType: string; fileUrl: string }[];
}
export interface StudentClass {
  classId: number; classCode: string; name: string; status: string; enrollmentStatus: string;
  progressPercent: number; courseId: number; courseCode: string; courseName: string;
  teacherName: string | null; teacherEmail: string | null; sessions: StudentSession[];
}
export interface StudentClasses {
  studentId: number; studentCode: string; fullName: string; classes: StudentClass[];
}

async function requestStudent(path: string, init: RequestInit = {}): Promise<Response> {
  const token = sessionStorage.getItem('teky_access_token') || localStorage.getItem('teky_access_token') || localStorage.getItem('teky_token') || sessionStorage.getItem('teky_token');
  const response = await fetch(`${API_BASE_URL}/student/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token || ''}` },
  });
  if (!response.ok) {
    const messages: Record<number, string> = {
      401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
      403: 'Tài khoản hiện tại chưa có quyền truy cập hồ sơ học sinh.',
      404: 'Buổi học không tồn tại hoặc bạn chưa được ghi danh vào lớp này.',
    };
    if (response.status === 413) throw new Error('Tệp vượt quá giới hạn 10 MB.');
    if (response.status === 400 || response.status === 409) {
      const problem = await response.json().catch(() => null) as { title?: string } | null;
      throw new Error(problem?.title || 'Chưa nộp được sản phẩm.');
    }
    throw new Error(messages[response.status] || 'Không thể tải dữ liệu. Kiểm tra kết nối và thử lại.');
  }
  return response;
}

export async function getStudentData<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await requestStudent(path, { signal });
  return response.json() as Promise<T>;
}

const projectPath = (sessionId: number, assignmentId: number) =>
  `sessions/${sessionId}/assignments/${assignmentId}/project`;

export async function submitStudentProject(sessionId: number, assignmentId: number, file: File): Promise<StudentProject> {
  const body = new FormData();
  body.set('file', file);
  const response = await requestStudent(projectPath(sessionId, assignmentId), { method: 'POST', body });
  return response.json() as Promise<StudentProject>;
}

export async function downloadStudentProject(sessionId: number, assignmentId: number, fileName: string) {
  const response = await requestStudent(projectPath(sessionId, assignmentId));
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function sessionStatus(session: StudentSession, now: number) {
  if (session.status === 'Cancelled') return { label: 'Đã hủy', kind: 'cancelled' };
  if (session.status === 'Done') return { label: 'Hoàn thành', kind: 'done' };
  if (now < Date.parse(session.startsAt)) return { label: 'Sắp học', kind: 'upcoming' };
  if (now < Date.parse(session.endsAt)) return { label: 'Đang diễn ra', kind: 'live' };
  return { label: 'Đã kết thúc', kind: 'ended' };
}
