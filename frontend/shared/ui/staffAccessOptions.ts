import type { AppointmentInput } from '../api-client/adminUsers';
export const employmentLabels: Record<string, string> = { FULL_TIME: 'Toàn thời gian', PART_TIME: 'Bán thời gian', CONTRACTOR: 'Cộng tác viên' };
export const emptyAppointment: AppointmentInput = { departmentId: 0, positionId: 0, policyVersion: 0, employmentType: 'FULL_TIME' };
