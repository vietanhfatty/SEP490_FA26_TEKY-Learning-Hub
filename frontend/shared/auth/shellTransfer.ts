/**
 * Portal and Backoffice use separate origins and cannot share browser storage.
 * Start a destination-held PKCE exchange instead of placing bearer tokens in URLs.
 */
export interface SsoPayload {
  accessToken: string;
  refreshToken?: string;
  role?: string;
  user?: unknown;
}
export function buildCrossAppUrl(origin: string, path: string, payload: SsoPayload): string {
  void payload;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (normalizedPath.startsWith('//')) throw new Error('Invalid shell path');
  const start = encodeURIComponent(JSON.stringify({ source: window.location.origin, path: normalizedPath }));
  return `${origin.replace(/\/$/, '')}/#shell-start=${start}`;
}
/** Legacy token-in-fragment sessions are intentionally rejected. */
export function consumeSsoPayload(): SsoPayload | null {
  if (typeof window !== 'undefined' && window.location.hash.startsWith('#sso=')) {
    window.history.replaceState(null, '', '/login');
  }
  return null;
}
