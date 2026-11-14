import { API_BASE_URL } from '../api-client/auth';
import { PORTAL_ORIGIN, BACKOFFICE_ORIGIN } from './shellConfig';

const permitted = (origin: string) => [PORTAL_ORIGIN, BACKOFFICE_ORIGIN].includes(origin);
const random = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), x => x.toString(16).padStart(2, '0')).join('');
const encode = (data: unknown) => encodeURIComponent(JSON.stringify(data));
function read<T>(prefix: string): T | null {
  if (!window.location.hash.startsWith(prefix)) return null;
  return JSON.parse(decodeURIComponent(window.location.hash.slice(prefix.length))) as T;
}

/** PKCE proof stays in destination sessionStorage; URLs contain only a one-use code. */
export async function processShellHandshake(): Promise<void> {
  const start = read<{ source: string; path: string }>('#shell-start=');
  if (start) {
    if (!permitted(start.source) || !start.path.startsWith('/') || start.path.startsWith('//')) throw new Error('Điểm chuyển phiên không hợp lệ.');
    const verifier = random(); const state = random();
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    const challenge = btoa(String.fromCharCode(...digest)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    sessionStorage.setItem('teky_handoff', JSON.stringify({ verifier, state, path: start.path, createdAt: Date.now() }));
    window.location.replace(`${start.source}/#shell-authorize=${encode({ challenge, state, destination: window.location.origin })}`);
    return;
  }
  const authorize = read<{ challenge: string; state: string; destination: string }>('#shell-authorize=');
  if (authorize) {
    if (!permitted(authorize.destination)) throw new Error('Ứng dụng đích không hợp lệ.');
    const accessToken = localStorage.getItem('teky_access_token') || sessionStorage.getItem('teky_access_token');
    const refreshToken = localStorage.getItem('teky_refresh_token') || sessionStorage.getItem('teky_refresh_token');
    const response = await fetch(`${API_BASE_URL}/auth/shell-transfer`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ refreshToken, challenge: authorize.challenge, destination: authorize.destination }) });
    if (!response.ok) throw new Error('Phiên chuyển tiếp hết hạn. Vui lòng đăng nhập lại.');
    const { code } = await response.json();
    window.location.replace(`${authorize.destination}/#shell-code=${encode({ code, state: authorize.state })}`);
    return;
  }
  const finish = read<{ code: string; state: string }>('#shell-code=');
  if (finish) {
    const pending = JSON.parse(sessionStorage.getItem('teky_handoff') || 'null');
    sessionStorage.removeItem('teky_handoff');
    if (!pending || pending.state !== finish.state || Date.now() - pending.createdAt > 60000) throw new Error('Yêu cầu chuyển phiên không hợp lệ.');
    const response = await fetch(`${API_BASE_URL}/auth/shell-transfer/exchange`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: finish.code, verifier: pending.verifier }) });
    if (!response.ok) throw new Error('Không thể nhận phiên đăng nhập. Vui lòng đăng nhập lại.');
    const { data } = await response.json();
    for (const storage of [localStorage, sessionStorage]) for (const key of ['teky_access_token', 'teky_refresh_token', 'teky_token', 'teky_user', 'teky_role']) storage.removeItem(key);
    sessionStorage.setItem('teky_access_token', data.accessToken);
    sessionStorage.setItem('teky_token', data.accessToken);
    sessionStorage.setItem('teky_refresh_token', data.refreshToken);
    sessionStorage.setItem('teky_user', JSON.stringify(data.user));
    window.location.replace(pending.path);
  }
}

export const shellHandshakePending = () => /^#shell-(start|authorize|code)=/.test(window.location.hash);
