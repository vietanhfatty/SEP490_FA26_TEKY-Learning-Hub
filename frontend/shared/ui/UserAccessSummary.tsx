import type { AccountAccess, AccessGrant } from '../auth/accountAccess';
import { getAccessibleFeatures } from './navigationFeatures';

function grantScope(grant: AccessGrant) {
  return grant.scopeType === 'GLOBAL' ? 'Toàn hệ thống' : grant.departmentName || 'Phòng ban được cấp';
}

export function UserAccessSummary({ access }: { access: AccountAccess }) {
  const features = getAccessibleFeatures({ roles: [...new Set(access.grants.map(grant => grant.role))], access });
  const groups = [...new Set(features.map(feature => feature.group))];
  return <section className="users-access-summary" aria-labelledby="users-access-title">
    <h3 id="users-access-title">Toàn bộ chức năng được cấp</h3>
    <p>Đăng nhập sẽ hiển thị tất cả chức năng dưới đây trên menu. Trang mở sau đăng nhập không giới hạn các chức năng này.</p>
    {features.length === 0 ? <p>Chưa có chức năng được cấp cho tài khoản.</p> : groups.map(group => <div key={group}>
      <h4>{group}</h4>
      <ul className="users-function-list">{features.filter(feature => feature.group === group).map(feature => {
        const grants = access.grants.filter(grant => feature.permission
          ? grant.permissions.includes(feature.permission) && (!feature.globalOnly || grant.scopeType === 'GLOBAL')
          : grant.role === feature.role);
        const scopes = grants.some(grant => grant.scopeType === 'GLOBAL') ? 'Toàn hệ thống'
          : [...new Set(grants.map(grantScope))].join(', ');
        const scope = feature.role === 'student' ? 'Dữ liệu học tập của học viên'
          : feature.role === 'parent' ? 'Học sinh được liên kết'
          : feature.role === 'teacher' && !feature.permission ? 'Theo lớp và phân công được giao' : scopes;
        return <li key={feature.id}><span>{feature.label}</span><small>{scope}</small></li>;
      })}</ul>
    </div>)}
    {access.permissions.length > 0 && <div>
      <h4>Quyền thao tác theo phạm vi</h4>
      <ul className="users-function-list">{access.permissions.map(permission => <li key={permission.code}>
        <span>{permission.description}</span>
        <small>{permission.isGlobal ? 'Toàn hệ thống' : [...new Set(access.grants
          .filter(grant => grant.permissions.includes(permission.code)).map(grantScope))].join(', ')}</small>
      </li>)}</ul>
    </div>}
  </section>;
}
