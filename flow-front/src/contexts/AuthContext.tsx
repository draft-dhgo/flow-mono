import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { authApi } from '@/api/auth';
import type { AuthUser, LoginRequest, RegisterRequest } from '@/api/types';
import { AuthContext } from './auth-context-value';

const TOKEN_KEYS = {
  access: 'flowflow_access_token',
  refresh: 'flowflow_refresh_token',
} as const;

function restoreSession(): Promise<AuthUser | null> {
  const accessToken = localStorage.getItem(TOKEN_KEYS.access);
  if (!accessToken) return Promise.resolve(null);

  return authApi.me().catch(() => {
    const refreshToken = localStorage.getItem(TOKEN_KEYS.refresh);
    if (!refreshToken) {
      localStorage.removeItem(TOKEN_KEYS.access);
      localStorage.removeItem(TOKEN_KEYS.refresh);
      return null;
    }
    return authApi
      .refresh({ refreshToken })
      .then((res) => {
        localStorage.setItem(TOKEN_KEYS.access, res.accessToken);
        localStorage.setItem(TOKEN_KEYS.refresh, res.refreshToken);
        return authApi.me();
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEYS.access);
        localStorage.removeItem(TOKEN_KEYS.refresh);
        return null;
      });
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearTokens = useCallback(() => {
    localStorage.removeItem(TOKEN_KEYS.access);
    localStorage.removeItem(TOKEN_KEYS.refresh);
    setUser(null);
  }, []);

  // 마운트 시 localStorage 토큰으로 세션 복원
  useEffect(() => {
    let cancelled = false;
    restoreSession().then((restored) => {
      if (!cancelled) {
        setUser(restored);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (data: LoginRequest) => {
    const res = await authApi.login(data);
    localStorage.setItem(TOKEN_KEYS.access, res.accessToken);
    localStorage.setItem(TOKEN_KEYS.refresh, res.refreshToken);
    setUser(res.user);
  }, []);

  const register = useCallback(
    async (data: RegisterRequest) => {
      await authApi.register(data);
      // 회원가입 후 자동 로그인
      await login({ username: data.username, password: data.password });
    },
    [login],
  );

  const logout = useCallback(() => {
    clearTokens();
  }, [clearTokens]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
