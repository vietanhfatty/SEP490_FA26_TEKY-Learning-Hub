import { useState } from 'react';
import type { FormEvent } from 'react';
import { accountRequest } from './accountApi';
import './account.css';
export function AcceptInvitationPage(){
 const [token]=useState(()=>new URLSearchParams(window.location.hash.slice(1)).get('token')||'');
 const [busy,setBusy]=useState(false);const [done,setDone]=useState(false);const [message,setMessage]=useState('');
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);if(f.get('newPassword')!==f.get('confirmPassword')){setMessage('Mật khẩu xác nhận chưa trùng khớp.');return;}setBusy(true);setMessage('');try{const r=await accountRequest<{message:string}>('/auth/accept-invitation',{token,newPassword:f.get('newPassword'),confirmPassword:f.get('confirmPassword')});setMessage(r.message);setDone(true);window.history.replaceState(null,'',window.location.pathname);}catch(e){setMessage(e instanceof Error?e.message:'Không thể kích hoạt.');}finally{setBusy(false);}}
 return <main className="account-page"><h1>Kích hoạt tài khoản TEKY</h1><p>Đặt mật khẩu để bắt đầu sử dụng tài khoản. Lời mời có hiệu lực 24 giờ và chỉ sử dụng một lần.</p><p role="status" aria-live="polite">{message}</p>{!token?<p>Thiếu mã lời mời. Hãy mở liên kết trong email hoặc liên hệ quản trị viên để gửi lại.</p>:!done&&<form onSubmit={submit} aria-busy={busy}><label>Mật khẩu mới<input name="newPassword" type="password" autoComplete="new-password" minLength={12} required disabled={busy}/></label><label>Xác nhận mật khẩu<input name="confirmPassword" type="password" autoComplete="new-password" minLength={12} required disabled={busy}/></label><p>Tối thiểu 12 ký tự, tối đa 72 byte UTF-8.</p><button disabled={busy}>{busy?'Đang kích hoạt…':'Đặt mật khẩu và kích hoạt'}</button></form>}<a href="/login">Đăng nhập</a></main>;
}
