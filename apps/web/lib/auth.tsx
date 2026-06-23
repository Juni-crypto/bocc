"use client";

// Client-side auth context. Persists {token, user} in localStorage under
// `bocc_auth`, hydrates on mount, and exposes login / signup / logout plus the
// current user and role. Guest flows never touch this; only hosts + admins do.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, AUTH_STORAGE_KEY } from "./api";
import type { AuthResult, AuthUser, UserRole } from "./types";

interface AuthState {
  token: string;
  user: AuthUser;
}

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  role: UserRole | null;
  isAdmin: boolean;
  /** True until we have read localStorage on mount. Guards redirects from flashing. */
  ready: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  signup: (email: string, password: string, name: string) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function persist(state: AuthState | null) {
  if (typeof window === "undefined") return;
  try {
    if (state) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
    } else {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    /* storage unavailable */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState | null>(null);
  const [ready, setReady] = useState(false);

  // Hydrate from localStorage once on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AuthState;
        if (parsed?.token && parsed?.user) setState(parsed);
      }
    } catch {
      /* ignore malformed storage */
    }
    setReady(true);
  }, []);

  // Keep the token fresh across tabs.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== AUTH_STORAGE_KEY) return;
      try {
        setState(e.newValue ? (JSON.parse(e.newValue) as AuthState) : null);
      } catch {
        setState(null);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const apply = useCallback((result: AuthResult) => {
    const next: AuthState = { token: result.token, user: result.user };
    setState(next);
    persist(next);
    return result.user;
  }, []);

  const login = useCallback(
    async (email: string, password: string) => apply(await api.login({ email, password })),
    [apply],
  );

  const signup = useCallback(
    async (email: string, password: string, name: string) =>
      apply(await api.signup({ email, password, name })),
    [apply],
  );

  const logout = useCallback(() => {
    setState(null);
    persist(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token: state?.token ?? null,
      user: state?.user ?? null,
      role: state?.user?.role ?? null,
      isAdmin: state?.user?.role === "ADMIN",
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
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
