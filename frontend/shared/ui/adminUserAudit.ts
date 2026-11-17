import type { AuditEvent, Catalog, Detail } from '../api-client/adminUsers';

export const userRoleLabels: Record<number, string> = {
  1: 'Học viên', 2: 'Giáo viên', 3: 'Quản trị hệ thống',
  4: 'Phụ huynh', 5: 'Nhân sự chuyên môn', 6: 'Quản lý chuyên môn',
};
export const userStatusLabels: Record<string, string> = {
  Active: 'Hoạt động', Locked: 'Đã khóa', Pending: 'Chờ kích hoạt',
};

const actionLabels: Record<string, string> = {
  USER_CREATED: 'Tạo tài khoản',
  USER_PROFILE_UPDATED: 'Cập nhật hồ sơ',
  USER_STATUS: 'Thay đổi trạng thái tài khoản',
  USER_GRANT: 'Cấp thêm vai trò',
  USER_PRIMARY: 'Thay đổi vai trò mặc định',
  USER_REVOKE: 'Thu hồi vai trò',
  INVITATION_RESENT: 'Gửi lại lời mời kích hoạt',
  INVITATION_ACCEPTED: 'Kích hoạt tài khoản',
  APPOINTMENT_CREATED: 'Bổ nhiệm chức danh và phòng ban',
  APPOINTMENT_ENDED: 'Kết thúc bổ nhiệm',
};
const employmentLabels: Record<string, string> = {
  FULL_TIME: 'Toàn thời gian', PART_TIME: 'Bán thời gian', CONTRACTOR: 'Cộng tác viên',
};

type AuditRecord = Record<string, unknown>;
type AuditChange = { label: string; before: string; after: string };

function record(value: unknown): AuditRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key.toLowerCase(), entry]));
}

function snapshot(value: string | null): AuditRecord {
  try { return record(JSON.parse(value ?? 'null')); }
  catch { return {}; }
}

function text(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value : 'Chưa cập nhật';
}

function role(value: unknown): string {
  return userRoleLabels[Number(value)] ?? 'Vai trò chưa xác định';
}

export function describeUserAudit(
  event: AuditEvent,
  catalog: Catalog | null,
  appointments: Detail['appointments'] = [],
) {
  const before = snapshot(event.oldValue);
  const after = snapshot(event.newValue);
  const changes: AuditChange[] = [];
  let message = '';

  function add(label: string, previous: unknown, next: unknown, format = text) {
    if (next !== undefined && previous !== next) {
      changes.push({ label, before: previous === undefined ? 'Chưa có' : format(previous), after: format(next) });
    }
  }

  function department(value: unknown): string {
    return catalog?.departments.find(item => item.id === Number(value))?.name ?? 'Phòng ban chưa xác định';
  }

  function position(value: unknown): string {
    return catalog?.positions.find(item => item.id === Number(value))?.name ?? 'Chức danh chưa xác định';
  }

  function grant(value: unknown): string {
    const item = record(value);
    const scope = item.scopetype === 'GLOBAL' ? 'Toàn hệ thống'
      : item.scopetype === 'DEPARTMENT' ? department(item.departmentid) : 'Phạm vi chưa xác định';
    return `${role(item.roleid)} · ${scope}`;
  }

  switch (event.action) {
    case 'USER_CREATED':
      add('Họ tên', undefined, after.fullname);
      add('Email', undefined, after.email);
      add('Vai trò mặc định', undefined, after.primaryroleid, role);
      if (Array.isArray(after.grants) && after.grants.length) {
        changes.push({ label: 'Vai trò được cấp', before: 'Chưa có', after: after.grants.map(grant).join('\n') });
      }
      break;
    case 'USER_PROFILE_UPDATED':
      add('Họ tên', before.fullname, after.fullname);
      add('Số điện thoại', before.phone, after.phone);
      message = 'Không có thay đổi thông tin hồ sơ.';
      break;
    case 'USER_STATUS':
      add('Trạng thái', before.status, after.status, value => userStatusLabels[String(value)] ?? 'Trạng thái chưa xác định');
      message = 'Trạng thái tài khoản không thay đổi.';
      break;
    case 'USER_PRIMARY':
    case 'USER_REVOKE':
    case 'USER_GRANT': {
      add('Vai trò mặc định', before.primaryroleid, after.primaryroleid, role);
      if (event.action === 'USER_GRANT' && Object.keys(record(after.grant)).length) {
        changes.push({ label: 'Vai trò được cấp', before: 'Chưa được cấp', after: grant(after.grant) });
      }
      if (event.action === 'USER_REVOKE') {
        const revoked = Array.isArray(before.grants) ? before.grants.find(value => {
          const item = record(value);
          return after.grantid != null && (item.userroleid ?? item.grantid) === after.grantid;
        }) : undefined;
        changes.push({ label: 'Vai trò bị thu hồi', before: revoked ? grant(revoked) : 'Vai trò đã được cấp trước đó', after: 'Đã thu hồi' });
      }
      break;
    }
    case 'APPOINTMENT_CREATED':
      add('Phòng ban', undefined, after.departmentid, department);
      add('Chức danh', undefined, after.positionid, position);
      add('Loại hình làm việc', undefined, after.employmenttype, value => employmentLabels[String(value)] ?? 'Chưa xác định');
      break;
    case 'APPOINTMENT_ENDED': {
      const appointment = appointments.find(item => item.appointmentId === after.endid);
      changes.push({ label: 'Bổ nhiệm', before: appointment
        ? `${appointment.department} · ${appointment.position}` : 'Bổ nhiệm trước đó', after: 'Đã kết thúc' });
      break;
    }
    case 'INVITATION_RESENT':
      message = 'Đã tạo lời mời kích hoạt mới và đưa vào hàng chờ gửi email.';
      break;
    case 'INVITATION_ACCEPTED':
      message = 'Người dùng đã đặt mật khẩu và kích hoạt tài khoản.';
      break;
  }

  return {
    title: actionLabels[event.action] ?? 'Cập nhật tài khoản',
    changes,
    reason: typeof after.reason === 'string' ? after.reason.trim() : '',
    message: changes.length ? '' : message || 'Không có chi tiết thay đổi để hiển thị.',
  };
}
