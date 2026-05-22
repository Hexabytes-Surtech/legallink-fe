'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';

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
  role: 'citizen' | 'advocate' | 'admin' | null;
  login: (tokens: { accessToken: string; refreshToken: string; user: User }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem('ll_access_token');
    localStorage.removeItem('ll_refresh_token');
    localStorage.removeItem('ll_user');
    setAccessToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem('ll_access_token');
      const storedUser = localStorage.getItem('ll_user');

      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(storedUser) as User;
        
        // If mock mode is active, restore session immediately without contacting backend
        if (process.env.NEXT_PUBLIC_USE_MOCK === 'true') {
          setAccessToken(storedToken);
          setUser(parsedUser);
          setIsLoading(false);
          return;
        }

        try {
          // In real API mode, fetch new access token using httpOnly refresh cookie
          const res = await apiClient<{ accessToken: string }>(
            '/auth/refresh-token',
            { method: 'POST', skipAuth: true }
          );
          if (res.success && res.data) {
            const { accessToken: newAccess } = res.data;
            localStorage.setItem('ll_access_token', newAccess);
            setAccessToken(newAccess);
            setUser(parsedUser);
          } else {
            clearSession();
          }
        } catch {
          clearSession();
        }
      }
      setIsLoading(false);
    };

    restoreSession();
  }, [clearSession]);

  const login = useCallback((tokens: { accessToken: string; refreshToken: string; user: User }) => {
    localStorage.setItem('ll_access_token', tokens.accessToken);
    localStorage.setItem('ll_refresh_token', tokens.refreshToken);
    localStorage.setItem('ll_user', JSON.stringify(tokens.user));
    setAccessToken(tokens.accessToken);
    setUser(tokens.user);
  }, []);

  const logout = useCallback(async () => {
    // If running in real mode, notify backend to clear httpOnly cookies
    if (process.env.NEXT_PUBLIC_USE_MOCK !== 'true') {
      try {
        await apiClient('/auth/logout', { method: 'POST' });
      } catch (err) {
        console.error('Logout request failed:', err);
      } finally {
        clearSession();
      }
    } else {
      clearSession();
    }
  }, [clearSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!user && !!accessToken,
        isLoading,
        role: user?.role || null,
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