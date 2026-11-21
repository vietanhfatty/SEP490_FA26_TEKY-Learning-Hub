import { portalRequest, portalRead } from "./parentPortal";
export type AcademicCourse = {
  courseId: number;
  courseCode: string;
  name: string;
  departmentId: number | null;
  status: string;
  reviewStatus: string;
  comment: string | null;
  version: number;
  learningObjectives: string | null;
  tuitionVnd: number | null;
  lessons: number;
};
export type AcademicClass = {
  classId: number;
  courseId: number;
  courseName: string;
  classCode: string;
  name: string;
  status: string;
  maxStudents: number;
  students: number;
  reserved: number;
  teacherId: number | null;
  teacherName: string | null;
  startDate: string | null;
  endDate: string | null;
  version: number;
  totalSessions: number;
  doneSessions: number;
  cancelledSessions: number;
};
export type AcademicStudent = {
  studentId: number;
  studentCode: string;
  name: string;
  gradeLevel: string | null;
};
export type AcademicEnrollment = {
  enrollmentId: number;
  classId: number;
  studentId: number;
  studentName: string;
  studentCode: string;
  status: string;
  progressPercent: number;
};
export type AcademicTeacher = {
  teacherId: number;
  teacherCode: string;
  name: string;
  specialty: string | null;
  classes: number;
  sessions: number;
  minutes: number;
};
export type AcademicAvailability = {
  availabilityId: number;
  teacherId: number;
  weekday: number;
  startsAt: string;
  endsAt: string;
};
export type AcademicDepartment = { departmentId: number; name: string };
export type AcademicRoom = {
  departmentId: number | null;
  roomId: number;
  roomName: string;
  capacity: number;
  status: string;
};
export type AcademicSession = {
  sessionId: number;
  classId: number;
  classCode: string;
  lessonId: number | null;
  title: string | null;
  teacherId: number | null;
  teacherName: string | null;
  roomId: number | null;
  roomName: string | null;
  date: string;
  startsAt: string;
  endsAt: string;
  status: string;
  version: number;
  changeReason: string | null;
};
export type AcademicRegistration = {
  requestId: number;
  parentId: number;
  parentName: string;
  studentId: number;
  studentName: string;
  gradeLevel: string | null;
  classId: number;
  classCode: string;
  courseId: number;
  courseName: string;
  status: string;
  managerNote: string | null;
  version: number;
  paymentStatus: string;
  tuitionVnd: number | null;
  enrolled: boolean;
};
export type AcademicMakeup = {
  makeupId: number;
  studentId: number;
  studentName: string;
  classId: number;
  classCode: string;
  lessonId: number | null;
  absentDate: string;
  reason: string | null;
  status: string;
  sessionId: number | null;
  managerNote: string | null;
  version: number;
};
export type AcademicEquipment = {
  departmentId: number | null;
  equipmentId: number;
  code: string;
  name: string;
  roomId: number | null;
  roomName: string | null;
  status: string;
  purchaseDate: string;
  costVnd: number;
  usefulLifeMonths: number;
  note: string | null;
  version: number;
  bookValueVnd: number;
};
export type AcademicWorkspace = {
  departments: AcademicDepartment[];
  lessons: {
    lessonId: number;
    courseId: number;
    title: string;
    orderNo: number;
  }[];
  courses: AcademicCourse[];
  classes: AcademicClass[];
  students: AcademicStudent[];
  enrollments: AcademicEnrollment[];
  teachers: AcademicTeacher[];
  availability: AcademicAvailability[];
  rooms: AcademicRoom[];
  sessions: AcademicSession[];
  registrations: AcademicRegistration[];
  makeupRequests: AcademicMakeup[];
  equipment: AcademicEquipment[];
  canManageSharedResources: boolean;
};
export const readAcademic = (from: string, to: string, signal?: AbortSignal) =>
  portalRead<AcademicWorkspace>(
    `academic/workspace?from=${from}&to=${to}`,
    signal,
  );
export async function changeAcademic(path: string, body: object) {
  return (
    await portalRequest(`academic/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  ).json() as Promise<{ id: number }>;
}
