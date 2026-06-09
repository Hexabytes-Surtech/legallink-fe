'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import type { Role, User, AuthTokens } from '@/types';

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: Role | null;
  /**
   * Persist session and redirect by role.
   * Pass `redirectTo` to override the role default, or `false` to skip navigation
   * entirely (e.g. when the caller wants to run a follow-up request first).
   */
  login: (tokens: AuthTokens, redirectTo?: string | false) => void;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ROLE_HOME: Record<Role, string> = {
  citizen: '/dashboard',
  advocate: '/advocate/dashboard',
  admin: '/admin',
};

// Local storage keys this context owns
const LS_ACCESS = 'll_access_token';
const LS_REFRESH = 'll_refresh_token';
const LS_USER = 'll_user';
const LS_MATTER_STUBS = 'll_matter_stubs';

/**
 * True if the JWT access token still has a comfortable margin of life left.
 * We decode (NOT verify — the server still validates the signature on every
 * request) only to read `exp`, so we can decide whether to trust the stored
 * token on reload instead of forcing a network refresh that may fail. Requires
 * ≥30s of remaining life so we never hand back a token that dies mid-request.
 */
function isAccessTokenValid(token: string): boolean {
  try {
    const part = token.split('.')[1];
    if (!part) return false;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now() + 30_000;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LS_ACCESS);
      localStorage.removeItem(LS_REFRESH);
      localStorage.removeItem(LS_USER);
      // H3: matter stubs are per-citizen; never persist across an account boundary
      localStorage.removeItem(LS_MATTER_STUBS);
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem(LS_ACCESS);
      const storedUser = localStorage.getItem(LS_USER);

      if (!storedToken || !storedUser) {
        setIsLoading(false);
        return;
      }

      let parsedUser: User;
      try {
        parsedUser = JSON.parse(storedUser) as User;
      } catch {
        clearSession();
        setIsLoading(false);
        return;
      }

      // Mock mode: trust local storage outright.
      if (process.env.NEXT_PUBLIC_USE_MOCK === 'true') {
        setAccessToken(storedToken);
        setUser(parsedUser);
        setIsLoading(false);
        return;
      }

      // Happy path: the stored access token is still valid → restore the session
      // immediately, with NO network dependency. A page refresh can no longer
      // log the user out just because the refresh-token cookie didn't come back
      // (e.g. blocked in a cross-site context). We still roll the token forward
      // in the background, but a failure there is non-fatal.
      if (isAccessTokenValid(storedToken)) {
        setAccessToken(storedToken);
        setUser(parsedUser);
        setIsLoading(false);
        apiClient<{ accessToken: string }>('/auth/refresh-token', {
          method: 'POST',
          skipAuth: true,
        })
          .then(res => {
            if (res.success && res.data) {
              localStorage.setItem(LS_ACCESS, res.data.accessToken);
              setAccessToken(res.data.accessToken);
            }
          })
          .catch(() => {
            /* keep the still-valid stored token */
          });
        return;
      }

      // Access token expired → we MUST refresh to stay signed in. Only here can
      // a failed refresh legitimately end the session.
      try {
        const res = await apiClient<{ accessToken: string }>(
          '/auth/refresh-token',
          { method: 'POST', skipAuth: true }
        );
        if (res.success && res.data) {
          localStorage.setItem(LS_ACCESS, res.data.accessToken);
          setAccessToken(res.data.accessToken);
          setUser(parsedUser);
        } else {
          clearSession();
        }
      } catch {
        clearSession();
      }
      setIsLoading(false);
    };

    restoreSession();
  }, [clearSession]);

  const login = useCallback(
    (tokens: AuthTokens, redirectTo?: string | false) => {
      localStorage.setItem(LS_ACCESS, tokens.accessToken);
      if (tokens.refreshToken) localStorage.setItem(LS_REFRESH, tokens.refreshToken);
      localStorage.setItem(LS_USER, JSON.stringify(tokens.user));
      setAccessToken(tokens.accessToken);
      setUser(tokens.user);

      // H4: role-aware redirect. Explicit redirectTo wins (e.g. claim-on-login back to /matter/[id]).
      const target = redirectTo ?? ROLE_HOME[tokens.user.role];
      if (target) router.push(target);
    },
    [router]
  );

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      localStorage.setItem(LS_USER, JSON.stringify(next));
      return next;
    });
  }, []);

  const logout = useCallback(async () => {
    if (process.env.NEXT_PUBLIC_USE_MOCK !== 'true') {
      try {
        await apiClient('/auth/logout', { method: 'POST' });
      } catch (err) {
        console.error('Logout request failed:', err);
      }
    }
    clearSession();
    router.push('/');
  }, [clearSession, router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!user && !!accessToken,
        isLoading,
        role: user?.role ?? null,
        login,
        logout,
        updateUser,
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
