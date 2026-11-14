import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AuthContext } from './authContext';
import type { AuthContextType } from './authContext';
import { clearAuthSession, verifySession, refreshTokenApi, logoutApi } from '../api-client/auth';
import type { VerifiedSession } from '../api-client/auth';
import { isTokenExpired } from './jwt';
import { consumeSsoPayload } from './shellTransfer';
import { processShellHandshake, shellHandshakePending } from './shellHandshake';

const readStored = (key: string) => localStorage.getItem(key) || sessionStorage.getItem(key);
const readToken = () => readStored('teky_access_token') || readStored('teky_token');
let handshakeStarted = false;
let pendingRestore: Promise<VerifiedSession | null> | null = null;

// Share restoration across StrictMode mounts so rotating refresh tokens are used once.
async function restoreStoredSession(forceRefresh = false): Promise<VerifiedSession | null> {
  if (pendingRestore) return pendingRestore;
  pendingRestore = (async () => {
    let token = readToken();
    let refreshToken = readStored('teky_refresh_token');
    try {
      if (!token && !refreshToken) return null;
      if (forceRefresh || isTokenExpired(token)) {
        if (!refreshToken || !await refreshTokenApi()) throw new Error('Phiên đăng nhập đã hết hạn.');
        token = readToken();
        refreshToken = readStored('teky_refresh_token');
      }
      if (!token) throw new Error('Thiếu phiên đăng nhập.');
      const session = await verifySession(token, refreshToken);
      return readToken() === token && readStored('teky_refresh_token') === refreshToken ? session : null;
    } catch {
      if (readToken() === token && readStored('teky_refresh_token') === refreshToken) clearAuthSession();
      return null;
    }
  })().finally(() => { pendingRestore = null; });
  return pendingRestore;
}

// Legacy token-in-URL payloads are rejected; supported handoffs use a one-use code.
consumeSsoPayload();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<VerifiedSession | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [handshakeError, setHandshakeError] = useState('');
  const revision = useRef(0);

  useEffect(() => {
    if (shellHandshakePending()) {
      if (!handshakeStarted) {
        handshakeStarted = true;
        processShellHandshake().catch(error => setHandshakeError(error instanceof Error ? error.message : 'Không thể chuyển phiên.'));
      }
      return;
    }
    let active = true;
    const current = revision.current;
    void restoreStoredSession().then(restored => {
      if (active && revision.current === current) {
        setSession(restored);
        setIsInitializing(false);
      }
    });
    return () => { active = false; };
  }, []);

  const login: AuthContextType['login'] = async (expectedRole, accessToken, refreshToken) => {
    const current = ++revision.current;
    try {
      const verified = await verifySession(accessToken, refreshToken ?? null);
      if (verified.role !== expectedRole) throw new Error('Vai trò trong phiên đăng nhập không hợp lệ.');
      if (revision.current !== current || readToken() !== accessToken) throw new Error('Phiên đăng nhập đã thay đổi.');
      setSession(verified);
    } catch (error) {
      if (revision.current === current) {
        clearAuthSession();
        setSession(null);
      }
      throw error;
    }
  };

  const logout = useCallback(async () => {
    ++revision.current;
    setSession(null);
    // Clear UI immediately; logoutApi revokes the server refresh token and clears storage.
    await logoutApi();
  }, []);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const current = ++revision.current;
    const restored = await restoreStoredSession(true);
    if (revision.current !== current) return false;
    setSession(restored);
    return !!restored;
  }, []);

  useEffect(() => {
    if (!session) return;
    const remaining = (session.claims.expiresAt ?? 0) * 1000 - Date.now();
    const delay = session.refreshToken ? Math.max(1000, Math.min(remaining - 30000, 30 * 60 * 1000)) : Math.max(0, remaining);
    const timer = setTimeout(() => {
      if (session.refreshToken) void refreshSession();
      else { ++revision.current; clearAuthSession(); setSession(null); }
    }, Math.min(delay, 2147483647));
    return () => clearTimeout(timer);
  }, [session, refreshSession]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'teky_logout_event' || event.key === null || event.key === 'teky_access_token' || event.key === 'teky_token') {
        const current = ++revision.current;
        setSession(null);
        if (event.key === 'teky_logout_event') clearAuthSession();
        if (event.key !== 'teky_logout_event') {
          void restoreStoredSession().then(restored => {
            if (revision.current === current) setSession(restored);
          });
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value: AuthContextType = {
    role: session?.role ?? null,
    user: session?.user ?? null,
    claims: session?.claims ?? null,
    isLoggedIn: !!session && !isTokenExpired(session.accessToken),
    isInitializing,
    accessToken: session?.accessToken ?? null,
    refreshToken: session?.refreshToken ?? null,
    login,
    logout,
    refreshSession,
    updateUser: (profile) => {
      // Profile edits cannot change the identity or the authorization of a session.
      setSession(previous => previous ? { ...previous, user: { ...previous.user,
        fullName: profile.fullName ?? previous.user.fullName,
        phone: profile.phone ?? previous.user.phone,
        avatarUrl: profile.avatarUrl ?? previous.user.avatarUrl,
        themeMode: profile.themeMode ?? previous.user.themeMode,
      } } : null);
    },
  };

  if (shellHandshakePending()) return <main className="p-8" role="status">{handshakeError || 'Đang chuyển đến giao diện của bạn…'}{handshakeError && <a href="/login"> Đăng nhập lại</a>}</main>;
  if (isInitializing) return <main className="p-8" role="status">Đang xác thực phiên đăng nhập…</main>;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
