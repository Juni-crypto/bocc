/**
 * Mobile auth context. Persists {token, user} in expo-secure-store under the
 * shared `bocc_auth` key, hydrates on mount, and exposes login / signup /
 * logout plus the current user and role. Mirrors apps/web/lib/auth.tsx.
 *
 * Guest flows (join / upload / gallery / find-me) never touch this; only hosts
 * and admins do. Host API calls read `token` and attach it as a Bearer.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, AUTH_STORAGE_KEY, type AuthResult, type AuthUser, type UserRole } from './api';

interface AuthState {
  token: string;
  user: AuthUser;
}

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  role: UserRole | null;
  isAdmin: boolean;
  /** True once we have read SecureStore on mount. Guards redirects from flashing. */
  ready: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  signup: (email: string, password: string, name: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function persist(state: AuthState | null): Promise<void> {
  try {
    if (state) {
      await SecureStore.setItemAsync(AUTH_STORAGE_KEY, JSON.stringify(state));
    } else {
      await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
    }
  } catch {
    /* secure store unavailable */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState | null>(null);
  const [ready, setReady] = useState(false);

  // Hydrate from SecureStore once on mount.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(AUTH_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as AuthState;
          if (alive && parsed?.token && parsed?.user) setState(parsed);
        }
      } catch {
        /* ignore malformed storage */
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const apply = useCallback(async (result: AuthResult) => {
    const next: AuthState = { token: result.token, user: result.user };
    setState(next);
    await persist(next);
    return result.user;
  }, []);

  const login = useCallback(
    async (email: string, password: string) =>
      apply(await api.login({ email, password })),
    [apply],
  );

  const signup = useCallback(
    async (email: string, password: string, name: string) =>
      apply(await api.signup({ email, password, name })),
    [apply],
  );

  const logout = useCallback(async () => {
    setState(null);
    await persist(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token: state?.token ?? null,
      user: state?.user ?? null,
      role: state?.user?.role ?? null,
      isAdmin: state?.user?.role === 'ADMIN',
      ready,
      login,
      signup,
      logout,
    }),
    [state, ready, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
