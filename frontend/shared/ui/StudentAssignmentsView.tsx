import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { assignmentLabels, assignmentState } from '../api-client/studentAssignments';
import type { StudentAssignmentDetail, StudentAssignmentItem } from '../api-client/studentAssignments';
import { ProjectForm } from './StudentSessionWork';
import { useStudentResource } from './useStudentResource';
import './StudentClassesView.css';
import './StudentAssignmentsView.css';

const base = '/dashboard/assignments';
const dateTime = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh',
});
const fold = (value: string) => value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replaceAll('đ', 'd');
const requiresWork = ({ assignment }: StudentAssignmentItem) => assignment.canSubmit;

function actionLabel(item: StudentAssignmentItem) {
  const { assignment } = item;
  if (assignment.canSubmit) return assignment.submission ? 'Xem và nộp lại' : 'Bắt đầu làm bài';
  return assignment.submission || assignment.codeSubmission ? 'Xem bài nộp' : 'Xem yêu cầu';
}

function AssignmentList() {
  const resource = useStudentResource<StudentAssignmentItem[]>('assignments');
  const [query, setQuery] = useState('');
  const [classId, setClassId] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('due');
  const all = resource.data ?? [];
  const classes = [...new Map(all.map(row => [row.classId, row.classCode])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'vi'));
  const actionable = all.filter(requiresWork).length;
  const pending = all.filter(row => assignmentState(row.assignment) === 'pending').length;
  const graded = all.filter(row => ['passed', 'graded'].includes(assignmentState(row.assignment))).length;
  const term = fold(query.trim());
  const shown = all.filter(row => (!classId || String(row.classId) === classId)
    && (filter === 'all' || (filter === 'action' ? requiresWork(row) : assignmentState(row.assignment) === filter))
    && fold([row.assignment.title, row.className, row.classCode, row.courseName, row.lessonTitle].join(' ')).includes(term));
  if (sort === 'action') shown.sort((a, b) => Number(requiresWork(b)) - Number(requiresWork(a)));

  return <>
    <header className="sa-heading">
      <div><p className="sc-kicker">HỌC TẬP & THỰC HÀNH</p><h1>Bài tập của em</h1>
        <p className="sc-muted">Theo dõi hạn nộp, mở yêu cầu bài tập và xem phản hồi của giáo viên.</p></div>
      <button className="sc-button" onClick={resource.retry} disabled={resource.loading}>Làm mới</button>
    </header>
    {resource.loading && <div className="sc-panel" role="status">Đang tải bài tập…</div>}
    {resource.error && <div className="sc-panel" role="alert"><h2>Chưa thể tải danh sách bài tập</h2>
      <p>{resource.error}</p><button className="sc-button" onClick={resource.retry}>Thử lại</button></div>}
    {resource.data && <>
      <div className="sa-stats">
        <button className="sc-button" aria-pressed={filter === 'action'} onClick={() => setFilter(filter === 'action' ? 'all' : 'action')}><strong>{actionable}</strong> Cần làm hoặc nộp lại</button>
        <button className="sc-button" aria-pressed={filter === 'pending'} onClick={() => setFilter(filter === 'pending' ? 'all' : 'pending')}><strong>{pending}</strong> Chờ phản hồi</button>
        <section className="sc-panel"><strong>{graded}</strong> Đã có kết quả</section>
      </div>
      <section className="sc-panel sa-filters" aria-label="Tìm và lọc bài tập">
        <label>Tìm bài tập<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Tên bài, lớp hoặc khóa học" /></label>
        <label>Lớp học<select value={classId} onChange={e => setClassId(e.target.value)}>
          <option value="">Tất cả lớp</option>{classes.map(([id, code]) => <option key={id} value={id}>{code}</option>)}
        </select></label>
        <label>Trạng thái<select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">Tất cả trạng thái</option><option value="action">Cần làm hoặc nộp lại</option>
          {Object.entries(assignmentLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
        <label>Sắp xếp<select value={sort} onChange={e => setSort(e.target.value)}>
          <option value="due">Hạn nộp gần nhất</option><option value="action">Việc cần làm trước</option>
        </select></label>
      </section>
      <p className="sc-muted" role="status">Hiển thị {shown.length}/{all.length} bài tập</p>
      {!shown.length ? <section className="sc-panel">
        <h2>{all.length ? 'Không có bài tập khớp bộ lọc' : 'Chưa có bài tập'}</h2>
        <p>{all.length ? 'Thử đổi lớp, trạng thái hoặc từ khóa.' : 'Bài tập xuất hiện tại đây khi giáo viên công bố.'}</p>
        {!!all.length && <button className="sc-button" onClick={() => { setQuery(''); setClassId(''); setFilter('all'); }}>Xóa bộ lọc</button>}
      </section> : <ul className="sa-list">{shown.map(row => {
        const { assignment } = row;
        const state = assignmentState(assignment);
        return <li className="sc-panel sa-row" key={assignment.assignmentId}>
          <div><p className="sc-kicker">{row.classCode} · {row.courseName}</p>
            <h2><Link to={`${base}/${assignment.assignmentId}`}>{assignment.title}</Link></h2>
            <p className="sc-muted">{assignment.dueAt ? `Hạn nộp: ${dateTime.format(new Date(assignment.dueAt))}` : 'Không có hạn nộp'}</p></div>
          <span className="sa-status" data-state={state}>{assignmentLabels[state]}</span>
          <Link className={`sc-button${assignment.canSubmit ? ' sc-primary' : ''}`} to={`${base}/${assignment.assignmentId}`}>{actionLabel(row)}</Link>
        </li>;
      })}</ul>}
    </>}
  </>;
}

function AssignmentDetail({ id }: { id: string }) {
  const resource = useStudentResource<StudentAssignmentDetail>(`assignments/${id}`);
  const detail = resource.data;
  const { item } = detail ?? {};
  return <>
    <Link className="sc-button sa-back" to={base}>← Bài tập của em</Link>
    {resource.loading && <div className="sc-panel" role="status">Đang mở bài tập…</div>}
    {resource.error && <div className="sc-panel" role="alert"><h1>Chưa thể mở bài tập</h1>
      <p>{resource.error}</p><button className="sc-button" onClick={resource.retry}>Thử lại</button></div>}
    {item && detail && <>
      <header className="sc-panel sa-detail">
        <p className="sc-kicker">{item.classCode} · {item.className}</p><h1>{item.assignment.title}</h1>
        <p className="sc-muted">{item.courseName}{item.lessonTitle && ` · ${item.lessonTitle}`}</p>
        <div className="sa-links">
          <Link className="sc-button" to={`/dashboard/courses/${item.courseId}${item.lessonId ? `/lessons/${item.lessonId}` : ''}`}>Ôn lại học liệu</Link>
          {item.sessionId !== null && <Link className="sc-button" to={`/dashboard/timetable/${item.sessionId}`}>Xem buổi học</Link>}
        </div>
      </header>
      <section className="sc-panel sa-detail"><h2>Yêu cầu bài tập</h2>
        <p className="sc-lesson-content">{item.assignment.instructions || 'Giáo viên chưa thêm hướng dẫn cho bài tập này.'}</p>
        {item.assignment.canSubmit && <a className="sc-button sa-back" href="#sa-submission">Đến phần nộp bài</a>}
      </section>
      <section className="sc-panel sa-detail" id="sa-submission"><h2>Bài nộp và phản hồi</h2>
        <ProjectForm assignment={item.assignment} sessionId={null} onSubmitted={resource.retry} />
      </section>
      {!!detail.history.length && <section className="sc-panel sa-detail"><h2>Lịch sử nộp bài</h2>
        {detail.history.map(attempt => <details key={attempt.attemptNo}>
          <summary>Lần {attempt.attemptNo} · {attempt.fileName} · {dateTime.format(new Date(attempt.submittedAt))}</summary>
          <p className="sc-lesson-content">{attempt.feedback || 'Chưa có nhận xét.'}</p>
        </details>)}
      </section>}
    </>}
  </>;
}

export function StudentAssignmentsView() {
  const { assignmentId } = useParams();
  return <div className="sc-view sa-view">{assignmentId
    ? (/^[1-9][0-9]*$/.test(assignmentId) && Number(assignmentId) <= 2147483647
      ? <AssignmentDetail key={assignmentId} id={assignmentId} />
      : <section className="sc-panel"><h1>Bài tập không hợp lệ</h1><Link to={base}>Về danh sách bài tập</Link></section>)
    : <AssignmentList />}</div>;
}
