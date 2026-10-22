"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { UNAUTHORIZED_EVENT, api, getToken, setToken } from "@/lib/api";
import { useLocale } from "@/lib/locale-context";
import type { User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  status: "loading" | "authenticated" | "anonymous";
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    email: string;
    password: string;
    full_name: string;
    company: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  const router = useRouter();
  const { href } = useLocale();

  useEffect(() => {
    let active = true;
    if (!getToken()) {
      setStatus("anonymous");
      return;
    }
    api
      .me()
      .then((value) => {
        if (!active) return;
        setUser(value);
        setStatus("authenticated");
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setStatus("anonymous");
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.login(email, password);
    setToken(result.access_token);
    setUser(result.user);
    setStatus("authenticated");
  }, []);

  const register = useCallback(
    async (payload: { email: string; password: string; full_name: string; company: string }) => {
      const result = await api.register(payload);
      setToken(result.access_token);
      setUser(result.user);
      setStatus("authenticated");
    },
    [],
  );

  // Local end of session: forget the token, drop any cached pages, go to the login screen.
  const endSession = useCallback(() => {
    setToken(null);
    setUser(null);
    setStatus("anonymous");
    navigator.serviceWorker?.controller?.postMessage({ type: "logout" });
    router.push(href("/login"));
  }, [href, router]);

  const logout = useCallback(() => {
    // Revoke the token server-side too. The request reads the token synchronously
    // before endSession clears it, and a failure must not block signing out.
    void api.logout().catch(() => undefined);
    endSession();
  }, [endSession]);

  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, endSession);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, endSession);
  }, [endSession]);

  const value = useMemo(
    () => ({ user, status, login, register, logout }),
    [user, status, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
