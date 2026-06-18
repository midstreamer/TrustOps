'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, clearToken, getToken } from '@/lib/api';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api<User>('/auth/me');
      setUser(me);
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function hasRole(user: User | null, roles: string[]) {
  return user?.roles.some((r) => roles.includes(r)) ?? false;
}

export const SOC_ROLES = ['Platform Admin', 'SOC Manager', 'SOC Analyst'];
export const MANAGER_ROLES = ['Platform Admin', 'SOC Manager'];
export const CLIENT_ROLES = ['Client Admin', 'Client Viewer'];
