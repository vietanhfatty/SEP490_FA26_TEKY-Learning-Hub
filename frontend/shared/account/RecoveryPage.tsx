import { useState } from 'react';
import type { FormEvent } from 'react';
import { accountRequest } from './accountApi';
import './account.css';

export function RecoveryPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [resendAt, setResendAt] = useState(0);
  async function send() {
    if (Date.now() < resendAt) { setMessage('Vui lòng chờ đủ 60 giây trước khi gửi lại.'); return; }
    setBusy(true);
    try {
      const result = await accountRequest<{ message: string }>('/auth/forgot-password', { email });
      setMessage(result.message); setSent(true); setResendAt(Date.now() + 60000);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Không thể gửi mã.'); }
    finally { setBusy(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sent) { await send(); return; }
    const data = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const result = await accountRequest<{ message: string }>('/auth/reset-password', { email, otp: data.get('otp'), newPassword: data.get('newPassword'), confirmPassword: data.get('confirmPassword') });
      setMessage(result.message); setDone(true);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Không thể đặt lại mật khẩu.'); }
    finally { setBusy(false); }
  }
  return <main className="account-page"><h1>Khôi phục mật khẩu</h1><p>Nhận mã qua email đã đăng ký để đặt mật khẩu mới.</p>
    <p role="status" aria-live="polite">{message}</p>
    {!done && <form onSubmit={submit} aria-busy={busy}>
      <label>Email<input type="email" required autoComplete="email" value={email} readOnly={sent} onChange={e => setEmail(e.target.value)} /></label>
      {sent && <><label>Mã xác thực<input name="otp" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" /></label>
        <label>Mật khẩu mới<input name="newPassword" type="password" minLength={12} required autoComplete="new-password" /></label>
        <label>Xác nhận mật khẩu<input name="confirmPassword" type="password" minLength={12} required autoComplete="new-password" /></label>
        <p>Mật khẩu từ 12 ký tự, tối đa 72 byte UTF-8.</p>
        <button type="button" disabled={busy} onClick={send}>Gửi lại mã (sau 60 giây)</button>
        <button type="button" disabled={busy} onClick={() => { setSent(false); setMessage(''); }}>Dùng email khác</button></>}
      <button disabled={busy}>{busy ? 'Đang xử lý…' : sent ? 'Đặt lại mật khẩu' : 'Gửi mã xác thực'}</button>
    </form>}
    <a href="/login">Quay lại đăng nhập</a>
  </main>;
}
