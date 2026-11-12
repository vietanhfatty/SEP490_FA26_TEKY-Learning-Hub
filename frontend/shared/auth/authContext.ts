import { createContext, useContext } from 'react';
import type { UserRole } from '../types';
import type { JwtClaims } from './jwt';

export interface AuthUser {
  userId: number;
  email: string;
  fullName: string;
  role: string;
  roleId: number;
  avatarUrl?: string;
  phone?: string;
  status: string;
  themeMode: string;
}

export interface AuthContextType {
  role: UserRole | null;
  user: AuthUser | null;
  claims: JwtClaims | null;
  isLoggedIn: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  login: (
    role: UserRole,
    accessToken?: string,
    refreshToken?: string,
    user?: Partial<AuthUser>
  ) => void;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

/**
 * Context tách riêng khỏi file component để tuân thủ quy tắc
 * `react-refresh/only-export-components` (Fast Refresh).
 */
export const AuthContext = createContext<AuthContextType>({
  role: null,
  user: null,
  claims: null,
  isLoggedIn: false,
  accessToken: null,
  refreshToken: null,
  login: () => {},
  logout: async () => {},
  refreshSession: async () => false,
});

/** Hook truy cập phiên đăng nhập hiện tại. */
export const useAuth = () => useContext(AuthContext);
