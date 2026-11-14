import React, { useRef, useState } from 'react';
import { IconShieldCheck, IconSearch, IconPlus, IconUsers, IconBookOpen, IconClock, IconActivity, IconSettings, IconChevronRight, IconX, IconSparkles, IconLayers } from '../common/Icons';
import { Badge } from '../common/Badge';

interface AdminDashboardProps {
  activeNavId?: string;
  userName?: string;
  onSelectNav?: (id: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ activeNavId = 'overview', userName = 'TEKY', onSelectNav }) => {
  const [localTab, setLocalTab] = useState('overview');
  const activeTab = onSelectNav ? activeNavId : localTab;
  const setActiveTab = (id: string) => { if (onSelectNav) onSelectNav(id); else setLocalTab(id); };
  const [filterRole, setFilterRole] = useState<string>('All');
  const [searchUser, setSearchUser] = useState('');
  const [catalogQuery, setCatalogQuery] = useState('');
  const [period, setPeriod] = useState<'Week' | 'Month'>('Week');
  const [editing, setEditing] = useState(false);
  const defaultWidgets = ['overview', 'progress', 'activity', 'actions', 'users', 'timeline'];
  const [widgets, setWidgets] = useState(defaultWidgets);
  const widgetDialog = useRef<HTMLDialogElement>(null);
  const createDialog = useRef<HTMLDialogElement>(null);
  const [creating, setCreating] = useState<'user' | 'course'>('user');
  const [notice, setNotice] = useState('');
  const [addedUsers, setAddedUsers] = useState<{ id: string; name: string; email: string; role: string; branch: string; status: string }[]>([]);
  const [addedCourses, setAddedCourses] = useState<{ code: string; title: string; subject: string; lessons: number; status: string }[]>([]);
  const courses = [
    { code: 'SCRATCH-01', title: 'Lập trình Scratch Game 3.0', subject: 'Scratch', lessons: 12, status: 'Published' },
    { code: 'PY-GAME-02', title: 'Python Ứng dụng & Mini Games', subject: 'Python', lessons: 14, status: 'Published' },
    { code: 'ROBO-WEDO-01', title: 'Chế tạo Robotics LEGO WeDo', subject: 'Robotics', lessons: 10, status: 'Published' },
    { code: 'AI-VISION-04', title: 'Nhập môn Trí tuệ Nhân tạo & Computer Vision', subject: 'AI', lessons: 16, status: 'Draft' },
    ...addedCourses,
  ];
  const widgetNames: Record<string, string> = { overview: 'Overview', progress: "Courses' progress status", activity: 'Portal activity', actions: 'Quick actions', users: 'Users', timeline: 'Timeline' };
  const openCreate = (type: 'user' | 'course') => { setNotice(''); setCreating(type); createDialog.current?.showModal(); };
  const moveWidget = (id: string, direction: number) => setWidgets((current) => {
    const next = [...current]; const index = next.indexOf(id); const target = index + direction;
    if (target < 0 || target >= next.length) return current;
    [next[index], next[target]] = [next[target], next[index]]; return next;
  });

  const baseUsers = [
    { id: 'U-001', name: 'Nguyễn Minh Quân', email: 'quan.nm@teky.edu.vn', role: 'Student', branch: 'Online Campus', status: 'Active' },
    { id: 'U-002', name: 'Trần Thu Trang', email: 'trang.tt@parent.com', role: 'Parent', branch: 'Cầu Giấy', status: 'Active' },
    { id: 'U-003', name: 'Hoàng Văn Nam', email: 'nam.hv@teky.edu.vn', role: 'Teacher', branch: 'Ba Đình & Online', status: 'Active' },
    { id: 'U-004', name: 'Đỗ Thị Hồng', email: 'hong.dt@teky.edu.vn', role: 'Academic Manager', branch: 'Hà Nội Region', status: 'Active' },
    { id: 'U-005', name: 'Admin Kỹ Thuật', email: 'admin@teky.edu.vn', role: 'System Admin', branch: 'Headquarter', status: 'Active' },
    { id: 'U-006', name: 'Lê Văn Tạm Khóa', email: 'tamkhoa@teky.edu.vn', role: 'Student', branch: 'Tân Bình', status: 'Suspended' },
  ];

  const branches = [
    { id: 'BR-01', name: 'Cơ sở TEKY Cầu Giấy', address: 'Tầng 5, Tòa nhà Mac Plaza, Cầu Giấy, Hà Nội', labs: 8, students: 240, teachers: 16, lead: 'Lê Mạnh Hùng', status: 'Active' },
    { id: 'BR-02', name: 'Cơ sở TEKY Ba Đình', address: 'Số 9 Kim Mã, Ba Đình, Hà Nội', labs: 6, students: 180, teachers: 12, lead: 'Nguyễn Phương Thảo', status: 'Active' },
    { id: 'BR-03', name: 'Cơ sở TEKY Tân Bình', address: '34 Hoàng Hoa Thám, Tân Bình, TP.HCM', labs: 10, students: 320, teachers: 22, lead: 'Vũ Văn Hoàng', status: 'Active' },
    { id: 'BR-04', name: 'Cơ sở TEKY Quận 7', address: '142 Nguyễn Thị Thập, Quận 7, TP.HCM', labs: 6, students: 190, teachers: 14, lead: 'Trần Lan Anh', status: 'Active' },
    { id: 'BR-ONLINE', name: 'TEKY Online STEAM Campus', address: 'Phòng học ảo tích hợp Cloud WebRTC & Code Editor', labs: 20, students: 450, teachers: 28, lead: 'Đỗ Thị Hồng', status: 'Active' },
  ];

  const auditLogs = [
    { time: '13:00:24', actor: 'nam.hv', role: 'Teacher', action: 'Submit Attendance', target: 'Class SCRATCH-01', ip: '118.70.12.45', status: 'Success' },
    { time: '12:45:10', actor: 'hong.dt', role: 'Manager', action: 'Modify Timetable', target: 'Class PY-02 Room Lab 201', ip: '14.162.88.20', status: 'Success' },
    { time: '11:15:02', actor: 'unknown_ip', role: 'Anonymous', action: 'Failed Login Attempt', target: 'admin@teky.edu.vn', ip: '203.113.152.9', status: 'Warning' },
    { time: '09:30:18', actor: 'admin', role: 'Admin', action: 'Create New User', target: 'Student TEKY-2026-105', ip: '192.168.1.10', status: 'Success' },
    { time: '08:15:40', actor: 'auth_system', role: 'System', action: 'User Logout & Revoke Session', target: 'Session US-904 (quan.nm)', ip: '118.70.12.45', status: 'Success' },
  ];

  const users = [...baseUsers, ...addedUsers];
  const activeUsers = users.filter((user) => user.status === 'Active');
  const userGroups = [
    { label: 'Admins', count: activeUsers.filter((user) => user.role === 'System Admin').length, color: '#0169ff' },
    { label: 'Instructors', count: activeUsers.filter((user) => user.role === 'Teacher').length, color: '#0046ab' },
    { label: 'Learners', count: activeUsers.filter((user) => user.role === 'Student').length, color: '#002a67' },
    { label: 'Other roles', count: activeUsers.filter((user) => !['System Admin', 'Teacher', 'Student'].includes(user.role)).length, color: '#a6c6f8' },
  ];
  let angle = 0;
  const donut = userGroups.map((group) => { const start = angle; angle += activeUsers.length ? group.count / activeUsers.length * 360 : 0; return `${group.color} ${start}deg ${angle}deg`; }).join(', ');
  const activity = period === 'Week'
    ? [{ label: 'Mon', logins: 2, completed: 0 }, { label: 'Tue', logins: 4, completed: 0 }, { label: 'Wed', logins: 1, completed: 0 }, { label: 'Thu', logins: 9, completed: 0 }, { label: 'Fri', logins: 6, completed: 0 }, { label: 'Sat', logins: 3, completed: 0 }, { label: 'Sun', logins: 0, completed: 0 }]
    : [{ label: 'Week 1', logins: 5, completed: 0 }, { label: 'Week 2', logins: 9, completed: 0 }, { label: 'Week 3', logins: 7, completed: 0 }, { label: 'Week 4', logins: 4, completed: 0 }];

  const filteredUsers = users.filter((u) => {
    const matchRole = filterRole === 'All' || u.role === filterRole;
    const matchSearch = u.name.toLowerCase().includes(searchUser.toLowerCase()) || u.email.toLowerCase().includes(searchUser.toLowerCase());
    return matchRole && matchSearch;
  });

  function createPreview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const name = String(values.get('name') || '').trim();
    const identifier = String(values.get('identifier') || '').trim();
    if (!name || !identifier) return;
    if (creating === 'user') {
      if (users.some((user) => user.email.toLowerCase() === identifier.toLowerCase())) { setNotice('Email đã tồn tại trong dữ liệu minh họa.'); return; }
      setAddedUsers((current) => [...current, { id: `DEMO-${users.length + 1}`, name, email: identifier, role: String(values.get('role') || 'Student'), branch: 'Online Campus', status: 'Active' }]);
    } else {
      if (courses.some((course) => course.code.toLowerCase() === identifier.toLowerCase())) { setNotice('Mã khóa học đã tồn tại trong dữ liệu minh họa.'); return; }
      setAddedCourses((current) => [...current, { code: identifier, title: name, subject: 'STEAM', lessons: Number(values.get('lessons') || 1), status: 'Draft' }]);
    }
    form.reset(); createDialog.current?.close();
    setNotice(`Đã thêm ${creating === 'user' ? 'người dùng' : 'khóa học'} vào dữ liệu minh họa của phiên này.`);
  }
  const creation = <dialog ref={createDialog} className="admin-dialog" aria-labelledby="admin-create-title"><form onSubmit={createPreview}><div className="admin-dialog-title"><h2 id="admin-create-title">{creating === 'user' ? 'Add user' : 'Add course'}</h2><button type="button" className="lms-icon-button" aria-label="Close" onClick={() => createDialog.current?.close()}><IconX size={20} /></button></div><p>Thao tác này chỉ thay đổi dữ liệu minh họa trong phiên xem thử.</p><label>{creating === 'user' ? 'Full name' : 'Course name'}<input name="name" required maxLength={150} /></label><label>{creating === 'user' ? 'Email' : 'Course code'}<input name="identifier" type={creating === 'user' ? 'email' : 'text'} required maxLength={150} /></label>{creating === 'user' ? <label>Role<select name="role">{['Student','Parent','Teacher','Academic Manager','System Admin'].map((role) => <option key={role}>{role}</option>)}</select></label> : <label>Lessons<input name="lessons" type="number" min={1} max={100} defaultValue={12} required /></label>}{notice && <p role="status">{notice}</p>}<div className="admin-dialog-actions"><button type="button" className="admin-outline-button" onClick={() => createDialog.current?.close()}>Cancel</button><button type="submit" className="admin-primary-button">{creating === 'user' ? 'Add user' : 'Add course'}</button></div></form></dialog>;

  if (activeTab === 'overview') return (
    <div className="admin-home">
      <div className="admin-page-heading"><h1><IconSparkles size={25} />Welcome, {userName}!</h1><div><button className="admin-outline-button" onClick={() => widgetDialog.current?.showModal()}>Add widgets</button><button className={`admin-outline-button admin-edit-button${editing ? ' is-active' : ''}`} aria-label={editing ? 'Finish editing widgets' : 'Edit dashboard'} aria-pressed={editing} onClick={() => setEditing(!editing)}><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-7"/><path d="m16 3 5 5M10 14l-1 4 4-1L22 8l-4-4z"/></svg></button></div></div>
      <p className="admin-demo-label">Dữ liệu minh họa TEKY</p>
      {notice && <p className="admin-status" role="status">{notice}</p>}
      <div className="admin-widget-grid">
        {widgets.map((widget, index) => <section className={`admin-widget admin-widget-${widget}${editing ? ' is-editing' : ''}`} key={widget} aria-label={widgetNames[widget]}>
          {editing && <div className="admin-widget-controls"><button disabled={index === 0} aria-label={`Move ${widgetNames[widget]} up`} onClick={() => moveWidget(widget, -1)}>↑</button><button disabled={index === widgets.length - 1} aria-label={`Move ${widgetNames[widget]} down`} onClick={() => moveWidget(widget, 1)}>↓</button><button aria-label={`Hide ${widgetNames[widget]}`} onClick={() => setWidgets((current) => current.filter((id) => id !== widget))}><IconX size={17} /></button></div>}
          {widget === 'overview' && <><h2>Overview</h2><dl className="admin-overview-list">{[{ label: 'Active users', value: activeUsers.length, icon: IconUsers }, { label: 'Assigned courses', value: 0, icon: IconBookOpen }, { label: 'Groups', value: 0, icon: IconUsers }, { label: 'Training time', value: '0h 0m', icon: IconClock }, { label: 'Completion rate', value: '0.00%', icon: IconActivity }].map((metric) => <div key={metric.label}><dt><metric.icon size={22} />{metric.label}</dt><dd>{metric.value}</dd></div>)}</dl></>}
          {widget === 'progress' && <><button className="admin-widget-heading-link" onClick={() => setActiveTab('courses')}><h2>Courses' progress status</h2><IconChevronRight size={20} /></button><div className="admin-no-stats"><IconBookOpen size={45} /><h3>No stats to show</h3><p>Chưa có hoạt động học tập được ghi nhận.</p><button className="admin-text-button" onClick={() => setActiveTab('courses')}>Go to courses</button></div></>}
          {widget === 'activity' && <><div className="admin-widget-heading"><h2>Portal activity</h2><label><span className="lms-sr-only">Activity period</span><select value={period} onChange={(event) => setPeriod(event.target.value as 'Week' | 'Month')}><option>Week</option><option>Month</option></select></label></div><div className="admin-activity-chart" role="img" aria-label={`Dữ liệu minh họa: ${activity.map((item) => `${item.label}: ${item.logins} logins, ${item.completed} completions`).join('; ')}`}><div className="admin-chart-y">{[10,8,6,4,2,0].map((value) => <span key={value}>{value}</span>)}</div><div className="admin-chart-plot"><div className="admin-chart-grid">{[0,1,2,3,4,5].map((line) => <i key={line} />)}</div><div className="admin-chart-columns">{activity.map((item) => <div className="admin-chart-column" key={item.label}><div><span className="admin-login-bar" style={{ height: `${item.logins * 10}%` }} /><span className="admin-completion-bar" style={{ height: `${item.completed * 10}%` }} /></div><span>{item.label}</span></div>)}</div></div></div><div className="admin-chart-legend"><span><i style={{ background: '#247dff' }} />Logins</span><span><i style={{ background: '#209066' }} />Course completions</span></div></>}
          {widget === 'actions' && <><h2>Quick actions</h2><div className="admin-quick-actions"><button onClick={() => openCreate('user')}><IconUsers size={22} />Add user</button><button onClick={() => openCreate('course')}><IconBookOpen size={22} />Add course</button><button onClick={() => setActiveTab('settings')}><IconSettings size={22} />Portal settings</button><button onClick={() => setActiveTab('groups')}><IconUsers size={22} />Groups</button><button onClick={() => setActiveTab('audit')}><IconActivity size={22} />Custom reports</button></div></>}
          {widget === 'users' && <><button className="admin-widget-heading-link" onClick={() => setActiveTab('users')}><h2>Users</h2><IconChevronRight size={19} /><strong>{activeUsers.length}</strong></button><div className="admin-users-donut" role="img" aria-label={userGroups.map((group) => `${group.label}: ${group.count}`).join(', ')} style={{ background: activeUsers.length ? `conic-gradient(${donut})` : '#e8edf4' }}><span>{activeUsers.length}<small>active users</small></span></div><div className="admin-chart-legend">{userGroups.map((group) => <span key={group.label}><i style={{ background: group.color }} />{group.label} ({group.count})</span>)}</div></>}
          {widget === 'timeline' && <><button className="admin-widget-heading-link" onClick={() => setActiveTab('audit')}><h2>Timeline</h2><IconChevronRight size={19} /></button><ol className="admin-timeline">{auditLogs.map((log) => <li key={log.time}><i className={log.status === 'Warning' ? 'is-warning' : ''} /><div><strong>{log.actor}</strong> {log.action}<small>{log.target}</small></div><time>{log.time}</time></li>)}</ol></>}
        </section>)}
      </div>
      {!widgets.length && <div className="admin-widget admin-no-stats"><IconLayers size={36} /><h2>Your dashboard is ready to customize</h2><button className="admin-outline-button" onClick={() => widgetDialog.current?.showModal()}>Add widgets</button></div>}
      <dialog ref={widgetDialog} className="admin-dialog" aria-labelledby="widget-dialog-title"><div className="admin-dialog-title"><h2 id="widget-dialog-title">Add widgets</h2><button className="lms-icon-button" aria-label="Close" onClick={() => widgetDialog.current?.close()}><IconX size={20} /></button></div><p>Chọn nội dung bạn muốn hiển thị trên Home.</p><div className="admin-widget-options">{defaultWidgets.map((id) => <label key={id}><input type="checkbox" checked={widgets.includes(id)} onChange={(event) => setWidgets((current) => event.target.checked ? [...current, id] : current.filter((widget) => widget !== id))} />{widgetNames[id]}</label>)}</div><div className="admin-dialog-actions"><button className="admin-outline-button" onClick={() => setWidgets(defaultWidgets)}>Restore default</button><button className="admin-primary-button" onClick={() => widgetDialog.current?.close()}>Done</button></div></dialog>
      {creation}
    </div>
  );
  if (activeTab === 'courses') return <div className="admin-home"><div className="admin-page-heading"><h1>Courses</h1><button className="admin-primary-button" onClick={() => openCreate('course')}><IconPlus size={18} />Add course</button></div><p className="admin-demo-label">Dữ liệu minh họa TEKY</p>{notice && <p role="status" className="admin-status">{notice}</p>}<label className="admin-catalog-search"><IconSearch size={20} /><input type="search" placeholder="Search courses" aria-label="Search courses" value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} /></label><div className="admin-catalog-grid">{courses.filter((course) => `${course.title} ${course.code}`.toLocaleLowerCase('vi').includes(catalogQuery.toLocaleLowerCase('vi'))).map((course) => <article key={course.code} className="admin-widget admin-catalog-card"><div><IconBookOpen size={30} /><span>{course.subject}</span></div><h2>{course.title}</h2><p>{course.code}</p><footer><span>{course.lessons} lessons</span><span>{course.status}</span></footer></article>)}</div>{!courses.some((course) => `${course.title} ${course.code}`.toLocaleLowerCase('vi').includes(catalogQuery.toLocaleLowerCase('vi'))) && <div className="admin-no-stats"><h2>No courses found</h2><button className="admin-text-button" onClick={() => setCatalogQuery('')}>Clear search</button></div>}{creation}</div>;
  if (['groups','notifications','settings'].includes(activeTab)) return <div className="admin-home"><div className="admin-page-heading"><h1>{activeTab === 'groups' ? 'Groups' : activeTab === 'notifications' ? 'Notifications' : 'Account & Settings'}</h1></div><section className="admin-widget admin-no-stats">{activeTab === 'groups' ? <IconUsers size={42} /> : activeTab === 'notifications' ? <IconActivity size={42} /> : <IconSettings size={42} />}<h2>{activeTab === 'groups' ? 'No groups to show' : activeTab === 'notifications' ? 'No notifications to show' : 'TEKY Learning Hub'}</h2><p>{activeTab === 'settings' ? 'Không gian quản trị dành cho TEKY STEAM Academy.' : 'Dữ liệu sẽ xuất hiện khi dịch vụ quản trị được kết nối.'}</p><button className="admin-text-button" onClick={() => setActiveTab('overview')}>Back to Home</button></section></div>;

  return (
    <div className="lms-legacy-panel space-y-8 py-6">
      <div className="admin-page-heading"><h1>{activeTab === 'users' ? 'Users' : activeTab === 'branches' ? 'Branches' : 'Reports'}</h1></div>
      <p className="admin-demo-label">Dữ liệu minh họa TEKY</p>
      {notice && <p role="status" className="admin-status">{notice}</p>}
      {creation}
      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 whitespace-nowrap transition-colors ${
            activeTab === 'overview'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Giám sát Hệ thống & Hạ tầng
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 whitespace-nowrap transition-colors ${
            activeTab === 'users'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Người dùng & Phân quyền RBAC
        </button>
        <button
          onClick={() => setActiveTab('branches')}
          className={`pb-3 whitespace-nowrap transition-colors ${
            activeTab === 'branches'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Cơ sở Đào tạo & Phòng Lab
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 whitespace-nowrap transition-colors ${
            activeTab === 'audit'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Nhật ký An ninh & Audit Logs
        </button>
      </div>

      {/* Content: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">Tài nguyên Máy chủ & Dịch vụ (.NET 9 Clean Architecture)</h3>
                  <p className="text-xs text-slate-500">Giám sát tải CPU, RAM và thời gian phản hồi của API Controllers</p>
                </div>
                <Badge variant="success">Hoạt động bình thường</Badge>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-xs text-slate-500">CPU Usage</p>
                  <p className="text-2xl font-black text-blue-600 tabular-nums mt-1">12.4%</p>
                  <p className="text-[10px] text-slate-400 mt-1">8 Cores Intel Xeon</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-xs text-slate-500">RAM Allocation</p>
                  <p className="text-2xl font-black text-emerald-600 tabular-nums mt-1">4.2 / 16 GB</p>
                  <p className="text-[10px] text-slate-400 mt-1">26% Dung lượng</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-xs text-slate-500">API Latency p95</p>
                  <p className="text-2xl font-black text-purple-600 tabular-nums mt-1">28 ms</p>
                  <p className="text-[10px] text-slate-400 mt-1">Khuyến nghị &lt; 200ms</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Thao tác Quản trị viên nhanh</h3>
              <div className="space-y-2.5">
                <button
                  onClick={() => setActiveTab('users')}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/60 text-xs font-semibold text-left flex items-center justify-between"
                >
                  <span>Cấp quyền tài khoản mới</span>
                  <span className="text-blue-500">→</span>
                </button>
                <button
                  onClick={() => setActiveTab('audit')}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-left flex items-center justify-between"
                >
                  <span>Kiểm tra Audit Log bảo mật</span>
                  <span className="text-slate-400">→</span>
                </button>
                <button
                  onClick={() => alert('Đã kích hoạt sao lưu cơ sở dữ liệu khẩn cấp')}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-left flex items-center justify-between"
                >
                  <span>Kích hoạt Sao lưu DB ngay</span>
                  <span className="text-slate-400">→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content: Users & RBAC */}
      {(activeTab === 'users' || activeTab === 'overview') && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Quản trị Người dùng & Phân quyền RBAC</h3>
              <p className="text-xs text-slate-500">Kiểm soát danh tính, phân quyền 5 roles: Học sinh, Phụ huynh, GV, Quản lý, Admin</p>
            </div>

            <button
              onClick={() => openCreate('user')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <IconPlus size={16} /> Thêm tài khoản
            </button>
          </div>

          {/* Filter Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Tìm kiếm theo tên hoặc email..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-full px-3.5 py-2 pl-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-xs focus:ring-2 focus:ring-blue-500"
              />
              <IconSearch size={14} className="absolute left-3 top-3 text-slate-400" />
            </div>

            <div className="flex gap-2 flex-wrap">
              {['All', 'Student', 'Parent', 'Teacher', 'Academic Manager', 'System Admin'].map((role) => (
                <button
                  key={role}
                  onClick={() => setFilterRole(role)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    filterRole === role
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Mã UID</th>
                  <th className="p-3">Họ và tên</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Vai trò (Role)</th>
                  <th className="p-3">Cơ sở (Branch)</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="p-3 font-semibold text-slate-900 dark:text-white tabular-nums">{u.id}</td>
                    <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{u.name}</td>
                    <td className="p-3 text-slate-500">{u.email}</td>
                    <td className="p-3">
                      <Badge variant={u.role === 'Student' ? 'info' : u.role === 'Teacher' ? 'success' : u.role === 'Parent' ? 'accent' : 'neutral'}>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="p-3 text-slate-500">{u.branch}</td>
                    <td className="p-3">
                      <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${u.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                      <span className={u.status === 'Active' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}>
                        {u.status}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button className="text-blue-600 font-semibold hover:underline">Sửa quyền</button>
                      <button className="text-slate-400 hover:text-rose-600 font-semibold">Khóa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Content: Branches */}
      {activeTab === 'branches' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Cơ sở Đào tạo & Phòng Lab STEAM</h3>
              <p className="text-xs text-slate-500">Mạng lưới chi nhánh học tập, phòng lab thực hành và cơ sở trực tuyến</p>
            </div>
            <button
              onClick={() => alert('Mở form thêm chi nhánh hoặc phòng lab mới')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <IconPlus size={16} /> Thêm cơ sở / Lab
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {branches.map((b) => (
              <div key={b.id} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{b.name}</h4>
                  <Badge variant="success">Hoạt động</Badge>
                </div>
                <p className="text-xs text-slate-500">{b.address}</p>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-600 text-center text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Phòng Lab</span>
                    <span className="font-bold tabular-nums text-slate-900 dark:text-white">{b.labs}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Học sinh</span>
                    <span className="font-bold tabular-nums text-blue-600">{b.students}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Giáo viên</span>
                    <span className="font-bold tabular-nums text-emerald-600">{b.teachers}</span>
                  </div>
                </div>
                <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Trưởng CS: <strong className="text-slate-600 dark:text-slate-300">{b.lead}</strong></span>
                  <button className="text-blue-600 hover:underline font-semibold">Chi tiết →</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content: Audit Logs */}
      {(activeTab === 'audit' || activeTab === 'overview') && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <IconShieldCheck size={18} className="text-blue-600" /> Nhật ký An ninh & Audit Logs thời gian thực
              </h3>
              <p className="text-xs text-slate-500">Ghi lại toàn bộ hành vi thay đổi quyền, phân công và đăng nhập quan trọng</p>
            </div>
            <Badge variant="neutral">Auto-refresh: 10s</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left font-mono">
              <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Thời gian</th>
                  <th className="p-3">Người thực hiện</th>
                  <th className="p-3">Vai trò</th>
                  <th className="p-3">Hành động</th>
                  <th className="p-3">Đối tượng tác động</th>
                  <th className="p-3">Địa chỉ IP</th>
                  <th className="p-3">Kết quả</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                {auditLogs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="p-3 text-slate-400">{log.time}</td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">{log.actor}</td>
                    <td className="p-3">{log.role}</td>
                    <td className="p-3 font-semibold text-blue-600 dark:text-blue-400">{log.action}</td>
                    <td className="p-3 text-slate-500">{log.target}</td>
                    <td className="p-3 text-slate-400">{log.ip}</td>
                    <td className="p-3">
                      <Badge variant={log.status === 'Success' ? 'success' : 'warning'}>
                        {log.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
