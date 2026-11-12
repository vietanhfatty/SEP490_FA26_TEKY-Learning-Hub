import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UserRole } from '../types';
import { refreshTokenApi, logoutApi, normalizeRole } from '../api-client/auth';

interface AuthUser {
  userId: number;
  email: string;
  fullName: string;
  role: string;
  roleId: number;
  avatarUrl?: string;
  phone?: string;
}

interface AuthContextType {
  role: UserRole | null;
  user: AuthUser | null;
  isLoggedIn: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  login: (role: UserRole, accessToken?: string, refreshToken?: string, user?: AuthUser) => void;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  role: null,
  user: null,
  isLoggedIn: false,
  accessToken: null,
  refreshToken: null,
  login: () => {},
  logout: async () => {},
  refreshSession: async () => false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole | null>(() => {
    return (localStorage.getItem('teky_role') as UserRole) || null;
  });

  const [accessToken, setAccessToken] = useState<string | null>(() => {
    return localStorage.getItem('teky_access_token') || localStorage.getItem('teky_token') || null;
  });

  const [refreshToken, setRefreshToken] = useState<string | null>(() => {
    return localStorage.getItem('teky_refresh_token') || null;
  });

  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('teky_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const login = (newRole: UserRole, newAccessToken = 'teky-access-token', newRefreshToken = 'teky-refresh-token', newUser?: AuthUser) => {
    const finalRole = normalizeRole(newRole);
    setRole(finalRole);
    setAccessToken(newAccessToken);
    setRefreshToken(newRefreshToken);
    if (newUser) setUser(newUser);

    localStorage.setItem('teky_role', finalRole);
    localStorage.setItem('teky_access_token', newAccessToken);
    localStorage.setItem('teky_refresh_token', newRefreshToken);
    localStorage.setItem('teky_token', newAccessToken);
    if (newUser) {
      localStorage.setItem('teky_user', JSON.stringify(newUser));
    }
  };

  const logout = useCallback(async () => {
    await logoutApi();
    setRole(null);
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
  }, []);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const success = await refreshTokenApi();
    if (success) {
      setAccessToken(localStorage.getItem('teky_access_token'));
      setRefreshToken(localStorage.getItem('teky_refresh_token'));
    } else {
      await logout();
    }
    return success;
  }, [logout]);

  // Auto-refresh token verification
  useEffect(() => {
    if (accessToken && refreshToken) {
      // Periodic token freshness verification
      const interval = setInterval(() => {
        refreshSession().catch(() => {});
      }, 30 * 60 * 1000); // 30 minutes
      return () => clearInterval(interval);
    }
  }, [accessToken, refreshToken, refreshSession]);

  return (
    <AuthContext.Provider
      value={{
        role,
        user,
        isLoggedIn: !!accessToken,
        accessToken,
        refreshToken,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
