import type { AuditEvent, Catalog, Detail } from '../api-client/adminUsers';
import { describeUserAudit } from './adminUserAudit';

type Props = {
  events: AuditEvent[];
  catalog: Catalog | null;
  appointments: Detail['appointments'];
};

export function UserAuditHistory({ events, catalog, appointments }: Props) {
  if (!events.length) return <p>Chưa có thay đổi.</p>;

  return <ul className="users-audit">
    {events.map((event, index) => {
      const { title, changes, reason, message } = describeUserAudit(event, catalog, appointments);
      return <li key={`${event.createdAt}-${index}`}>
        <strong>{title}</strong>
        <div className="users-audit-meta">
          <time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString('vi-VN')}</time>
          <span>Người thực hiện: {event.actorUserId == null ? 'Hệ thống' : `Tài khoản #${event.actorUserId}`}</span>
        </div>
        <details>
          <summary>Chi tiết thay đổi</summary>
          {changes.length > 0 && <div className="users-audit-comparison">
            <table>
              <caption className="users-audit-caption">Nội dung thay đổi: {title.toLowerCase()}</caption>
              <thead><tr><th scope="col">Nội dung</th><th scope="col">Trước thay đổi</th><th scope="col">Sau thay đổi</th></tr></thead>
              <tbody>{changes.map(change => <tr key={change.label}>
                <th scope="row">{change.label}</th><td>{change.before}</td><td>{change.after}</td>
              </tr>)}</tbody>
            </table>
          </div>}
          {reason && <p className="users-audit-reason"><strong>Lý do:</strong> {reason}</p>}
          {message && <p>{message}</p>}
        </details>
      </li>;
    })}
  </ul>;
}
