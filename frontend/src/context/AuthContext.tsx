import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { jwtDecode } from '../utils/jwtDecode';
import { api, setAccessToken, apiErrorMessage } from '../api/client';
import { useQueryClient } from '@tanstack/react-query';
import { Role } from '../types';

interface SessionUser {
  id: string;
  role: Role;
}

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<SessionUser>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  // On first load there's no access token in memory (page reload wipes it
  // by design — see api/client.ts). Try a silent refresh against the
  // httpOnly cookie so an already-logged-in user doesn't have to sign in
  // again just because they refreshed the page.
  useEffect(() => {
    (async () => {
      try {
        const res = await api.post('/auth/refresh');
        applyToken(res.data.accessToken);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function applyToken(token: string) {
    setAccessToken(token);
    const decoded = jwtDecode<{ sub: string; role: Role }>(token);
    const sessionUser = { id: decoded.sub, role: decoded.role };
    setUser(sessionUser);
    return sessionUser;
  }

  async function login(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password });
    return applyToken(res.data.accessToken);
  }

  async function signup(email: string, password: string, name: string) {
    const res = await api.post('/auth/signup', { email, password, name });
    applyToken(res.data.accessToken);
  }

  async function logout() {
    await api.post('/auth/logout').catch(() => undefined);
    setAccessToken(null);
    setUser(null);
    queryClient.clear();
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { apiErrorMessage };
