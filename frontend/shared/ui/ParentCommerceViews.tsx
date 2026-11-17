import { useState } from 'react';
import type { FormEvent } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { API_BASE_URL } from '../api-client/auth';
import { buyCourse, currency, dateTime, describeError, localDay, portalDownload, portalPost, usePortalResource } from '../api-client/parentPortal';
import type { Checkout, Child, Course, CourseDetail, Learning, Payment, Registration } from '../api-client/parentPortal';

const statusLabels: Record<string, string> = {
  Pending: 'Chờ xử lý', Accepted: 'Đã tiếp nhận', Declined: 'Đã từ chối', Approved: 'Đã duyệt',
  Paid: 'Đã thanh toán', Failed: 'Không thành công', Refunded: 'Đã hoàn tiền',
};
const feeLabel = (fee: number | null) => fee === null ? 'Học phí chưa công bố' : currency.format(fee);
const normalize = (text: string) => text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replaceAll('đ', 'd');

export function PortalError({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="sc-panel pp-stack" role="alert">
    <p className="pp-error">{message}</p>
    {retry && <div><button className="sc-button" type="button" onClick={retry}>Thử lại</button></div>}
  </div>;
}

export function ParentCourses({ child, learning, onCheckout }: {
  child?: Child; learning?: Learning; onCheckout: (studentId: number, paymentId: number) => void;
}) {
  const catalogue = usePortalResource<Course[]>('parent/courses');
  const registrations = usePortalResource<Registration[]>(child ? `parent/children/${child.studentId}/registrations` : null);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('');
  const [openOnly, setOpenOnly] = useState(false);
  const [selected, setSelected] = useState<number>();
  const levels = [...new Set(catalogue.data?.flatMap(course => course.levelCode ? [course.levelCode] : []))].sort();
  const courses = catalogue.data?.filter(course =>
    (!level || course.levelCode === level) && (!openOnly || course.openClassCount > 0) &&
    normalize([course.name, course.courseCode, course.description].join(' ')).includes(normalize(query.trim())));
  return <>
    {catalogue.error && <PortalError message={catalogue.error} retry={catalogue.retry} />}
    {registrations.error && <PortalError message={registrations.error} retry={registrations.retry} />}
    {selected ? <CourseDetails key={`${selected}-${child?.studentId}`} id={selected} child={child} learning={learning}
      onCheckout={onCheckout} onBack={() => setSelected(undefined)} /> : <>
      <div className="sc-panel pp-tools">
        <label>Tìm khóa học<input type="search" value={query} placeholder="Tên hoặc mã khóa học" onChange={e => setQuery(e.target.value)} /></label>
        <label>Cấp độ<select value={level} onChange={e => setLevel(e.target.value)}>
          <option value="">Tất cả cấp độ</option>{levels.map(code => <option key={code}>{code}</option>)}
        </select></label>
        <label><span><input type="checkbox" checked={openOnly} onChange={e => setOpenOnly(e.target.checked)} /> Có lớp mở đăng ký</span></label>
      </div>
      {catalogue.loading && <p role="status">Đang tải danh mục…</p>}
      {courses && (courses.length ? <div className="pp-grid">{courses.map(course => <article className="sc-panel pp-stack pp-card" key={course.courseId}>
        <p className="sc-kicker">{course.courseCode}{course.levelCode && ` · ${course.levelCode}`}</p><h2>{course.name}</h2>
        {course.description && <p>{course.description}</p>}
        <p className="sc-muted">{course.lessonCount} bài học · {course.openClassCount} lớp đang mở</p>
        <div className="pp-row"><strong>{feeLabel(course.tuitionVnd)}</strong>
          <button className="sc-button" type="button" onClick={() => setSelected(course.courseId)}>Xem chi tiết</button></div>
      </article>)}</div> : <p className="sc-panel">Không có khóa học phù hợp.</p>)}
    </>}
    {!!registrations.data?.length && <section className="sc-panel pp-stack"><h2>Yêu cầu đăng ký trước đây của {child?.fullName}</h2>
      <ul className="pp-list">{registrations.data.map(row => <li key={row.requestId}>
        <div className="pp-row"><h3>{row.courseName}</h3><span className="pp-chip">{statusLabels[row.status] ?? row.status}</span></div>
        <p className="sc-muted">{row.classCode} · {dateTime(row.requestedAt)}</p>
      </li>)}</ul>
    </section>}
  </>;
}

function CourseDetails({ id, child, learning, onCheckout, onBack }: {
  id: number; child?: Child; learning?: Learning; onCheckout: (studentId: number, paymentId: number) => void; onBack: () => void;
}) {
  const resource = usePortalResource<CourseDetail>(`parent/courses/${id}`);
  const [busy, setBusy] = useState<number>();
  const [error, setError] = useState('');
  async function purchase(classId: number) {
    if (!child || busy !== undefined) return;
    setBusy(classId);
    setError('');
    try {
      const checkout = await buyCourse(child.studentId, classId);
      onCheckout(child.studentId, checkout.paymentId);
    } catch (failure) {
      setError(describeError(failure));
    } finally {
      setBusy(undefined);
    }
  }
  const detail = resource.data;
  return <>
    <div><button className="sc-button" type="button" onClick={onBack}>← Danh mục khóa học</button></div>
    {resource.loading && <p role="status">Đang tải thông tin khóa học…</p>}
    {resource.error && <PortalError message={resource.error} retry={resource.retry} />}
    {detail && <>
      <article className="sc-panel pp-stack pp-card">
        <p className="sc-kicker">{detail.course.courseCode}</p><h2>{detail.course.name}</h2>
        {detail.course.description && <p>{detail.course.description}</p>}
        <strong>{feeLabel(detail.course.tuitionVnd)}</strong>
        <h3>Mục tiêu khóa học</h3><p>{detail.learningObjectives ?? 'Mục tiêu chưa được công bố.'}</p>
        <h3>Chương trình giảng dạy</h3>
        {detail.lessons.length ? <ol>{detail.lessons.map(lesson => <li key={lesson.lessonId}>{lesson.title}</li>)}</ol>
          : <p>Chương trình chưa có bài học được công bố.</p>}
      </article>
      <section className="sc-panel pp-stack"><h2>Lịch trình và đăng ký lớp</h2>
        {error && <p role="alert" className="pp-error">{error}</p>}
        {!child && <p className="sc-muted">Cần liên kết hồ sơ học sinh để mua khóa học.</p>}
        {detail.classes.length ? <ul className="pp-list">{detail.classes.map(row => {
          const enrolled = learning?.enrollments.some(item => item.courseId === id && ['Active', 'Completed'].includes(item.status));
          const canBuy = row.status === 'Open' && child && (detail.course.tuitionVnd ?? 0) > 0;
          return <li key={row.classId} className="pp-row">
            <div><h3>{row.name}</h3><p>{row.classCode} · {row.teacherName ?? 'Chưa phân công giáo viên'}</p>
              <p className="sc-muted">{localDay(row.startDate)} – {localDay(row.endDate)}</p>
              {row.nextDate && <p>Buổi tới {localDay(row.nextDate)} · {row.startsAt?.slice(0, 5)}–{row.endsAt?.slice(0, 5)}</p>}
              {row.schedule.length > 0 && <details><summary>Lịch các buổi sắp tới ({row.schedule.length})</summary>
                <ul>{row.schedule.map(session => <li key={session.sessionId}>
                  {localDay(session.date)} · {session.startsAt.slice(0, 5)}–{session.endsAt.slice(0, 5)} · {session.title}
                </li>)}</ul>
              </details>}</div>
            {enrolled ? <span className="pp-chip">Đã ghi danh</span>
              : canBuy ? <button type="button" className="sc-button sc-primary" disabled={busy !== undefined}
                onClick={() => void purchase(row.classId)}>{busy === row.classId ? 'Đang tạo mã QR…' : 'Mua khóa học'}</button>
              : <span className="pp-chip">{row.status === 'Open' ? 'Đang mở' : 'Dự kiến'}</span>}
          </li>;
        })}</ul> : <p>Chưa có lớp hoặc lịch trình được công bố.</p>}
      </section>
    </>}
  </>;
}

function PaymentCard({ payment, base, refresh, demo }: { payment: Payment; base: string; refresh: () => void; demo: boolean }) {
  const [reason, setReason] = useState('');
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const path = `${base}/${payment.paymentId}`;
  async function invoice() {
    setBusy(true); setError('');
    try { await portalDownload(`${path}/invoice`, `teky-hoc-phi-${payment.paymentId}.html`); }
    catch (failure) { setError(describeError(failure)); } finally { setBusy(false); }
  }
  async function refund(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await portalPost(`${path}/refund`, { reason: reason.trim() });
      setSaved(true); setAsking(false); refresh();
    } catch (failure) { setError(describeError(failure)); } finally { setBusy(false); }
  }
  return <li className="sc-panel pp-stack pp-card">
    <div className="pp-row"><p className="sc-kicker">{payment.reference}</p><span className="pp-chip">{payment.status === 'Pending' ? 'Chờ thanh toán' : statusLabels[payment.status] ?? payment.status}</span></div>
    <h2>{payment.courseName}</h2><p><strong>{currency.format(payment.amountVnd)}</strong>{demo && ' · Mô phỏng'}</p>
    <p className="sc-muted">Ngày tạo {dateTime(payment.createdAt)}{payment.paidAt && ` · Thanh toán ${dateTime(payment.paidAt)}`}</p>
    {payment.invoiceNumber && <p>Số chứng từ {payment.invoiceNumber}</p>}
    {payment.refundStatus && <p>Yêu cầu hoàn tiền: {statusLabels[payment.refundStatus] ?? payment.refundStatus} · {dateTime(payment.refundRequestedAt)}{payment.refundReason && ` · ${payment.refundReason}`}</p>}
    {saved && !payment.refundStatus && <p role="status">Đã gửi yêu cầu hoàn tiền.</p>}
    <div className="pp-tools">
      {payment.invoiceNumber && ['Paid', 'Refunded'].includes(payment.status) && <button type="button" className="sc-button" disabled={busy} onClick={() => void invoice()}>Tải chứng từ</button>}
      {payment.status === 'Paid' && payment.amountVnd > 0 && !payment.refundStatus && !saved &&
        <button type="button" className="sc-button" disabled={busy} onClick={() => setAsking(value => !value)}>{asking ? 'Hủy' : 'Yêu cầu hoàn tiền'}</button>}
    </div>
    {asking && <form className="pp-stack" onSubmit={refund}>
      <label className="pp-field">Lý do hoàn tiền<textarea required minLength={5} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label>
      <div><button type="submit" className="sc-button sc-primary" disabled={busy || reason.trim().length < 5}>Gửi yêu cầu</button></div>
    </form>}
    {error && <p className="pp-error" role="alert">{error}</p>}
  </li>;
}

function CheckoutCard({ checkout }: { checkout: Checkout }) {
  const demoUrl = checkout.demoReference ? new URL(`${API_BASE_URL}/payments/demo/${checkout.demoReference}`, window.location.origin).href : null;
  const qr = demoUrl ?? checkout.qrCode;
  const paymentUrl = demoUrl ?? checkout.checkoutUrl;
  const expired = Date.parse(checkout.expiresAt) <= Date.now();
  return <article className="sc-panel pp-checkout pp-stack">
    <div className="pp-stack">
      <p className="sc-kicker">{checkout.classCode}{checkout.provider === 'Demo' && ' · Mô phỏng'}</p>
      <h2>{checkout.courseName}</h2>
      <strong>{currency.format(checkout.amountVnd)}</strong>
      {checkout.status === 'Paid' ? <p role="status">Đã thanh toán. Học sinh có thể mở khóa học trong My Courses.</p>
        : checkout.status === 'Failed' ? <p role="status">Đơn đã hết hiệu lực. Tạo đơn mới trong Course Management.</p>
        : expired ? <p role="status">Mã QR đã hết hạn. Hệ thống đang đối soát giao dịch.</p>
        : <>
          <p>{demoUrl ? 'Thanh toán mô phỏng dành cho demo.' : qr ? 'Mở ứng dụng ngân hàng và quét mã QR.' : 'Mở trang thanh toán để xem mã QR.'}</p>
          <p className="sc-muted">Hạn thanh toán {dateTime(checkout.expiresAt)} · Tự động cập nhật trạng thái</p>
          {paymentUrl && <div><a className="sc-button" href={paymentUrl} target="_blank" rel="noreferrer">
            {demoUrl ? 'Mở trang thanh toán mô phỏng' : 'Mở trang thanh toán payOS'}
          </a></div>}
          {!paymentUrl && <p>Quay lại Course Management và chọn mua để thử tạo lại mã.</p>}
        </>}
    </div>
    {checkout.status === 'Pending' && !expired && qr && <div className="pp-qr">
      <QRCodeSVG value={qr} size={188} marginSize={4} title="Mã QR thanh toán học phí" />
    </div>}
  </article>;
}

export function ParentPayments({ child, checkoutId }: { child: Child; checkoutId?: number }) {
  const base = `parent/children/${child.studentId}/payments`;
  const checkouts = usePortalResource<Checkout[]>(`parent/children/${child.studentId}/checkouts`, 2500);
  const resource = usePortalResource<Payment[]>(base, 5000);
  const selected = checkouts.data?.find(row => row.paymentId === checkoutId);
  const open = checkouts.data?.filter(row => row.status === 'Pending' && row.paymentId !== checkoutId) ?? [];
  return <>
    {checkouts.error && <PortalError message={checkouts.error} retry={checkouts.retry} />}
    {selected && <CheckoutCard key={selected.paymentId} checkout={selected} />}
    {open.map(row => <CheckoutCard key={row.paymentId} checkout={row} />)}
    <section className="pp-stack"><h2>Lịch sử thanh toán học phí</h2>
      {resource.loading && !resource.data && <p role="status">Đang tải học phí…</p>}
      {resource.error && <PortalError message={resource.error} retry={resource.retry} />}
      {resource.data && (resource.data.length ? <ul className="pp-grid pp-list">{resource.data.map(payment =>
        <PaymentCard key={payment.paymentId} payment={payment} base={base} refresh={resource.retry}
          demo={checkouts.data?.some(row => row.paymentId === payment.paymentId && row.provider === 'Demo') ?? false} />)}</ul>
        : <p className="sc-panel">Chưa có giao dịch học phí cho hồ sơ này.</p>)}
    </section>
  </>;
}
