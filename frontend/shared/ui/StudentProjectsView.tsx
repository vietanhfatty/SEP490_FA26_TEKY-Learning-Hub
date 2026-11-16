import { useState } from 'react';
import { Link } from 'react-router-dom';
import { downloadStudentProject } from '../api-client/studentClasses';
import { IconDownload, IconLayers } from './Icons';
import { useStudentResource } from './useStudentResource';
import './StudentClassesView.css';
import './StudentProjectsView.css';

type Project = {
  assignmentId: number;
  title: string;
  classCode: string;
  courseName: string;
  submittedAt: string;
  attemptNo: number;
  reviewStatus: string;
  fileName: string | null;
  feedback: string | null;
  summary: string | null;
  score: number | null;
  maxScore: number | null;
};

const statuses: Record<string, { label: string; style: string }> = {
  Pending: { label: 'Chờ phản hồi', style: 'upcoming' },
  NeedsRevision: { label: 'Cần sửa', style: 'cancelled' },
  Passed: { label: 'Đạt yêu cầu', style: 'done' },
  Graded: { label: 'Đã có kết quả', style: 'done' },
};
const submittedAt = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh',
});

function ProjectCard({ project }: { project: Project }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const status = statuses[project.reviewStatus] ?? statuses.Pending;

  async function download() {
    if (!project.fileName || downloading) return;
    setDownloading(true);
    setError('');
    try {
      await downloadStudentProject(null, project.assignmentId, project.fileName);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Chưa tải được tệp đã nộp.');
    } finally {
      setDownloading(false);
    }
  }

  return <li className="sc-panel sp-card">
    <div className="sp-card-head">
      <span className="sp-icon" aria-hidden="true"><IconLayers size={22} /></span>
      <span className="sc-status" data-status={status.style}>{status.label}</span>
    </div>
    <div><p className="sc-kicker">{project.classCode}</p><h2>{project.title}</h2>
      <p className="sc-muted">{project.courseName}</p></div>
    {project.summary && <p>{project.summary}</p>}
    <div className="sp-meta">
      {project.fileName && <strong>{project.fileName}</strong>}
      <p className="sc-muted">Lần nộp {project.attemptNo} · {submittedAt.format(new Date(project.submittedAt))}</p>
      {project.score !== null && <p><strong>Điểm {project.score.toLocaleString('vi-VN')}/{project.maxScore}</strong></p>}
    </div>
    {project.feedback && <blockquote className="sc-feedback">
      <strong>Phản hồi</strong><p>{project.feedback}</p>
    </blockquote>}
    {error && <p className="sc-work-error" role="alert">{error}</p>}
    <div className="sp-actions">
      <Link className="sc-button" to={`/dashboard/assignments/${project.assignmentId}`}>Xem bài nộp</Link>
      {project.fileName && <button type="button" className="sc-button" disabled={downloading} onClick={() => void download()}>
        <IconDownload size={16} aria-hidden="true" /> {downloading ? 'Đang tải…' : 'Tải tệp'}</button>}
    </div>
  </li>;
}

export function StudentProjectsView() {
  const { data, loading, error, retry } = useStudentResource<Project[]>('projects');
  return <div className="sc-view sp-view">
    <header className="sp-heading">
      <h1>Sản phẩm STEM đã nộp</h1>
      {data && <p className="sc-muted">{data.length} sản phẩm</p>}
    </header>
    {loading && <p className="sc-panel" role="status">Đang tải sản phẩm…</p>}
    {error && <section className="sc-panel sp-empty" role="alert">
      <h2>Chưa thể tải sản phẩm</h2><p>{error}</p>
      <button type="button" className="sc-button" onClick={retry}>Thử lại</button>
    </section>}
    {data && (data.length ? <ul className="sp-grid">
      {data.map(project => <ProjectCard key={`${project.assignmentId}-${project.fileName ? 'file' : 'portfolio'}`} project={project} />)}
    </ul> : <section className="sc-panel sp-empty">
      <h2>Em chưa có sản phẩm đã nộp</h2>
      <Link className="sc-button" to="/dashboard/assignments">Xem bài tập của em</Link>
    </section>)}
  </div>;
}
