import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { dateTime, describeError, portalDownload, portalRead, portalRequest, usePortalResource } from '../api-client/parentPortal';
import type { Contact, Message, MessagePage } from '../api-client/parentPortal';
import { PortalError } from './ParentCommerceViews';
import './StudentClassesView.css';
import './ParentPortal.css';

const pathFor = (contact: Contact) => `learning-messages/${contact.parentId}/${contact.studentId}/${contact.teacherId}`;
const inboxPath = 'learning-messages';
const pollMs = 12000;

export function useLearningMessageNotifications(enabled: boolean) {
  const { data, error, loading, retry } = usePortalResource<Contact[]>(enabled ? inboxPath : null);
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(retry, pollMs);
    return () => window.clearInterval(timer);
  }, [enabled, retry]);
  return { count: data?.reduce((sum, contact) => sum + contact.unread, 0) ?? 0, error, loading };
}

export function LearningMessageNotifications({ openInbox, count, error, loading }: {
  openInbox: () => void; count: number; error?: string; loading: boolean;
}) {
  return <section className="lms-menu lms-notification-menu">
    <h2>Notifications</h2>
    <p>{loading ? 'Đang tải…' : error ?? (count ? `${count} tin nhắn chưa đọc` : 'Bạn đã đọc hết tin nhắn.')}</p>
    <button type="button" onClick={openInbox}>Mở hộp thư</button>
  </section>;
}

export function LearningMessagesView({ teacher = false, studentId }: { teacher?: boolean; studentId?: number }) {
  const resource = usePortalResource<Contact[]>(inboxPath);
  const { retry } = resource;
  const [selected, setSelected] = useState<string>();
  const contacts = resource.data?.filter(contact => teacher || contact.studentId === studentId) ?? [];
  const contact = contacts.find(c => pathFor(c) === selected);
  useEffect(() => {
    const timer = window.setInterval(retry, pollMs);
    return () => window.clearInterval(timer);
  }, [retry]);

  return <div className="sc-view pp-view">
    {teacher && <h1>Trao đổi với phụ huynh</h1>}
    {resource.error && <PortalError message={resource.error} retry={retry} />}
    <div className="pp-message-grid">
      <section className="sc-panel pp-stack"><h2>{teacher ? 'Hội thoại' : 'Giáo viên của con'}</h2>
        {!contacts.length ? <p>{resource.loading ? 'Đang tải hộp thư…' : 'Chưa có liên hệ phù hợp.'}</p>
          : <ul className="pp-list">{contacts.map(row => <li key={pathFor(row)}>
            <button type="button" className="sc-button" aria-pressed={selected === pathFor(row)} onClick={() => setSelected(pathFor(row))}>
              {teacher ? row.parentName : row.teacherName}{row.unread > 0 && <span className="pp-chip">{row.unread} mới</span>}
            </button>
            {teacher && <p className="sc-muted">{row.studentName}</p>}
          </li>)}</ul>}
      </section>
      {contact ? <Thread key={pathFor(contact)} contact={contact} teacher={teacher} reloadInbox={retry} />
        : <section className="sc-panel"><p>Chọn một liên hệ để xem hoặc bắt đầu trao đổi.</p></section>}
    </div>
  </div>;
}

function Thread({ contact, teacher, reloadInbox }: { contact: Contact; teacher: boolean; reloadInbox: () => void }) {
  const path = pathFor(contact);
  const latest = usePortalResource<MessagePage>(path);
  const reload = latest.retry;
  const [older, setOlder] = useState<{ rows: Message[]; cursor: number | null }>();
  const [text, setText] = useState('');
  const [file, setFile] = useState<File>();
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const clientId = useRef<string | null>(null);
  const lastMarked = useRef(0);
  const before = older ? older.cursor : latest.data?.olderThan;
  const messages = [...new Map([...(older?.rows ?? []), ...(latest.data?.messages ?? [])]
    .map(message => [message.messageId, message])).values()].sort((a, b) => a.messageId - b.messageId);
  const lastIncoming = latest.data?.messages.filter(message => !message.mine).at(-1)?.messageId;

  useEffect(() => {
    const timer = window.setInterval(reload, pollMs);
    return () => window.clearInterval(timer);
  }, [reload]);
  useEffect(() => {
    if (!lastIncoming || lastIncoming <= lastMarked.current) return;
    const controller = new AbortController();
    portalRequest(`${path}/read/${lastIncoming}`, { method: 'POST', signal: controller.signal })
      .then(() => {
        if (!controller.signal.aborted) { lastMarked.current = lastIncoming; reloadInbox(); }
      }).catch(() => { /* Retried when the thread is refreshed. */ });
    return () => controller.abort();
  }, [path, lastIncoming, latest.data, reloadInbox]);

  async function loadOlder() {
    if (!before || loadingHistory) return;
    setLoadingHistory(true); setError('');
    try {
      const page = await portalRead<MessagePage>(`${path}?before=${before}`);
      setOlder({ rows: [...page.messages, ...messages], cursor: page.olderThan });
    } catch (failure) { setError(describeError(failure)); } finally { setLoadingHistory(false); }
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (sending || (!text.trim() && !file)) return;
    if (file && (file.size === 0 || file.size > 5 * 1024 * 1024)) {
      setError('Tệp phải có dung lượng từ 1 byte đến 5 MB.');
      return;
    }
    setSending(true); setError('');
    const form = new FormData();
    clientId.current ??= crypto.randomUUID();
    form.set('clientId', clientId.current);
    if (text.trim()) form.set('body', text.trim());
    if (file) form.set('attachment', file);
    try {
      await portalRequest(path, { method: 'POST', body: form });
      clientId.current = null;
      setText(''); setFile(undefined);
      if (fileInput.current) fileInput.current.value = '';
      reload(); reloadInbox();
    } catch (failure) { setError(describeError(failure)); } finally { setSending(false); }
  }

  async function download(message: Message) {
    if (!message.attachmentName) return;
    setError('');
    try { await portalDownload(`${path}/attachments/${message.messageId}`, message.attachmentName); }
    catch (failure) { setError(describeError(failure)); }
  }

  return <section className="sc-panel pp-stack">
    <h2>{teacher ? contact.parentName : contact.teacherName}</h2>
    <p className="sc-muted">Học sinh: {contact.studentName}{!teacher && contact.specialty && ` · ${contact.specialty}`}</p>
    {!teacher && contact.bio && <p>{contact.bio}</p>}
    {latest.error && <PortalError message={latest.error} retry={reload} />}
    {before && <div><button className="sc-button" type="button" disabled={loadingHistory} onClick={() => void loadOlder()}>
      {loadingHistory ? 'Đang tải…' : 'Xem tin nhắn cũ hơn'}</button></div>}
    {!messages.length && !latest.loading && !latest.error && <p className="sc-muted">Chưa có tin nhắn. Bạn có thể bắt đầu trao đổi bên dưới.</p>}
    {!!messages.length && <ul className="pp-message-list" aria-label="Lịch sử tin nhắn">{messages.map(message =>
      <li className="pp-message" data-mine={message.mine} key={message.messageId}>
        <small>{message.mine ? 'Bạn' : teacher ? contact.parentName : contact.teacherName}</small>
        {message.body && <p>{message.body}</p>}
        {message.attachmentName && <button type="button" className="sc-button" onClick={() => void download(message)}>Tải {message.attachmentName}</button>}
        <div><time>{dateTime(message.sentAt)}</time></div>
      </li>)}</ul>}
    {error && <p className="pp-error" role="alert">{error}</p>}
    <form className="pp-stack" onSubmit={send}>
      <label className="pp-field">Tin nhắn<textarea rows={3} maxLength={2000} disabled={sending} value={text}
        onChange={e => { clientId.current = null; setText(e.target.value); }} /></label>
      <label className="pp-field">Tệp đính kèm (PDF, PNG, JPG · tối đa 5 MB)
        <input ref={fileInput} type="file" accept=".pdf,.png,.jpg,.jpeg" disabled={sending}
          onChange={e => { clientId.current = null; setFile(e.target.files?.[0]); }} /></label>
      <div><button type="submit" className="sc-button sc-primary" disabled={sending || (!text.trim() && !file)}>
        {sending ? 'Đang gửi…' : 'Gửi tin nhắn'}</button></div>
    </form>
  </section>;
}
