import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { downloadStudentProject, submitStudentProject } from '../api-client/studentClasses';
import type { StudentAssignment, StudentSession } from '../api-client/studentClasses';
import { IconBookOpen, IconDownload, IconFileText } from './Icons';

const maxBytes = 10 * 1024 * 1024;
const fileExtensions = '.sb3,.py,.stl,.rbxl,.rbxlx,.pdf,.png,.jpg,.jpeg,.zip';
const localDateTime = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh',
});

function ProjectForm({ sessionId, assignment }: { sessionId: number; assignment: StudentAssignment }) {
  const inputId = useId();
  const [file, setFile] = useState<File>();
  const [submission, setSubmission] = useState(assignment.submission);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const canSubmit = assignment.canSubmit && !submission;

  function chooseFile(value?: File) {
    setError('');
    setFile(undefined);
    if (!value) return;
    if (value.size === 0 || value.size > maxBytes || value.name.length > 180 ||
      !fileExtensions.split(',').includes(value.name.slice(value.name.lastIndexOf('.')).toLowerCase())) {
      setError('Chọn tệp đúng định dạng, tên tối đa 180 ký tự và dung lượng từ 1 byte đến 10 MB.');
      return;
    }
    setFile(value);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file || !canSubmit || busy) return;
    setBusy(true);
    setError('');
    try {
      setSubmission(await submitStudentProject(sessionId, assignment.assignmentId, file));
      setFile(undefined);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Chưa nộp được sản phẩm.');
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    if (!submission || busy) return;
    setBusy(true);
    setError('');
    try {
      await downloadStudentProject(sessionId, assignment.assignmentId, submission.fileName);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Chưa tải được tệp.');
    } finally {
      setBusy(false);
    }
  }

  return <article className="sc-work-item">
    <div className="sc-work-line">
      <h3>{assignment.title}</h3>
      <span role="status" className="sc-status" data-status={submission ? 'done' : canSubmit ? 'upcoming' : 'ended'}>
        {submission ? 'Đã nộp' : canSubmit ? 'Chưa nộp' : 'Đã đóng nộp'}
      </span>
    </div>
    {assignment.dueAt && <p className="sc-muted">Hạn nộp: {localDateTime.format(Date.parse(assignment.dueAt))}</p>}
    {submission && <>
      <p className="sc-meta"><IconFileText size={17} aria-hidden="true" /> {submission.fileName}</p>
      <p className="sc-muted">Đã nộp lúc {localDateTime.format(Date.parse(submission.submittedAt))}</p>
      <button type="button" className="sc-button" disabled={busy} onClick={download}>
        <IconDownload size={17} aria-hidden="true" /> {busy ? 'Đang tải…' : 'Tải tệp đã nộp'}
      </button>
    </>}
    {canSubmit && <form className="sc-project-form" onSubmit={submit}>
      <div className="sc-dropzone" onDragOver={event => event.preventDefault()} onDrop={event => {
        event.preventDefault();
        if (busy) return;
        if (event.dataTransfer.files.length !== 1) {
          setFile(undefined);
          setError('Chỉ chọn một tệp cho mỗi bài tập.');
          return;
        }
        chooseFile(event.dataTransfer.files[0]);
      }}>
        <label htmlFor={inputId}>Kéo thả hoặc chọn tệp sản phẩm</label>
        <input type="file" id={inputId} accept={fileExtensions} disabled={busy}
          aria-describedby={inputId + '-formats'} onChange={event => {
            chooseFile(event.currentTarget.files?.[0]);
            event.currentTarget.value = '';
          }} />
        <p id={inputId + '-formats'} className="sc-muted">Scratch, Python, STL, Roblox Studio, PDF, ảnh hoặc ZIP · Tối đa 10 MB</p>
        {file && <p className="sc-meta"><IconFileText size={17} aria-hidden="true" /> {file.name}</p>}
      </div>
      <button type="submit" className="sc-button sc-primary" disabled={!file || busy}>{busy ? 'Đang nộp…' : 'Nộp sản phẩm'}</button>
    </form>}
    {error && <p className="sc-work-error" role="alert">{error}</p>}
  </article>;
}

export function StudentSessionWork({ session }: { session: StudentSession }) {
  return <>
    <section className="sc-panel sc-work" aria-labelledby="sc-learning-work">
      <h2 id="sc-learning-work"><IconBookOpen size={22} aria-hidden="true" /> Học liệu &amp; Bài tập</h2>
      <div className="sc-work-grid">
        <div>
          <h3>Học liệu</h3>
          {session.materials.length === 0 ? <p className="sc-muted">Chưa có học liệu.</p> : <ul className="sc-materials">
            {session.materials.map(material => <li key={material.materialId}>
              {/^https?:\/\//i.test(material.fileUrl)
                ? <a href={material.fileUrl} target="_blank" rel="noopener noreferrer">{material.title} <span aria-hidden="true">↗</span></a>
                : <span>{material.title} · Liên kết chưa khả dụng</span>}
            </li>)}
          </ul>}
        </div>
        <div>
          <h3>Bài tập</h3>
          {session.assignments.length === 0 ? <p className="sc-muted">Chưa có bài tập được công bố.</p> : session.assignments.map(assignment =>
            <article key={assignment.assignmentId} className="sc-assignment">
              <h4>{assignment.title}</h4>
              {assignment.instructions && <p className="sc-lesson-content">{assignment.instructions}</p>}
              {(assignment.canSubmit || assignment.submission) && <a className="sc-button" href={`#sc-project-${assignment.assignmentId}`}>Đến phần nộp bài</a>}
            </article>)}
        </div>
      </div>
    </section>
    <section className="sc-panel sc-work" aria-labelledby="sc-project-work">
      <h2 id="sc-project-work"><IconFileText size={22} aria-hidden="true" /> Sản phẩm sáng tạo</h2>
      {session.assignments.length === 0 ? <p className="sc-muted">Buổi này chưa có sản phẩm cần nộp.</p> : session.assignments.map(assignment =>
        <div key={assignment.assignmentId} id={`sc-project-${assignment.assignmentId}`}>
          <ProjectForm sessionId={session.sessionId} assignment={assignment} />
        </div>)}
    </section>
  </>;
}
