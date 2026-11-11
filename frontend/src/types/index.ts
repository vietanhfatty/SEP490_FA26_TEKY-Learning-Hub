export type UserRole = 'student' | 'parent' | 'teacher' | 'academic_manager' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  phone?: string;
  branch?: string;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  subject: 'Scratch' | 'Python' | 'Robotics' | 'Web' | '3D Design' | 'AI';
  ageGroup: '7-9' | '10-12' | '13-16';
  price: number;
  totalLessons: number;
  status: 'Published' | 'Draft' | 'Archived';
  description: string;
  thumbnail: string;
  enrolledStudents?: number;
}

export interface Lesson {
  id: string;
  courseId: string;
  lessonNumber: number;
  title: string;
  durationMinutes: number;
  objectives: string;
  materialsUrl?: string;
  type: 'Lecture' | 'Practice' | 'Quiz' | 'Project';
}

export interface ClassSession {
  id: string;
  classCode: string;
  className: string;
  courseTitle: string;
  teacherName: string;
  teacherId: string;
  room: string;
  date: string;
  timeSlot: string;
  totalStudents: number;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Conflict' | 'Cancelled';
  meetingUrl?: string;
}

export interface StudentAttendance {
  studentId: string;
  studentName: string;
  studentCode: string;
  status: 'Present' | 'Late' | 'Absent_Excused' | 'Absent_Unexcused';
  note?: string;
}

export interface StudentProgress {
  courseId: string;
  courseTitle: string;
  completedLessons: number;
  totalLessons: number;
  attendanceRate: number;
  lastScore: number;
  badges: string[];
}

export interface TeacherFeedback {
  id: string;
  sessionDate: string;
  courseTitle: string;
  teacherName: string;
  comprehensionRating: number;
  creativityRating: number;
  comment: string;
  homeworkStatus: 'Submitted' | 'Pending' | 'Needs Improvement';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  target: string;
  ipAddress: string;
  status: 'Success' | 'Warning' | 'Failed';
}

