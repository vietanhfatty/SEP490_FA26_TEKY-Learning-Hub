import React, { useState, useEffect, useCallback } from 'react';
import { AuthContext } from './authContext';
import type { AuthContextType, AuthUser } from './authContext';
import { refreshTokenApi, logoutApi, normalizeRole } from '../api-client/auth';
import { decodeJwtClaims, roleFromClaims, isTokenExpired } from './jwt';
import type { JwtClaims } from './jwt';
import type { UserRole } from '../types';
import { consumeSsoPayload } from './shellTransfer';
import { processShellHandshake, shellHandshakePending } from './shellHandshake';
let handshakeStarted = false;

/**
 * Đọc token từ localStorage trước, sau đó tới sessionStorage.
 * `localStorage` được ưu tiên vì backend phân biệt "ghi nhớ đăng nhập" (30 ngày) với phiên tạm.
 */
function readStoredToken(key: string): string | null {
  return localStorage.getItem(key) || sessionStorage.getItem(key);
}

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('teky_user') || sessionStorage.getItem('teky_user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

/**
 * Nhận phiên đăng nhập được chuyển từ ứng dụng khác qua hash fragment (`#sso=...`).
 *
 * Hàm này được gọi ở cấp module (chạy đúng một lần khi bundle được nạp) VÀ lại trong
 * effect của `AuthProvider`, vì việc đổi hash trên cùng một origin chỉ là
 * same-document navigation - module JavaScript KHÔNG được nạp lại.
 */
consumeSsoPayload();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    readStoredToken('teky_access_token') || readStoredToken('teky_token')
  );

  const [refreshToken, setRefreshToken] = useState<string | null>(() =>
    readStoredToken('teky_refresh_token')
  );

  const [claims, setClaims] = useState<JwtClaims | null>(() =>
    decodeJwtClaims(readStoredToken('teky_access_token') || readStoredToken('teky_token'))
  );

  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());
  const [handshakeError, setHandshakeError] = useState('');
  useEffect(() => {
    if (!shellHandshakePending() || handshakeStarted) return;
    handshakeStarted = true;
    processShellHandshake().catch(error => setHandshakeError(error instanceof Error ? error.message : 'Không thể chuyển phiên.'));
  }, []);

  /**
   * Vai trò luôn được suy ra từ CLAIM trong JWT (ưu tiên `role_id`),
   * fallback về `localStorage` khi token demo / token không phải JWT.
   */
  const [role, setRole] = useState<UserRole | null>(() => {
    const fromClaims = roleFromClaims(
      decodeJwtClaims(readStoredToken('teky_access_token') || readStoredToken('teky_token'))
    );
    if (fromClaims) {
      return fromClaims;
    }

    const stored = localStorage.getItem('teky_role') || sessionStorage.getItem('teky_role');
    return import.meta.env.DEV && import.meta.env.VITE_DEMO_AUTH === 'true' ? (stored as AuthContextType['role']) || null : null;
  });

  const login = (
    newRole: UserRole,
    newAccessToken = 'teky-access-token',
    newRefreshToken = 'teky-refresh-token',
    newUser?: Partial<AuthUser>
  ) => {
    const decoded = decodeJwtClaims(newAccessToken);
    const claimRole = roleFromClaims(decoded);
    const finalRole = claimRole ?? (import.meta.env.DEV && import.meta.env.VITE_DEMO_AUTH === 'true' ? normalizeRole(newRole) : null);
    if (!finalRole) throw new Error('Vai trò không hợp lệ.');
    const storage = sessionStorage.getItem('teky_access_token') === newAccessToken ? sessionStorage : localStorage;

    setRole(finalRole);
    setAccessToken(newAccessToken);
    setRefreshToken(newRefreshToken);
    setClaims(decoded);

    if (newUser) {
      const merged = { ...(user ?? {}), ...newUser } as AuthUser;
      setUser(merged);
      storage.setItem('teky_user', JSON.stringify(merged));
    }

    storage.setItem('teky_role', finalRole);
    storage.setItem('teky_access_token', newAccessToken);
    storage.setItem('teky_refresh_token', newRefreshToken);
    storage.setItem('teky_token', newAccessToken);
  };

  const logout = useCallback(async () => {
    await logoutApi();
    setRole(null);
    setAccessToken(null);
    setRefreshToken(null);
    setClaims(null);
    setUser(null);
  }, []);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const success = await refreshTokenApi();
    if (success) {
      const newToken = readStoredToken('teky_access_token') || readStoredToken('teky_token');
      setAccessToken(newToken);
      setRefreshToken(readStoredToken('teky_refresh_token'));
      setUser(readStoredUser());
      setClaims(decodeJwtClaims(newToken));
      setRole(roleFromClaims(decodeJwtClaims(newToken)));
    } else {
      await logout();
    }
    return success;
  }, [logout]);

  /**
   * Nhận phiên chuyển từ ứng dụng khác.
   *
   * Đổi hash fragment trên cùng origin là same-document navigation:
   * module JavaScript KHÔNG được nạp lại, nên lệnh gọi ở cấp module không chạy lại.
   * Vì vậy ta lắng nghe `hashchange` và đồng bộ lại toàn bộ phiên từ storage.
   */
  const applySsoSession = useCallback(() => {
    const payload = consumeSsoPayload();
    if (!payload) {
      return false;
    }

    const token = payload.accessToken;
    const decoded = decodeJwtClaims(token);

    setAccessToken(token);
    setRefreshToken(payload.refreshToken ?? readStoredToken('teky_refresh_token'));
    setClaims(decoded);
    setRole(roleFromClaims(decoded) ?? (payload.role as UserRole | undefined) ?? null);
    setUser((payload.user as AuthUser | undefined) ?? readStoredUser());

    return true;
  }, []);

  useEffect(() => {
    // Phiên từ ứng dụng khác đã được `consumeSsoPayload()` xử lý ở cấp module,
    // nên state khởi tạo đã nạp đúng token -> không cần setState trong effect.
    const onHashChange = () => {
      if (applySsoSession()) {
        // Token mới đã có trong storage -> buộc React đọc lại state.
        setAccessToken((prev) => prev ?? readStoredToken('teky_access_token'));
      }
    };

    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [applySsoSession]);

  // Đồng bộ đa tab: Lắng nghe sự kiện đăng xuất từ tab khác qua localStorage
  useEffect(() => {
    const handleStorageEvent = (event: StorageEvent) => {
      if (
        event.key === 'teky_logout_event' ||
        (event.key === 'teky_access_token' && !event.newValue)
      ) {
        setRole(null);
        setAccessToken(null);
        setRefreshToken(null);
        setClaims(null);
        setUser(null);
      }
    };

    window.addEventListener('storage', handleStorageEvent);
    return () => window.removeEventListener('storage', handleStorageEvent);
  }, []);

  // Tự động làm mới token định kỳ, đồng bộ lại claim sau mỗi lần refresh.
  useEffect(() => {
    if (accessToken && refreshToken) {
      const interval = setInterval(() => {
        refreshSession().catch(() => {});
      }, 30 * 60 * 1000); // 30 phút
      return () => clearInterval(interval);
    }
  }, [accessToken, refreshToken, refreshSession]);

  // Khi access token hết hạn, tự động làm mới ngay lập tức thay vì chờ chu kỳ 30 phút.
  useEffect(() => {
    if (!accessToken || !refreshToken) {
      return;
    }

    if (isTokenExpired(accessToken)) {
      const timer = setTimeout(() => {
        refreshSession().catch(() => {});
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [accessToken, refreshToken, refreshSession]);

  const value: AuthContextType = {
    role,
    user,
    claims,
    isLoggedIn: !!accessToken && !!role,
    accessToken,
    refreshToken,
    login,
    logout,
    refreshSession,
    updateUser: (profile) => {
      setUser(previous => previous ? { ...previous, ...profile } : previous);
      for (const storage of [localStorage, sessionStorage]) {
        const raw=storage.getItem('teky_user');
        if (raw) { try { storage.setItem('teky_user',JSON.stringify({...JSON.parse(raw),...profile})); } catch { storage.removeItem('teky_user'); } }
      }
    },
  };

  if (shellHandshakePending()) return <main className="p-8" role="status">{handshakeError || "Đang chuyển đến giao diện của bạn…"}{handshakeError && <a href="/login"> Đăng nhập lại</a>}</main>;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
