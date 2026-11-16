import { clearAuthSession, logoutApi } from '../api-client/auth';
import { PUBLIC_ORIGIN } from './shellConfig';

/** Every role returns to the public login app after ending its session. */
export async function logoutAndRedirect(): Promise<void> {
  await logoutApi();
  // A delayed logout response must not interrupt a newer login.
  const accessToken = localStorage.getItem('teky_access_token') || sessionStorage.getItem('teky_access_token')
    || localStorage.getItem('teky_token') || sessionStorage.getItem('teky_token');
  if (!accessToken) {
    window.location.replace(new URL('/login?loggedOut=1', PUBLIC_ORIGIN).href);
  }
}

/** Ports have separate storage; clear the public app before restoring any old session. */
export function consumeLogoutRedirect(): void {
  const url = new URL(window.location.href);
  if (url.origin !== new URL(PUBLIC_ORIGIN).origin || url.pathname !== '/login'
    || url.searchParams.get('loggedOut') !== '1') return;

  clearAuthSession();
  url.searchParams.delete('loggedOut');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}
