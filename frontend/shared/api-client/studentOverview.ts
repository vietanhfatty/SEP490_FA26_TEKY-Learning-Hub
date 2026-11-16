import type {StudentClass,StudentSession} from './studentClasses';
export interface StudentOverview {
 student:{studentId:number;studentCode:string;fullName:string;email:string;schoolName:string|null;gradeLevel:string|null};
 activeClasses:StudentClass[];
 courses:{courseId:number;courseCode:string;name:string;totalLessons:number;reviewedLessons:number}[];
 totalLessons:number;reviewedLessons:number;projectCount:number;passedProjects:number;asOf:string;
 upcomingAssignments:{assignmentId:number;title:string;classId:number;classCode:string;courseId:number;lessonId:number|null;dueAt:string;sessionId:number|null;needsRevision:boolean}[];
 upcomingSessions:StudentSession[];
}
export interface StudentClassDetails {
 classId:number;classCode:string;name:string;courseId:number;courseName:string;status:string;enrollmentStatus:string;
 startDate:string|null;endDate:string|null;maxStudents:number;teacherName:string|null;teacherEmail:string|null;enrolledAt:string;
 notices:{notificationId:number;title:string;body:string|null;isRead:boolean;createdAt:string}[];noticeCount:number;
 materials:{materialId:number;lessonId:number;lessonTitle:string;title:string;materialType:string;fileUrl:string}[];
}
