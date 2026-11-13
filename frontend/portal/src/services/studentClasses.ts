import { API_BASE_URL } from '@teky/shared/api-client/auth';

export interface StudentSession {
  sessionId: number; classId: number; classCode: string; className: string;
  courseId: number; courseCode: string; courseName: string; lessonId: number | null;
  title: string; content: string | null; startsAt: string; endsAt: string; status: string;
  teacherName: string | null; teacherEmail: string | null; roomName: string | null;
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

export async function getStudentData<T>(path: string, signal: AbortSignal): Promise<T> {
  const token = sessionStorage.getItem('teky_access_token') || localStorage.getItem('teky_access_token') || localStorage.getItem('teky_token');
  const response = await fetch(`${API_BASE_URL}/student/${path}`, {
    headers: { Authorization: `Bearer ${token || ''}` }, signal,
  });
  if (!response.ok) {
    const messages: Record<number, string> = {
      401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
      403: 'Tài khoản hiện tại chưa có quyền truy cập hồ sơ học sinh.',
      404: 'Buổi học không tồn tại hoặc bạn chưa được ghi danh vào lớp này.',
    };
    throw new Error(messages[response.status] || 'Không thể tải dữ liệu. Kiểm tra kết nối và thử lại.');
  }
  return response.json() as Promise<T>;
}

export function sessionStatus(session: StudentSession, now: number) {
  if (session.status === 'Cancelled') return { label: 'Đã hủy', kind: 'cancelled' };
  if (session.status === 'Done') return { label: 'Hoàn thành', kind: 'done' };
  if (now < Date.parse(session.startsAt)) return { label: 'Sắp học', kind: 'upcoming' };
  if (now < Date.parse(session.endsAt)) return { label: 'Đang diễn ra', kind: 'live' };
  return { label: 'Đã kết thúc', kind: 'ended' };
}
