'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';

interface User {
  userId: string;
  email: string;
  role: 'citizen' | 'advocate' | 'admin';
}

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (tokens: { accessToken: string; refreshToken: string; user: User }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: restore from localStorage and try to refresh
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem('ll_access_token');
      const storedUser = localStorage.getItem('ll_user');
      const storedRefresh = localStorage.getItem('ll_refresh_token');

      if (storedToken && storedUser) {
        try {
          setAccessToken(storedToken);
          setUser(JSON.parse(storedUser));
          // Try silent refresh
          if (storedRefresh) {
            const res = await apiClient<{ accessToken: string; refreshToken: string }>(
              '/auth/refresh',
              { method: 'POST', body: { refreshToken: storedRefresh }, skipAuth: true }
            );
            if (res.success && res.data) {
              const { accessToken: newAccess, refreshToken: newRefresh } = res.data;
              localStorage.setItem('ll_access_token', newAccess);
              localStorage.setItem('ll_refresh_token', newRefresh);
              setAccessToken(newAccess);
            }
          }
        } catch {
          // Refresh failed: clear session
          clearSession();
        }
      }
      setIsLoading(false);
    };

    restoreSession();
  }, []);

  const login = useCallback((tokens: { accessToken: string; refreshToken: string; user: User }) => {
    localStorage.setItem('ll_access_token', tokens.accessToken);
    localStorage.setItem('ll_refresh_token', tokens.refreshToken);
    localStorage.setItem('ll_user', JSON.stringify(tokens.user));
    setAccessToken(tokens.accessToken);
    setUser(tokens.user);
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, []);

  function clearSession() {
    localStorage.removeItem('ll_access_token');
    localStorage.removeItem('ll_refresh_token');
    localStorage.removeItem('ll_user');
    setAccessToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!user && !!accessToken,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
