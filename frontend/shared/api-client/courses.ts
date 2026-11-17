import { API_BASE_URL } from './auth';

export type CourseStatus = 'Draft' | 'Published' | 'Active' | 'Archived';

export const courseStatuses: CourseStatus[] = ['Draft', 'Published', 'Active', 'Archived'];

export const courseStatusLabels: Record<CourseStatus, string> = {
  Draft: 'Bản nháp',
  Published: 'Đã xuất bản',
  Active: 'Đang hoạt động',
  Archived: 'Đã lưu trữ',
};

export interface AdminCourse {
  courseId: number;
  departmentId: number | null;
  courseCode: string;
  name: string;
  levelCode: string | null;
  status: CourseStatus;
  lessonCount: number;
  classCount: number;
  createdAt: string;
}

export interface AdminLessonMaterial {
  materialId: number;
  materialType: string;
  title: string;
  fileUrl: string;
  isDownloadable: boolean;
  sortOrder: number;
}

export interface AdminLesson {
  lessonId: number;
  orderNo: number;
  title: string;
  content: string | null;
  materials: AdminLessonMaterial[];
}

export interface AdminCourseDetail extends AdminCourse {
  description: string | null;
  lessons: AdminLesson[];
}

export interface AdminCoursePage {
  total: number;
  items: AdminCourse[];
}

export interface CourseUpsertPayload {
  departmentId?: number | null;
  courseCode: string;
  name: string;
  description?: string | null;
  levelCode?: string | null;
  status?: CourseStatus | null;
}

export interface LessonUpsertPayload {
  title: string;
  content?: string | null;
  orderNo: number;
  materials?: {
    materialId?: number | null;
    materialType: string;
    title: string;
    fileUrl: string;
    isDownloadable: boolean;
    sortOrder: number;
  }[];
}

const materialTypes = ['Slide', 'Document', 'AssemblyGuide', 'Video'];

function accessToken(): string {
  return (
    sessionStorage.getItem('teky_access_token') ||
    localStorage.getItem('teky_access_token') ||
    localStorage.getItem('teky_token') ||
    sessionStorage.getItem('teky_token') ||
    ''
  );
}

async function requestAdmin<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/admin/courses${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken()}`,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const messages: Record<number, string> = {
      401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
      403: 'Tài khoản hiện tại không có quyền quản lý khóa học.',
      404: 'Không tìm thấy khóa học hoặc bài học.',
    };
    if (response.status === 400 || response.status === 409) {
      const problem = (await response.json().catch(() => null)) as { title?: string } | null;
      throw new Error(problem?.title || 'Không thể lưu thay đổi khóa học.');
    }
    throw new Error(messages[response.status] || 'Không thể tải dữ liệu khóa học. Kiểm tra kết nối và thử lại.');
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function getCourseDepartments(): Promise<{id: number; name: string}[]> {
  return requestAdmin('/departments');
}

export async function getAdminCourses(params: { status?: string; q?: string; skip?: number; take?: number } = {}): Promise<AdminCoursePage> {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.q) query.set('q', params.q);
  query.set('skip', String(params.skip ?? 0));
  query.set('take', String(params.take ?? 100));
  return requestAdmin<AdminCoursePage>(`?${query.toString()}`);
}

export async function getAdminCourse(courseId: number): Promise<AdminCourseDetail> {
  return requestAdmin<AdminCourseDetail>(`/${courseId}`);
}

export async function createAdminCourse(payload: CourseUpsertPayload): Promise<AdminCourseDetail> {
  return requestAdmin<AdminCourseDetail>('', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateAdminCourse(courseId: number, payload: CourseUpsertPayload): Promise<AdminCourseDetail> {
  return requestAdmin<AdminCourseDetail>(`/${courseId}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function changeCourseStatus(courseId: number, status: CourseStatus): Promise<AdminCourseDetail> {
  return requestAdmin<AdminCourseDetail>(`/${courseId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

/** Xoá khóa học = soft delete (chuyển sang Archived, xoá mềm bài học). */
export async function archiveAdminCourse(courseId: number): Promise<AdminCourseDetail> {
  return requestAdmin<AdminCourseDetail>(`/${courseId}`, { method: 'DELETE' });
}

export async function upsertAdminLesson(
  courseId: number,
  lessonId: number | null,
  payload: LessonUpsertPayload
): Promise<AdminLesson> {
  const materials = (payload.materials ?? []).map((material) => ({
    ...material,
    materialType: materialTypes.includes(material.materialType) ? material.materialType : 'Document',
  }));
  const body = JSON.stringify({ ...payload, materials });
  return lessonId
    ? requestAdmin<AdminLesson>(`/${courseId}/lessons/${lessonId}`, { method: 'PUT', body })
    : requestAdmin<AdminLesson>(`/${courseId}/lessons`, { method: 'POST', body });
}

export async function deleteAdminLesson(courseId: number, lessonId: number): Promise<void> {
  await requestAdmin<void>(`/${courseId}/lessons/${lessonId}`, { method: 'DELETE' });
}

export async function deleteAdminMaterial(courseId: number, lessonId: number, materialId: number): Promise<void> {
  await requestAdmin<void>(`/${courseId}/lessons/${lessonId}/materials/${materialId}`, { method: 'DELETE' });
}
