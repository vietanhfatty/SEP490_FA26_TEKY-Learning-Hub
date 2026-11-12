import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../auth/authContext';
import { accountRequest } from './accountApi';
import './account.css';
import { API_BASE_URL } from '../api-client/auth';

interface Profile { fullName: string; email: string; phone?: string; bio?: string; avatarUrl?: string; }
export function AccountPage() {
  const auth = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const [preview, setPreview] = useState('');
  const [savedAvatar, setSavedAvatar] = useState('');
  useEffect(() => {
    let cancelled=false; let url='';
    if (profile?.avatarUrl?.startsWith('/api/users/me/avatar')) {
      fetch(`${API_BASE_URL}/users/me/avatar`, {headers: {Authorization: `Bearer ${auth.accessToken}`}})
        .then(response => {if (!response.ok) throw new Error('Avatar unavailable');return response.blob();})
        .then(blob => {if(!cancelled) {url=URL.createObjectURL(blob);setSavedAvatar(url);}}).catch(() => {});
    }
    return () => {cancelled=true;if(url) URL.revokeObjectURL(url);};
  }, [profile?.avatarUrl, auth.accessToken]);
  useEffect(() => {
    let active = true;
    accountRequest<{ data: Profile }>('/auth/me', undefined, 'GET').then(r => { if (active) setProfile(r.data); }).catch(e => { if (active) setMessage(e.message); });
    return () => { active = false; };
  }, [reload]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true); setMessage('');
    try {
      await accountRequest('/users/me', { fullName: data.get('fullName'), phone: data.get('phone') || null, bio: data.get('bio') }, 'PATCH');
      const file = data.get('avatar');
      if (file instanceof File && file.size) { const upload = new FormData(); upload.set('avatar', file); await accountRequest('/users/me/avatar', upload); }
      const result = await accountRequest<{ data: Profile }>('/auth/me', undefined, 'GET');
      auth.updateUser(result.data);
      setProfile(result.data); setMessage('Đã lưu hồ sơ.');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Không thể lưu hồ sơ.'); }
    finally { setBusy(false); }
  }
  async function change(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true);
    try {
      await accountRequest('/auth/change-password', Object.fromEntries(data));
      await auth.logout(); window.location.assign('/login');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Không thể đổi mật khẩu.'); }
    finally { setBusy(false); }
  }
  if (!auth.isLoggedIn) return <main className="account-page"><a href="/login">Đăng nhập để xem hồ sơ</a></main>;
  return <main className="account-page"><a href="/">Về trang chính</a><h1>Tài khoản của bạn</h1><p role="status" aria-live="polite">{message}</p>
    {!profile ? <><p>Đang tải hồ sơ hoặc chưa thể kết nối.</p><button onClick={() => setReload(n => n + 1)}>Tải lại</button></> : <form key={profile.email} onSubmit={save} aria-busy={busy}>
      <h2>Hồ sơ cá nhân</h2><p>{profile.email}</p>
      <label>Họ tên<input name="fullName" required maxLength={120} defaultValue={profile.fullName} autoComplete="name" /></label>
      <label>Số điện thoại<input name="phone" type="tel" maxLength={20} defaultValue={profile.phone || ''} autoComplete="tel" /></label>
      <label>Tiểu sử<textarea name="bio" maxLength={1000} defaultValue={profile.bio || ''} /></label>
      <label>Ảnh đại diện PNG (tối đa 2 MB)<input name="avatar" type="file" accept="image/png" onChange={e => { const file = e.target.files?.[0]; setPreview(file ? URL.createObjectURL(file) : ''); }} /></label>
      {(preview || savedAvatar) && <img src={preview || savedAvatar} alt="Ảnh đại diện" width={96} height={96} />}
      <button disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu hồ sơ'}</button><button type="reset" disabled={busy} onClick={() => setPreview('')}>Hủy thay đổi</button>
    </form>}
    <form onSubmit={change} aria-busy={busy}><h2>Đổi mật khẩu</h2>
      <label>Mật khẩu hiện tại<input name="currentPassword" type="password" required autoComplete="current-password" /></label>
      <label>Mật khẩu mới<input name="newPassword" type="password" minLength={12} required autoComplete="new-password" /></label>
      <label>Xác nhận mật khẩu mới<input name="confirmPassword" type="password" minLength={12} required autoComplete="new-password" /></label>
      <p>Từ 12 ký tự, tối đa 72 byte UTF-8. Sau khi đổi, bạn cần đăng nhập lại trên các thiết bị.</p>
      <button disabled={busy}>{busy ? 'Đang xử lý…' : 'Đổi mật khẩu'}</button>
    </form>
  </main>;
}
