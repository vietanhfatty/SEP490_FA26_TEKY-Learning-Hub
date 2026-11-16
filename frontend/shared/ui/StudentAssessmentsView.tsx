import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { requestStudent } from '../api-client/studentClasses';
import { useStudentResource } from './useStudentResource';
import './StudentClassesView.css';
import './StudentAssessmentsView.css';

const base = '/dashboard/assessments';
const date = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh',
});
const labels = { Available: 'Có thể làm', InProgress: 'Đang làm', Submitted: 'Đã nộp', Upcoming: 'Chưa mở', Closed: 'Đã đóng' };
type Summary = {
  assessmentId: number; title: string; classCode: string; courseName: string;
  status: keyof typeof labels; opensAt: string | null; closesAt: string | null;
};
type Question = { prompt: string; options: string[] };
type Work = { attemptId: string; questions: Question[] };
type Result = {
  correctCount: number; totalQuestions: number; score: number; submittedAt: string;
  review: (Question & { selected: number; correct: number; explanation: string | null })[] | null;
};
type Detail = { assessment: Summary; instructions: string | null; questionCount: number; work: Work | null; result: Result | null };

function WindowInfo({ item }: { item: Summary }) {
  return <p className="sc-muted">{item.opensAt && <>Mở: {date.format(new Date(item.opensAt))} · </>}
    {item.closesAt ? `Đóng: ${date.format(new Date(item.closesAt))}` : 'Không có hạn đóng'}</p>;
}

function AssessmentList() {
  const resource = useStudentResource<Summary[]>('assessments');
  const [status, setStatus] = useState('');
  const rows = resource.data?.filter(row => !status || row.status === status);
  return <>
    <header className="sq-content"><p className="sc-kicker">HỌC TẬP & THỰC HÀNH</p>
      <h1>Kiểm tra & Đánh giá</h1><p className="sc-muted">Làm bài trắc nghiệm và xem kết quả của em.</p></header>
    {resource.loading && <p role="status" className="sc-panel">Đang tải bài kiểm tra…</p>}
    {resource.error && <ErrorPanel error={resource.error} retry={resource.retry} />}
    {rows && <>
      <label className="sq-filter">Trạng thái<select value={status} onChange={e => setStatus(e.target.value)}>
        <option value="">Tất cả bài kiểm tra</option>
        {Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select></label>
      {!rows.length && <p className="sc-panel">{status ? 'Không có bài kiểm tra ở trạng thái này.' : 'Chưa có bài kiểm tra được công bố cho lớp của em.'}</p>}
      <ul className="sq-list">{rows.map(row => <li className="sc-panel sq-row" key={row.assessmentId}>
        <div className="sq-content"><p className="sc-kicker">{row.classCode} · {row.courseName}</p><h2>{row.title}</h2><WindowInfo item={row} /></div>
        <span className="sq-status">{labels[row.status]}</span>
        <Link className="sc-button" aria-label={`${row.status === 'Submitted' ? 'Xem kết quả' : 'Mở bài kiểm tra'}: ${row.title}`}
          to={`${base}/${row.assessmentId}`}>{row.status === 'Submitted' ? 'Xem kết quả' : 'Xem chi tiết'}</Link>
      </li>)}</ul>
    </>}
  </>;
}

function ErrorPanel({ error, retry }: { error: string; retry: () => void }) {
  return <section className="sc-panel sq-content" role="alert"><p>{error}</p>
    <button className="sc-button sq-start" onClick={retry}>Thử lại</button></section>;
}

function loadDraft(work: Work): number[] {
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(`teky.assessment.${work.attemptId}`) ?? 'null');
    if (Array.isArray(saved) && saved.length === work.questions.length)
      return work.questions.map((q, i) => Number.isInteger(saved[i]) && saved[i] >= 0 && saved[i] < q.options.length ? saved[i] : -1);
  } catch { /* The student can still complete the test without browser storage. */ }
  return work.questions.map(() => -1);
}

function QuestionForm({ work, busy, submit }: { work: Work; busy: boolean; submit: (choices: number[]) => void }) {
  const [choices, setChoices] = useState(() => loadDraft(work));
  const [confirm, setConfirm] = useState(false);
  const answered = choices.filter(choice => choice >= 0).length;
  function choose(index: number, option: number) {
    setConfirm(false);
    const next = choices.map((choice, i) => i === index ? option : choice);
    setChoices(next);
    try { sessionStorage.setItem(`teky.assessment.${work.attemptId}`, JSON.stringify(next)); } catch { /* Optional local draft. */ }
  }
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy || answered !== work.questions.length) return;
    if (confirm) submit(choices);
    else setConfirm(true);
  }
  return <form className="sq-content" onSubmit={handleSubmit}>
    <p role="status"><strong>Đã trả lời {answered}/{work.questions.length} câu</strong></p>
    {work.questions.map((q, i) => <fieldset className="sc-panel sq-question" key={i} disabled={busy}>
      <legend>Câu {i + 1}: {q.prompt}</legend>
      {q.options.map((option, j) => <label key={j}>
        <input type="radio" name={`question-${i}`} checked={choices[i] === j} onChange={() => choose(i, j)} />
        <span>{option}</span></label>)}
    </fieldset>)}
    {confirm && <p role="status">Sau khi nộp, em không thể đổi đáp án. Hãy xác nhận để chấm bài.</p>}
    <div className="sq-actions">
      <button type="submit" className="sc-button sc-primary" disabled={busy || answered !== work.questions.length}>
        {busy ? 'Đang nộp…' : confirm ? 'Xác nhận nộp bài' : 'Nộp bài kiểm tra'}</button>
      {confirm && <button type="button" className="sc-button" disabled={busy} onClick={() => setConfirm(false)}>Kiểm tra lại</button>}
    </div>
  </form>;
}

function ResultView({ result }: { result: Result }) {
  return <>
    <section className="sc-panel sq-content" role="status">
      <h2>Kết quả bài kiểm tra</h2><p><strong>{result.score.toLocaleString('vi-VN')}/10</strong> · Đúng {result.correctCount}/{result.totalQuestions} câu</p>
      <p className="sc-muted">Đã nộp: {date.format(new Date(result.submittedAt))}</p>
    </section>
    {result.review ? <section className="sc-panel sq-content"><h2>Xem lại đáp án</h2>
      <ol className="sq-review">{result.review.map((q, index) => <li key={index}>
        <h3>{q.prompt}</h3><p>Em chọn: {q.options[q.selected]} · <strong>{q.selected === q.correct ? 'Đúng' : 'Sai'}</strong></p>
        <p>Đáp án đúng: {q.options[q.correct]}</p>{q.explanation && <p className="sc-muted">{q.explanation}</p>}
      </li>)}</ol>
    </section> : <p className="sc-panel">Bài kiểm tra này không mở phần xem lại đáp án.</p>}
  </>;
}

function AssessmentDetail({ id }: { id: string }) {
  const resource = useStudentResource<Detail>(`assessments/${id}`);
  const [updated, setUpdated] = useState<Detail>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const detail = updated ?? resource.data;
  async function perform(action: 'start' | 'submit', answers?: number[]) {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const res = await requestStudent(`assessments/${id}/${action}`, {
        method: 'POST',
        ...(answers ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers }) } : {}),
      });
      const next = await res.json() as Detail;
      setUpdated(next);
      if (next.result && detail?.work) {
        try { sessionStorage.removeItem(`teky.assessment.${detail.work.attemptId}`); } catch { /* Optional local draft. */ }
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Không thể hoàn tất thao tác.');
    } finally { setBusy(false); }
  }
  return <>
    <Link className="sc-button sq-start" to={base}>← Danh sách bài kiểm tra</Link>
    {resource.loading && <p className="sc-panel" role="status">Đang mở bài kiểm tra…</p>}
    {resource.error && <ErrorPanel error={resource.error} retry={resource.retry} />}
    {detail && <>
      <header className="sc-panel sq-content">
        <p className="sc-kicker">{detail.assessment.classCode} · {detail.assessment.courseName}</p>
        <h1>{detail.assessment.title}</h1>
        <p className="sc-muted">{labels[detail.assessment.status]} · {detail.questionCount} câu · 1 lần nộp</p>
        <WindowInfo item={detail.assessment} />
        {detail.instructions && <p className="sc-lesson-content">{detail.instructions}</p>}
        {detail.assessment.status === 'Available' && <button className="sc-button sc-primary sq-start" disabled={busy}
          onClick={() => void perform('start')}>{busy ? 'Đang mở đề…' : 'Bắt đầu làm bài'}</button>}
      </header>
      {error && <p className="sc-panel sq-error" role="alert">{error}</p>}
      {detail.result && <ResultView result={detail.result} />}
      {detail.work && <QuestionForm key={detail.work.attemptId} work={detail.work} busy={busy} submit={answers => void perform('submit', answers)} />}
    </>}
  </>;
}

export function StudentAssessmentsView() {
  const { assessmentId } = useParams();
  return <div className="sc-view sq-view">{assessmentId
    ? (/^[1-9][0-9]*$/.test(assessmentId) && Number(assessmentId) <= 2147483647
      ? <AssessmentDetail id={assessmentId} key={assessmentId} />
      : <p className="sc-panel">Mã bài kiểm tra không hợp lệ. <Link to={base}>Về danh sách</Link></p>)
    : <AssessmentList />}</div>;
}
