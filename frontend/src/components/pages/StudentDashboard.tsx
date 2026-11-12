import { useEffect, useState } from 'react';
import { getStudentData, sessionStatus } from '../../services/studentClasses';
import type { StudentClasses, StudentSession } from '../../services/studentClasses';
import './StudentClasses.css';

const zone = 'Asia/Ho_Chi_Minh';
const dateText = (value: string) => new Date(value).toLocaleDateString('vi-VN', { timeZone: zone, weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
const timeText = (value: string) => new Date(value).toLocaleTimeString('vi-VN', { timeZone: zone, hour: '2-digit', minute: '2-digit' });
const dayKey = (value: string | number) => new Date(value).toLocaleDateString('en-CA', { timeZone: zone });
const sessionPath = (id: number) => `/dashboard/timetable/${id}`;

function countdown(startsAt: string, now: number) {
  const minutes = Math.ceil((Date.parse(startsAt) - now) / 60000);
  if (minutes <= 0) return 'Buổi học đang diễn ra';
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor(minutes % 1440 / 60);
  return `${days > 0 ? `${days} ngày ` : ''}${hours} giờ ${minutes % 60} phút`;
}

function SessionBadge({ session, now }: { session: StudentSession; now: number }) {
  const status = sessionStatus(session, now);
  return <span className={`student-status ${status.kind}`}>{status.label}</span>;
}

export function StudentDashboard() {
  const [data, setData] = useState<StudentClasses | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [path, setPath] = useState(window.location.pathname);
  const [detail, setDetail] = useState<StudentSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [weekOffset, setWeekOffset] = useState(0);
  const match = /^\/dashboard\/timetable\/(\d+)$/.exec(path);
  const detailId = match ? Number(match[1]) : null;
  const invalidPath = path.startsWith('/dashboard/timetable/') && detailId === null;

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => { window.removeEventListener('popstate', onPop); window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setDetail(null);
    const load = async () => {
      try {
        if (invalidPath) throw new Error('Đường dẫn buổi học không hợp lệ.');
        if (detailId !== null) {
          const result = await getStudentData<StudentSession>(`sessions/${detailId}`, controller.signal);
          if (!controller.signal.aborted) setDetail(result);
        } else {
          const result = await getStudentData<StudentClasses>('classes', controller.signal);
          if (!controller.signal.aborted) {
            setData(result);
            setSelectedClassId(previous => result.classes.some(c => c.classId === previous) ? previous : result.classes[0]?.classId ?? null);
          }
        }
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Không thể tải dữ liệu.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [detailId, invalidPath, retry]);

  function navigate(url: string) {
    window.history.pushState({}, '', url);
    setPath(url);
    window.scrollTo({ top: 0 });
  }

  const selected = data?.classes.find(c => c.classId === selectedClassId);
  const sessions = selected?.sessions ?? [];
  const next = selected?.enrollmentStatus === 'Active'
    ? sessions.find(s => s.status === 'Scheduled' && Date.parse(s.endsAt) > now)
    : undefined;
  const vietnamToday = new Date(`${dayKey(now)}T00:00:00+07:00`);
  const weekday = new Date(vietnamToday.getTime() + 7 * 3600000).getUTCDay();
  const monday = vietnamToday.getTime() - ((weekday + 6) % 7) * 86400000 + weekOffset * 7 * 86400000;
  const days = Array.from({ length: 7 }, (_, index) => monday + index * 86400000);

  return <section className="student-classes" aria-label="Lớp học của học sinh">
    <header className="student-heading">
      <div><p className="student-eyebrow">TEKY LEARNING HUB</p><h1>{detailId !== null ? 'Chi tiết buổi học' : 'Lớp học của em'}</h1>
        {data && detailId === null && <p>{data.fullName} · Mã học sinh {data.studentCode}</p>}</div>
      {(detailId !== null || invalidPath) && <button onClick={() => navigate('/dashboard/timetable')}>← Về lớp học</button>}
    </header>

    {loading ? <div className="student-panel student-loading" role="status">Đang tải dữ liệu lớp học…</div>
      : error ? <div className="student-panel student-error" role="alert"><h2>Chưa thể mở lớp học</h2><p>{error}</p><button onClick={() => setRetry(r => r + 1)}>Thử lại</button></div>
      : detail ? <>
        <article className="student-panel student-detail">
          <SessionBadge session={detail} now={now} />
          <p className="student-eyebrow">{detail.courseName}</p><h2>{detail.title}</h2>
          <p>{dateText(detail.startsAt)} · {timeText(detail.startsAt)} – {timeText(detail.endsAt)}</p>
          <dl className="student-identifiers">
            <div><dt>Khóa học</dt><dd>{detail.courseCode} · ID {detail.courseId}</dd></div>
            <div><dt>Lớp học</dt><dd>{detail.classCode} · ID {detail.classId}</dd></div>
            <div><dt>Buổi học</dt><dd>ID {detail.sessionId}</dd></div>
            <div><dt>Bài học</dt><dd>{detail.lessonId === null ? 'Chưa được gán' : `ID ${detail.lessonId}`}</dd></div>
            <div><dt>Giáo viên</dt><dd>{detail.teacherName ?? 'Chưa phân công'}{detail.teacherEmail && <small>{detail.teacherEmail}</small>}</dd></div>
            <div><dt>Phòng học</dt><dd>{detail.roomName ?? 'Chưa được bố trí'}</dd></div>
          </dl>
        </article>
        <div className="student-detail-grid">
          <article className="student-panel"><h2>Nội dung buổi học</h2><p className="student-lesson-content">{detail.content || 'Giáo viên chưa cập nhật nội dung cho buổi học này.'}</p></article>
          <article className="student-panel"><h2>Học liệu</h2>{detail.materials.length === 0 ? <p>Chưa có học liệu cho buổi học này.</p> : <ul className="student-materials">{detail.materials.map(material => <li key={material.materialId}><span>{material.materialType}</span>{/^https?:\/\//i.test(material.fileUrl) ? <a href={material.fileUrl} target="_blank" rel="noopener noreferrer">{material.title} ↗</a> : <p>{material.title} — liên kết chưa khả dụng</p>}</li>)}</ul>}</article>
        </div>
      </> : data?.classes.length === 0 ? <div className="student-panel"><h2>Em chưa có lớp học</h2><p>Lớp học sẽ xuất hiện khi trung tâm hoàn tất ghi danh cho tài khoản của em.</p></div> : selected && <>
        <nav className="student-class-tabs" aria-label="Chọn lớp học">{data?.classes.map(item => <button key={item.classId} aria-pressed={selectedClassId === item.classId} onClick={() => { setSelectedClassId(item.classId); setWeekOffset(0); }}>
          {item.classCode}{(item.enrollmentStatus === 'Completed' || item.status === 'Completed') && <span>Đã học</span>}</button>)}</nav>

        <div className="student-overview">
          <div className="student-main-column">
            <article className="student-panel student-next">
              <p className="student-eyebrow">{next && Date.parse(next.startsAt) <= now ? 'BUỔI HỌC ĐANG DIỄN RA' : 'BUỔI HỌC TIẾP THEO'}</p>
              {next ? <>
                <div className="student-next-title"><h2>{next.title}</h2><SessionBadge session={next} now={now} /></div>
                <p>Buổi {sessions.findIndex(s => s.sessionId === next.sessionId) + 1} / {sessions.length} · ID {next.sessionId}</p>
                <p>{dateText(next.startsAt)}</p><p>{timeText(next.startsAt)} – {timeText(next.endsAt)} ({Math.round((Date.parse(next.endsAt) - Date.parse(next.startsAt)) / 60000)} phút)</p>
                <p>GV: {next.teacherName ?? 'Chưa phân công'}{next.teacherEmail && ` · ${next.teacherEmail}`}</p>
                <button className="student-primary" onClick={() => navigate(sessionPath(next.sessionId))}>Vào lớp →</button>
                <div className="student-countdown"><span>{Date.parse(next.startsAt) > now ? 'Còn lại' : 'Trạng thái'}</span><strong>{countdown(next.startsAt, now)}</strong></div>
              </> : <><h2>Chưa có buổi học tiếp theo</h2><p>Em có thể xem lại các buổi đã học trong danh sách bên dưới.</p></>}
            </article>
            <article className="student-panel">
              <p className="student-eyebrow">{selected.courseName}</p><h2>{selected.name}</h2>
              <p className="student-codes">Khóa học {selected.courseCode} · ID {selected.courseId}<br />Lớp {selected.classCode} · ID {selected.classId}</p>
              <div className="student-progress"><span>Tiến độ học tập</span><strong>{selected.progressPercent}%</strong></div>
              <progress max="100" value={selected.progressPercent} aria-label="Tiến độ học tập" />
              <p>{sessions.filter(s => s.status === 'Done').length} / {sessions.filter(s => s.status !== 'Cancelled').length} buổi đã hoàn thành</p>
              <h3>Danh sách buổi học</h3>
              {sessions.length === 0 ? <p>Lớp chưa được xếp lịch.</p> : <ol className="student-sessions">{sessions.map((session, index) => <li key={session.sessionId}>
                <span className="student-session-number">{index + 1}</span><div><a href={sessionPath(session.sessionId)} onClick={event => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey) { event.preventDefault(); navigate(sessionPath(session.sessionId)); } }}>{session.title}</a>
                  <p>{dateText(session.startsAt)} · {timeText(session.startsAt)} – {timeText(session.endsAt)}</p><small>Buổi học ID {session.sessionId}{session.lessonId !== null && ` · Bài học ID ${session.lessonId}`}</small></div><SessionBadge session={session} now={now} />
              </li>)}</ol>}
            </article>
          </div>
          <aside className="student-panel student-week">
            <h2>{weekOffset === 0 ? 'Tuần này' : 'Lịch theo tuần'}</h2><p>{new Date(days[0]).toLocaleDateString('vi-VN', { timeZone: zone })} – {new Date(days[6]).toLocaleDateString('vi-VN', { timeZone: zone })}</p>
            <div className="student-week-controls"><button aria-label="Tuần trước" onClick={() => setWeekOffset(w => w - 1)}>←</button><button onClick={() => setWeekOffset(0)}>Hôm nay</button><button aria-label="Tuần sau" onClick={() => setWeekOffset(w => w + 1)}>→</button></div>
            {days.map((day, index) => {
              const scheduled = sessions.filter(s => dayKey(s.startsAt) === dayKey(day));
              return <div key={day} className={`student-day ${dayKey(day) === dayKey(now) ? 'today' : ''}`}>
                <strong>{index === 6 ? 'CN' : `T${index + 2}`} <small>{new Date(day).toLocaleDateString('vi-VN', { timeZone: zone, day: '2-digit', month: '2-digit' })}</small></strong>
                {scheduled.length === 0 ? <p>Không có buổi học</p> : scheduled.map(session => <a key={session.sessionId} href={sessionPath(session.sessionId)} onClick={event => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey) { event.preventDefault(); navigate(sessionPath(session.sessionId)); } }}>
                  <b>{timeText(session.startsAt)} – {timeText(session.endsAt)}</b><span>{session.title}</span><SessionBadge session={session} now={now} /></a>)}
              </div>;
            })}
            <small>Lịch lớp đang chọn · Giờ Việt Nam (UTC+7)</small>
          </aside>
        </div>
      </>}
  </section>;
}
