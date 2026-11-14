import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { getStudentData, sessionStatus } from '../api-client/studentClasses';
import type { StudentClass, StudentClasses, StudentSession } from '../api-client/studentClasses';
import { IconArrowRight, IconBookOpen, IconCalendar, IconChevronLeft, IconChevronRight, IconClock, IconSearch, IconUser } from './Icons';
import { StudentSessionWork } from './StudentSessionWork';
import './StudentClassesView.css';

const timetablePath = '/dashboard/timetable';
const zone = 'Asia/Ho_Chi_Minh';
const dayMs = 86_400_000;
const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: zone });
const shortDate = new Intl.DateTimeFormat('vi-VN', { timeZone: zone, day: '2-digit', month: '2-digit' });
const longDate = new Intl.DateTimeFormat('vi-VN', { timeZone: zone, dateStyle: 'full' });
const time = new Intl.DateTimeFormat('vi-VN', { timeZone: zone, hour: '2-digit', minute: '2-digit' });
const when = (session: StudentSession) => `${time.format(Date.parse(session.startsAt))} – ${time.format(Date.parse(session.endsAt))}`;
const sessionPath = (session: StudentSession) => `${timetablePath}/${session.sessionId}`;
const fold = (value: string) => value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replaceAll('đ', 'd');
const finished = (item: StudentClass) => item.enrollmentStatus === 'Completed' || item.status === 'Completed';
const progress = (item: StudentClass) => Math.max(0, Math.min(100, item.progressPercent));
const filters = [
  { id: 'all', label: 'Tất cả' },
  { id: 'active', label: 'Đang học' },
  { id: 'completed', label: 'Đã học' },
] as const;
type Filter = typeof filters[number]['id'];

function Status({ session, now }: { session: StudentSession; now: number }) {
  const status = sessionStatus(session, now);
  return <span className="sc-status" data-status={status.kind}>{status.label}</span>;
}

function remaining(start: string, now: number) {
  const minutes = Math.ceil((Date.parse(start) - now) / 60_000);
  if (minutes <= 0) return 'Đang diễn ra';
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor(minutes % 1440 / 60);
  if (days > 0) return `Còn ${days} ngày ${hours} giờ`;
  if (hours > 0) return `Còn ${hours} giờ ${minutes % 60} phút`;
  return `Còn ${minutes} phút`;
}

function useStudentResource<T>(path: string | null) {
  const [attempt, setAttempt] = useState(0);
  const [response, setResponse] = useState<{ path: string; attempt: number; data?: T; error?: string }>();
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    getStudentData<T>(path, controller.signal).then(
      data => {
        if (!controller.signal.aborted) setResponse({ path, attempt, data });
      },
      error => {
        if (!controller.signal.aborted) setResponse({ path, attempt, error: error instanceof Error ? error.message : 'Không thể tải dữ liệu.' });
      },
    );
    return () => controller.abort();
  }, [path, attempt]);
  const current = response?.path === path && response.attempt === attempt ? response : undefined;
  return { data: current?.data, error: current?.error, loading: Boolean(path && !current), retry: () => setAttempt(value => value + 1) };
}

interface StudentClassesViewProps {
  sessionParam?: string;
  onNavigate: (path: string) => void;
}

export function StudentClassesView({ sessionParam, onNavigate }: StudentClassesViewProps) {
  const isDetail = sessionParam !== undefined;
  const validSession = isDetail && /^\d+$/.test(sessionParam) && Number(sessionParam) > 0 && Number(sessionParam) <= 2_147_483_647;
  const classes = useStudentResource<StudentClasses>(isDetail ? null : 'classes');
  const detail = useStudentResource<StudentSession>(validSession ? `sessions/${sessionParam}` : null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<number>();
  const [weekOffset, setWeekOffset] = useState(0);
  const [now, setNow] = useState(Date.now);
  const classPanel = useRef<HTMLElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  function navigate(event: MouseEvent<HTMLAnchorElement>, path: string) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    onNavigate(path);
    window.scrollTo(0, 0);
  }

  const allClasses = classes.data?.classes ?? [];
  const term = fold(query.trim());
  const visible = allClasses.filter(item =>
    (filter === 'all' || (filter === 'completed' ? finished(item) : item.enrollmentStatus === 'Active' && !finished(item))) &&
    fold(`${item.name} ${item.classCode} ${item.courseName} ${item.courseCode}`).includes(term));
  const selected = visible.find(item => item.classId === selectedId) ?? visible[0];
  const next = allClasses
    .filter(item => item.enrollmentStatus === 'Active' && !finished(item))
    .flatMap(item => item.sessions)
    .filter(session => session.status === 'Scheduled' && Date.parse(session.endsAt) > now)
    .sort((first, second) => Date.parse(first.startsAt) - Date.parse(second.startsAt))[0];
  const todayKey = dayKey.format(now);
  const today = Date.parse(`${todayKey}T00:00:00+07:00`);
  const weekday = new Date(today + 7 * 3_600_000).getUTCDay();
  const monday = today + (weekOffset * 7 - (weekday + 6) % 7) * dayMs;
  const week = Array.from({ length: 7 }, (_, index) => monday + index * dayMs);
  const resource = isDetail ? detail : classes;
  const error = isDetail && !validSession ? 'Đường dẫn buổi học không hợp lệ.' : resource.error;

  if (isDetail) {
    const session = detail.data;
    return (
      <section className="sc-view" aria-label="Chi tiết buổi học">
        <a className="sc-button sc-back" href={timetablePath} onClick={event => navigate(event, timetablePath)}>
          <IconChevronLeft size={18} aria-hidden="true" /> Về lớp học của em
        </a>
        {resource.loading && <div className="sc-panel sc-loading" role="status">Đang tải buổi học…</div>}
        {error && <div className="sc-panel sc-error" role="alert"><h1>Chưa thể mở buổi học</h1><p>{error}</p>
          {validSession && <button type="button" className="sc-button" onClick={resource.retry}>Thử lại</button>}
        </div>}
        {session && <>
          <header className="sc-hero sc-lesson-hero">
            <p className="sc-kicker">{session.courseName}</p>
            <h1>{session.title}</h1>
            <p className="sc-meta"><IconCalendar size={18} aria-hidden="true" /> {longDate.format(Date.parse(session.startsAt))} · {when(session)}</p>
            <Status session={session} now={now} />
          </header>
          <div className="sc-detail-grid">
            <article className="sc-panel">
              <h2>Nội dung buổi học</h2>
              <p className="sc-lesson-content">{session.content || 'Giáo viên chưa cập nhật nội dung cho buổi học này.'}</p>
            </article>
            <div className="sc-stack">
              <section className="sc-panel">
                <h2>Thông tin buổi học</h2>
                <dl className="sc-facts">
                  <div><dt>Khóa học</dt><dd>{session.courseCode} · ID {session.courseId}</dd></div>
                  <div><dt>Lớp học</dt><dd>{session.classCode} · ID {session.classId}</dd></div>
                  <div><dt>Buổi học</dt><dd>ID {session.sessionId}</dd></div>
                  {session.lessonId !== null && <div><dt>Bài học</dt><dd>ID {session.lessonId}</dd></div>}
                  <div><dt>Giáo viên</dt><dd>{session.teacherName ?? 'Chưa phân công'}</dd></div>
                  <div><dt>Phòng học</dt><dd>{session.roomName ?? 'Chưa bố trí'}</dd></div>
                </dl>
              </section>
            </div>
          </div>
          <StudentSessionWork key={session.sessionId} session={session} />
        </>}
      </section>
    );
  }

  return (
    <section className="sc-view" aria-labelledby="sc-heading">
      <header className="sc-hero">
        <div className="sc-hero-copy">
          <h1 id="sc-heading">Lớp học của em</h1>
          {classes.data && <p className="sc-meta"><IconUser size={18} aria-hidden="true" /> {classes.data.fullName} · {classes.data.studentCode}</p>}
        </div>
        {next && <div className="sc-next">
          <p className="sc-kicker">Buổi học tiếp theo · {next.classCode}</p>
          <h2>{next.title}</h2>
          <p className="sc-meta"><IconClock size={16} aria-hidden="true" /> {shortDate.format(Date.parse(next.startsAt))} · {when(next)} · {remaining(next.startsAt, now)}</p>
          <a className="sc-button sc-primary" href={sessionPath(next)} onClick={event => navigate(event, sessionPath(next))}>Vào lớp <IconArrowRight size={18} aria-hidden="true" /></a>
        </div>}
      </header>
      {classes.loading && <div className="sc-panel sc-loading" role="status">Đang tải danh sách lớp…</div>}
      {error && <div className="sc-panel sc-error" role="alert"><h2>Chưa thể tải lớp học</h2><p>{error}</p>
        <button type="button" className="sc-button" onClick={classes.retry}>Thử lại</button>
        <a className="sc-button" href="/login" onClick={event => navigate(event, '/login')}>Đăng nhập</a>
      </div>}
      {classes.data && allClasses.length === 0 && <div className="sc-panel sc-empty"><IconBookOpen size={28} aria-hidden="true" /><h2>Em chưa có lớp học</h2><p>Lớp sẽ xuất hiện sau khi trung tâm hoàn tất ghi danh.</p><button type="button" className="sc-button" onClick={classes.retry}>Tải lại</button></div>}
      {classes.data && allClasses.length > 0 && <>
        <div className="sc-tools">
          <label className="sc-search"><IconSearch size={18} aria-hidden="true" /><input type="search" aria-label="Tìm lớp học" placeholder="Tên hoặc mã lớp, khóa học" value={query} onChange={event => { setQuery(event.target.value); setWeekOffset(0); }} /></label>
          <div className="sc-filters" role="group" aria-label="Trạng thái lớp học">
            {filters.map(option => <button key={option.id} type="button" className="sc-button" aria-pressed={filter === option.id} onClick={() => { setFilter(option.id); setWeekOffset(0); }}>{option.label}</button>)}
          </div>
        </div>
        <p className="sc-muted sc-count" role="status">{visible.length} lớp học</p>
        {!selected ? <div className="sc-panel sc-empty"><h2>Không tìm thấy lớp</h2><p>Thử tên hoặc mã khác.</p><button type="button" className="sc-button" onClick={() => { setFilter('all'); setQuery(''); setWeekOffset(0); }}>Xóa bộ lọc</button></div> : <>
          <div className="sc-class-grid">
            {visible.map(item => (
              <article className="sc-class-card" key={item.classId} data-selected={item.classId === selected.classId}>
                <div className="sc-class-strip">
                  <IconBookOpen size={22} aria-hidden="true" />
                  <span className="sc-status" data-status={finished(item) ? 'done' : item.enrollmentStatus === 'Active' ? 'upcoming' : 'ended'}>
                    {finished(item) ? 'Đã học' : item.enrollmentStatus === 'Active' ? 'Đang học' : 'Đã ngừng học'}
                  </span>
                </div>
                <div className="sc-card-body">
                  <p className="sc-kicker">{item.classCode}</p>
                  <h2>{item.name}</h2>
                  <p className="sc-muted">{item.courseName}</p>
                  <div className="sc-progress"><span>Tiến độ</span><strong>{progress(item)}%</strong></div>
                  <progress value={progress(item)} max={100} aria-label={`Tiến độ lớp ${item.name}`} />
                  <button type="button" className="sc-button" aria-label={`Xem lớp ${item.name}`} aria-controls="sc-selected-class" aria-pressed={item.classId === selected.classId} onClick={() => {
                    setSelectedId(item.classId);
                    setWeekOffset(0);
                    classPanel.current?.focus({ preventScroll: true });
                    classPanel.current?.scrollIntoView({ block: 'start' });
                  }}>Xem lớp <IconChevronRight size={17} aria-hidden="true" /></button>
                </div>
              </article>
            ))}
          </div>
          <div className="sc-agenda-grid">
            <section id="sc-selected-class" className="sc-panel" ref={classPanel} tabIndex={-1} aria-labelledby="sc-selected-heading">
              <p className="sc-kicker">{selected.classCode}</p>
              <h2 id="sc-selected-heading">{selected.name}</h2>
              <p className="sc-muted">{selected.courseCode} · ID khóa {selected.courseId} · ID lớp {selected.classId}</p>
              <p className="sc-meta sc-teacher"><IconUser size={17} aria-hidden="true" /> {selected.teacherName ?? 'Chưa phân công giáo viên'}</p>
              <h3 className="sc-subtitle">Các buổi học</h3>
              {selected.sessions.length === 0 ? <p className="sc-muted">Lớp chưa có lịch học.</p> : <ol className="sc-session-list">
                {selected.sessions.map((session, index) => <li key={session.sessionId}>
                  <a href={sessionPath(session)} onClick={event => navigate(event, sessionPath(session))}>
                    <span className="sc-session-number">{index + 1}</span>
                    <span className="sc-session-text"><strong>{session.title}</strong><small>{shortDate.format(Date.parse(session.startsAt))} · {when(session)} · ID {session.sessionId}</small></span>
                    <Status session={session} now={now} />
                  </a>
                </li>)}
              </ol>}
            </section>
            <aside className="sc-panel" aria-labelledby="sc-week-heading">
              <h2 id="sc-week-heading">Lịch tuần</h2>
              <p className="sc-muted">{shortDate.format(week[0])} – {shortDate.format(week[6])}</p>
              <div className="sc-week-nav">
                <button type="button" className="sc-button" aria-label="Tuần trước" onClick={() => setWeekOffset(value => value - 1)}><IconChevronLeft size={18} aria-hidden="true" /></button>
                <button type="button" className="sc-button" disabled={weekOffset === 0} onClick={() => setWeekOffset(0)}>Tuần này</button>
                <button type="button" className="sc-button" aria-label="Tuần sau" onClick={() => setWeekOffset(value => value + 1)}><IconChevronRight size={18} aria-hidden="true" /></button>
              </div>
              <ul className="sc-week-list">
                {week.map((day, index) => {
                  const key = dayKey.format(day);
                  const sessions = selected.sessions.filter(session => dayKey.format(Date.parse(session.startsAt)) === key);
                  return <li key={key} aria-current={key === todayKey ? 'date' : undefined}>
                    <strong>{index === 6 ? 'CN' : `T${index + 2}`} <small>{shortDate.format(day)}</small></strong>
                    {sessions.length === 0 ? <span className="sc-muted">Không có buổi học</span> : <div>
                      {sessions.map(session => <a key={session.sessionId} href={sessionPath(session)} onClick={event => navigate(event, sessionPath(session))}><strong>{when(session)}</strong><span>{session.title}</span></a>)}
                    </div>}
                  </li>;
                })}
              </ul>
            </aside>
          </div>
        </>}
      </>}
    </section>
  );
}
