/**
 * Chuyển phiên đăng nhập giữa hai ứng dụng Vite chạy ở các port khác nhau.
 *
 * Lưu ý: `localStorage` và `sessionStorage` đều bị cô lập theo ORIGIN.
 * `http://localhost:3000` và `http://localhost:3001` là hai origin khác nhau,
 * nên token KHÔNG thể tự động chia sẻ qua storage.
 *
 * Giải pháp: truyền payload phiên trong HASH FRAGMENT (`#sso=<base64url-json>`) của URL.
 * Hash fragment không bao giờ được gửi lên server (không nằm trong HTTP request),
 * nên token không bị ghi vào access log của proxy hay backend.
 */

const SSO_HASH_PREFIX = '#sso=';

export interface SsoPayload {
  accessToken: string;
  refreshToken?: string;
  role?: string;
  user?: unknown;
}

/** Encode UTF-8 -> base64url (không dùng `btoa` trực tiếp vì lỗi với ký tự non-ASCII). */
function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Decode base64url -> UTF-8 string. */
function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Dựng URL đích kèm phiên đăng nhập để chuyển Shell.
 */
export function buildCrossAppUrl(origin: string, path: string, payload: SsoPayload): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const normalizedOrigin = origin.replace(/\/$/, '');
  const encoded = toBase64Url(JSON.stringify(payload));
  return `${normalizedOrigin}${normalizedPath}${SSO_HASH_PREFIX}${encoded}`;
}

/**
 * Đọc phiên từ hash fragment của URL hiện tại, lưu vào storage rồi dọn hash.
 *
 * Hash CHỈ được dọn sau khi đọc thành công, để không mất phiên nếu parse lỗi.
 *
 * @returns payload phiên nếu có, ngược lại `null`.
 */
export function consumeSsoPayload(): SsoPayload | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const hash = window.location.hash;
  if (!hash.startsWith(SSO_HASH_PREFIX)) {
    return null;
  }

  const encoded = hash.slice(SSO_HASH_PREFIX.length);
  if (!encoded) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    return null;
  }

  let payload: SsoPayload | null = null;
  try {
    const parsed = JSON.parse(fromBase64Url(encoded)) as SsoPayload;
    if (parsed?.accessToken) {
      payload = parsed;
    }
  } catch {
    payload = null;
  }

  if (!payload) {
    // Dữ liệu hỏng -> dọn hash để tránh lặp lại lỗi ở mỗi lần render.
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    return null;
  }

  try {
    localStorage.setItem('teky_access_token', payload.accessToken);
    localStorage.setItem('teky_token', payload.accessToken);
    if (payload.refreshToken) {
      localStorage.setItem('teky_refresh_token', payload.refreshToken);
    }
    if (payload.role) {
      localStorage.setItem('teky_role', payload.role);
    }
    if (payload.user) {
      localStorage.setItem('teky_user', JSON.stringify(payload.user));
    }
  } catch {
    // Trình duyệt chặn storage (private mode) -> bỏ qua, người dùng sẽ đăng nhập lại.
  }

  // Dọn hash ngay để token không nằm lâu trong lịch sử trình duyệt.
  window.history.replaceState(null, '', window.location.pathname + window.location.search);

  return payload;
}
