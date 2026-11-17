import { useState } from 'react';
import { dateTime, localDay } from '../api-client/parentPortal';
import type { CourseProgress, Learning, Result } from '../api-client/parentPortal';

const labels: Record<string, string> = {
  Active: 'Đang học', Completed: 'Đã hoàn thành', Todo: 'Chưa nộp', Closed: 'Hết hạn hoặc đã đóng',
  Pending: 'Chờ phản hồi', NeedsRevision: 'Cần sửa', Passed: 'Đạt yêu cầu', Graded: 'Đã có điểm',
  Present: 'Có mặt', Late: 'Đi muộn', Absent: 'Vắng', Excused: 'Vắng có phép',
  Assignment: 'Bài tập', Project: 'Sản phẩm', Assessment: 'Kiểm tra',
};
const label = (status: string) => labels[status] ?? status;

function Courses({ items }: { items: CourseProgress[] }) {
  return items.length ? <ul className="pp-list">{items.map(course => <li key={course.courseId}>
    <p className="sc-kicker">{course.courseCode}</p><h3>{course.name}</h3>
    <p className="sc-muted">Đã xác nhận ôn tập {course.reviewedLessons}/{course.totalLessons} bài</p>
    <progress aria-label={course.name} max={Math.max(1, course.totalLessons)} value={course.reviewedLessons} />
  </li>)}</ul> : <p className="sc-muted">Chưa có khóa học được ghi danh.</p>;
}

function ResultList({ results }: { results: Result[] }) {
  return results.length ? <ul className="pp-list">{results.map(row => <li key={`${row.type}-${row.itemId}`} className="pp-card">
    <div className="pp-row"><p className="sc-kicker">{label(row.type)} · {row.classCode}</p>
      {row.score !== null ? <strong className="pp-chip">{row.score.toLocaleString('vi-VN')}/{row.maxScore}</strong>
        : row.status && <span className="pp-chip">{label(row.status)}</span>}</div>
    <h3>{row.title}</h3><p className="sc-muted">{dateTime(row.date)}</p>
    {row.feedback && <p>{row.feedback}</p>}
  </li>)}</ul> : <p className="sc-muted">Chưa có kết quả được công bố.</p>;
}

export function ParentOverview({ data }: { data: Learning }) {
  const reviewed = data.courses.reduce((count, course) => count + course.reviewedLessons, 0);
  const total = data.courses.reduce((count, course) => count + course.totalLessons, 0);
  return <>
    <div className="pp-stats">
      <div className="sc-panel pp-stat"><strong>{data.courses.length}</strong><span>Khóa đã ghi danh</span></div>
      <div className="sc-panel pp-stat"><strong>{reviewed}/{total}</strong><span>Bài đã xác nhận ôn tập</span></div>
      <div className="sc-panel pp-stat"><strong>{data.upcomingAssignments.length}</strong><span>Bài cần nộp trong 7 ngày</span></div>
    </div>
    <div className="pp-grid">
      <section className="sc-panel pp-stack"><h2>Khóa học đã đăng ký</h2><Courses items={data.courses} /></section>
      <section className="sc-panel pp-stack"><h2>Điểm số gần đây</h2><ResultList results={data.results.filter(result => result.score !== null).slice(0, 5)} /></section>
      <section className="sc-panel pp-stack"><h2>Bài tập sắp tới</h2>
        {data.upcomingAssignments.length ? <ul className="pp-list">{data.upcomingAssignments.map(row => <li key={row.assignmentId}>
          <h3>{row.title}</h3><p className="sc-muted">{row.classCode} · Hạn {dateTime(row.dueAt)}{row.needsRevision && ' · Cần nộp lại'}</p>
        </li>)}</ul> : <p className="sc-muted">Không có bài cần nộp trong 7 ngày tới.</p>}
      </section>
      <section className="sc-panel pp-stack"><h2>Buổi học sắp tới</h2>
        {data.upcomingSessions.length ? <ul className="pp-list">{data.upcomingSessions.map(row => <li key={row.sessionId}>
          <h3>{row.title}</h3><p>{row.classCode} · {row.className}</p>
          <p className="sc-muted">{dateTime(row.startsAt)} · {row.teacherName ?? 'Chưa phân công giáo viên'}</p>
        </li>)}</ul> : <p className="sc-muted">Chưa có lịch học sắp tới.</p>}
      </section>
    </div>
  </>;
}

const sections = [['lessons', 'Tiến độ'], ['activity', 'Hoạt động'], ['assignments', 'Bài tập'], ['attendance', 'Điểm danh']] as const;
export function ParentMonitoring({ data }: { data: Learning }) {
  const [section, setSection] = useState<(typeof sections)[number][0]>('lessons');
  const [courseId, setCourseId] = useState('');
  const lessons = data.lessons.filter(row => !courseId || String(row.courseId) === courseId);
  const activities = [
    ...data.lessons.flatMap(row => {
      const events: { key: string; title: string; description: string; date: string }[] = [];
      if (row.viewedAt) events.push({ key: `v-${row.lessonId}`, title: row.title, description: 'Đã xem bài', date: row.viewedAt });
      if (row.completedAt) events.push({ key: `c-${row.lessonId}`, title: row.title, description: 'Đã xác nhận ôn tập', date: row.completedAt });
      return events;
    }),
    ...data.assignments.flatMap(row => row.submittedAt ? [{ key: `a-${row.assignmentId}`, title: row.title, description: 'Đã nộp bài tập', date: row.submittedAt }] : []),
    ...data.results.flatMap(row => row.type === 'Assessment' ? [{ key: `q-${row.itemId}`, title: row.title, description: 'Đã nộp bài kiểm tra', date: row.date }] : []),
  ].sort((a, b) => Date.parse(/Z$|[+-]\d{2}:\d{2}$/.test(b.date) ? b.date : b.date + 'Z') - Date.parse(/Z$|[+-]\d{2}:\d{2}$/.test(a.date) ? a.date : a.date + 'Z'));
  return <>
    <nav className="pp-tools" aria-label="Nội dung theo dõi học tập">{sections.map(([id, name]) =>
      <button key={id} type="button" className="sc-button" aria-pressed={section === id} onClick={() => setSection(id)}>{name}</button>)}</nav>
    {section === 'lessons' && <>
      <div className="pp-grid"><section className="sc-panel pp-stack"><h2>Tiến độ khóa học</h2><Courses items={data.courses} /></section>
        <section className="sc-panel pp-stack"><h2>Tiến độ ghi danh theo lớp</h2>
          {data.enrollments.length ? <ul className="pp-list">{data.enrollments.map(row => <li key={row.classId}>
            <h3>{row.className}</h3><p className="sc-muted">{row.classCode} · {label(row.status)} · {row.progressPercent}%</p>
          </li>)}</ul> : <p>Chưa có lớp được ghi danh.</p>}</section></div>
      <section className="sc-panel pp-stack"><div className="pp-row"><h2>Bài học</h2><label className="pp-field">Khóa học
        <select value={courseId} onChange={e => setCourseId(e.target.value)}><option value="">Tất cả</option>
          {data.courses.map(course => <option key={course.courseId} value={course.courseId}>{course.name}</option>)}</select></label></div>
        {lessons.length ? <ul className="pp-list">{lessons.map(row => <li key={row.lessonId}>
          <h3>{row.title}</h3><p className="sc-muted">{row.courseName} · {row.completedAt ? 'Đã xác nhận ôn tập' : row.viewedAt ? 'Đã xem' : 'Chưa ghi nhận'}</p>
        </li>)}</ul> : <p>Chưa có bài học.</p>}
      </section>
    </>}
    {section === 'activity' && <section className="sc-panel pp-stack"><h2>Lịch sử hoạt động</h2>
      {activities.length ? <ul className="pp-list">{activities.map(row => <li key={row.key}><h3>{row.title}</h3>
        <p className="sc-muted">{row.description} · {dateTime(row.date)}</p></li>)}</ul> : <p>Chưa ghi nhận hoạt động.</p>}</section>}
    {section === 'assignments' && <section className="sc-panel pp-stack"><h2>Trạng thái bài tập</h2>
      {data.assignments.length ? <ul className="pp-list">{data.assignments.map(row => <li key={row.assignmentId}>
        <div className="pp-row"><h3>{row.title}</h3><span className="pp-chip">{label(row.status)}</span></div>
        <p className="sc-muted">{row.classCode}{row.dueAt && ` · Hạn ${dateTime(row.dueAt)}`}{row.submittedAt && ` · Nộp ${dateTime(row.submittedAt)}`}</p>
      </li>)}</ul> : <p>Chưa có bài tập.</p>}</section>}
    {section === 'attendance' && <section className="sc-panel pp-stack"><h2>Điểm danh và thời lượng học</h2>
      <p><strong>{Math.floor(data.scheduledAttendanceMinutes / 60)} giờ {data.scheduledAttendanceMinutes % 60} phút</strong> theo lịch của các buổi có mặt hoặc đi muộn.</p>
      {data.attendance.length ? <ul className="pp-list">{data.attendance.map(row => <li key={row.sessionId}>
        <div className="pp-row"><h3>{row.title}</h3><span className="pp-chip">{label(row.status)}</span></div>
        <p className="sc-muted">{row.classCode} · {localDay(row.date)} · {row.startsAt.slice(0, 5)}–{row.endsAt.slice(0, 5)}</p>
        {row.absenceReason && <p>{row.absenceReason}</p>}
      </li>)}</ul> : <p>Chưa có bản ghi điểm danh.</p>}</section>}
  </>;
}

export function ParentPerformance({ data }: { data: Learning }) {
  const [filter, setFilter] = useState('');
  const results = data.results.filter(result => !filter || result.type === filter);
  return <div className="pp-grid">
    <section className="sc-panel pp-stack"><h2>Báo cáo theo khóa</h2><Courses items={data.courses} />
      <p className="sc-muted">Tiến độ phản ánh số bài đã ôn tập. Điểm từng bài và bài kiểm tra nằm trong bảng kết quả.</p></section>
    <section className="sc-panel pp-stack"><div className="pp-row"><h2>Điểm và phản hồi</h2>
      <label className="pp-field">Loại kết quả<select value={filter} onChange={e => setFilter(e.target.value)}>
        <option value="">Tất cả</option><option value="Assignment">Điểm bài tập</option>
        <option value="Project">Sản phẩm</option><option value="Assessment">Kiểm tra</option></select></label></div>
      <ResultList results={results} />
    </section>
  </div>;
}
