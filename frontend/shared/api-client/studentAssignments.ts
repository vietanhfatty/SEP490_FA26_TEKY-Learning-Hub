import type { StudentAssignment, StudentProject } from './studentClasses';

export interface StudentAssignmentItem {
  assignment: StudentAssignment;
  classId: number;
  classCode: string;
  className: string;
  courseId: number;
  courseName: string;
  lessonId: number | null;
  lessonTitle: string | null;
  sessionId: number | null;
}

export interface StudentAssignmentDetail {
  item: StudentAssignmentItem;
  history: StudentProject[];
}

export const assignmentLabels = {
  todo: 'Chưa nộp',
  revision: 'Cần sửa',
  pending: 'Chờ phản hồi',
  passed: 'Đạt yêu cầu',
  graded: 'Đã có kết quả',
  closed: 'Đã đóng nộp',
  overdue: 'Quá hạn',
};

export function assignmentState(assignment: StudentAssignment): keyof typeof assignmentLabels {
  if (assignment.codeSubmission) return assignment.codeSubmission.isFinalized ? 'graded' : 'pending';
  if (assignment.submission?.reviewStatus === 'Passed') return 'passed';
  if (assignment.submission?.reviewStatus === 'NeedsRevision') return 'revision';
  if (assignment.submission) return 'pending';
  if (assignment.canSubmit) return 'todo';
  if (assignment.dueAt && Date.parse(assignment.dueAt) <= Date.now()) return 'overdue';
  return 'closed';
}
