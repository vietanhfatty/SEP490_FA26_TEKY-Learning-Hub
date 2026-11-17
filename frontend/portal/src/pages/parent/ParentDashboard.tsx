import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePortalResource } from '@teky/shared/api-client/parentPortal';
import type { Child, Learning } from '@teky/shared/api-client/parentPortal';
import { ParentOverview, ParentMonitoring, ParentPerformance } from '@teky/shared/ui/ParentLearningViews';
import { ParentCourses, ParentPayments, PortalError } from '@teky/shared/ui/ParentCommerceViews';
import { LearningMessagesView } from '@teky/shared/ui/LearningMessagesView';
import '@teky/shared/ui/StudentClassesView.css';
import '@teky/shared/ui/ParentPortal.css';

const headings: Record<string, string> = {
  overview: 'Tổng quan học tập của con',
  courses: 'Tìm và đăng ký khóa học',
  monitoring: 'Theo dõi quá trình học tập',
  performance: 'Điểm số và kết quả học tập',
  communication: 'Trao đổi với giáo viên',
  payments: 'Thanh toán và học phí',
};

export function ParentDashboard({ activeNavId = 'overview' }: { activeNavId?: string }) {
  const section = activeNavId in headings ? activeNavId : 'overview';
  const children = usePortalResource<Child[]>('parent/children');
  const [selection, setSelection] = useState<number>();
  const [search, setSearch] = useSearchParams();
  const checkoutId = Number(search.get('paymentId')) || undefined;
  const checkoutStudentId = Number(search.get('studentId')) || undefined;
  const selectedId = section === 'payments' ? checkoutStudentId ?? selection : selection;
  const child = children.data?.find(row => row.studentId === selectedId) ?? children.data?.[0];
  function openCheckout(studentId: number, paymentId: number) {
    setSelection(studentId);
    setSearch({ tab: 'payments', studentId: String(studentId), paymentId: String(paymentId) });
  }
  const needsLearning = ['overview', 'monitoring', 'performance', 'courses'].includes(section);
  const learning = usePortalResource<Learning>(child && needsLearning ? `parent/children/${child.studentId}/learning` : null);
  return <div className="sc-view pp-view">
    <header className="pp-heading"><div><h1>{headings[section]}</h1>
      {child && <p className="sc-muted">{[child.studentCode, child.gradeLevel, child.schoolName].filter(Boolean).join(' · ')}</p>}</div>
      {!!children.data?.length && <label className="pp-field">Học sinh<select value={child?.studentId ?? ''} onChange={e => {
        setSelection(Number(e.target.value));
        if (section === 'payments') setSearch({ tab: 'payments', studentId: e.target.value });
      }}>
        {children.data.map(row => <option key={row.studentId} value={row.studentId}>{row.fullName}</option>)}
      </select></label>}
    </header>
    {children.loading && <p role="status" className="sc-panel">Đang tải hồ sơ học sinh…</p>}
    {children.error && <PortalError message={children.error} retry={children.retry} />}
    {children.data?.length === 0 && section !== 'courses' && <p className="sc-panel">Tài khoản chưa có hồ sơ học sinh được liên kết.</p>}
    {section === 'courses' && <ParentCourses child={child} learning={learning.data} onCheckout={openCheckout} />}
    {child && section === 'payments' && <ParentPayments key={child.studentId} child={child} checkoutId={checkoutId} />}
    {child && section === 'communication' && <LearningMessagesView key={child.studentId} studentId={child.studentId} />}
    {child && section !== 'courses' && needsLearning && <>
      {learning.loading && <p className="sc-panel" role="status">Đang tải tình hình học tập…</p>}
      {learning.error && <PortalError message={learning.error} retry={learning.retry} />}
      {learning.data && section === 'overview' && <ParentOverview data={learning.data} />}
      {learning.data && section === 'monitoring' && <ParentMonitoring key={child.studentId} data={learning.data} />}
      {learning.data && section === 'performance' && <ParentPerformance key={child.studentId} data={learning.data} />}
    </>}
  </div>;
}
