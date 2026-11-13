import React, { createContext, useContext, useState } from 'react';
import type { UserRole } from '../types';

interface AuthContextType {
  role: UserRole | null;
  isLoggedIn: boolean;
  token: string | null;
  login: (role: UserRole, token?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  role: null,
  isLoggedIn: false,
  token: null,
  login: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole | null>(() => {
    return (localStorage.getItem('teky_role') as UserRole) || null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('teky_token') || null;
  });

  const login = (newRole: UserRole, newToken: string = 'demo-token') => {
    setRole(newRole);
    setToken(newToken);
    localStorage.setItem('teky_role', newRole);
    localStorage.setItem('teky_token', newToken);
  };

  const logout = () => {
    setRole(null);
    setToken(null);
    localStorage.removeItem('teky_role');
    localStorage.removeItem('teky_token');
  };

  return (
    <AuthContext.Provider value={{ role, isLoggedIn: !!token, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

