"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { WS_URL, api, getToken } from "@/lib/api";
import type { TelemetryVehicle } from "@/lib/types";

interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

/** Minimal fetch-on-mount hook; the app has no server mutations to cache. */
export function useApi<T>(loader: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let active = true;
    setLoading(true);
    loaderRef
      .current()
      .then((value) => {
        if (!active) return;
        setData(value);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "Request failed");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);
  return { data, error, loading, reload };
}

export type TelemetryMap = Record<number, TelemetryVehicle>;

interface Feed {
  vehicles: TelemetryMap;
  updatedAt: number;
}

// Two contexts on purpose: the shell only needs the connection dot, so it must not
// re-render on every telemetry frame.
const FeedContext = createContext<Feed>({ vehicles: {}, updatedAt: 0 });
const StatusContext = createContext<{ connected: boolean }>({ connected: false });

const SUBPROTOCOL = "zubie.v1";

/**
 * One authenticated telemetry socket per dashboard. The token travels as a
 * WebSocket subprotocol because browsers cannot set headers on a socket and a
 * query string would end up in server and proxy logs.
 */
export function TelemetryProvider({ children }: { children: ReactNode }) {
  const [feed, setFeed] = useState<Feed>({ vehicles: {}, updatedAt: 0 });
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token || typeof window === "undefined") return;
    let disposed = false;
    let retry = 0;
    let socket: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;
    let pending: Feed | null = null;

    // Coalesce bursts: at most one React update per animation frame.
    const flush = () => {
      frame = 0;
      if (pending && !disposed) setFeed(pending);
      pending = null;
    };

    const schedule = () => {
      if (disposed) return;
      // Jittered exponential backoff so a server restart does not get a thundering herd.
      const delay = Math.min(1000 * 2 ** retry, 30_000) * (0.5 + Math.random() / 2);
      retry += 1;
      timer = setTimeout(connect, delay);
    };

    const connect = () => {
      if (disposed) return;
      let opened = false;
      try {
        socket = new WebSocket(`${WS_URL}/api/ws/telemetry`, [SUBPROTOCOL, `bearer.${token}`]);
      } catch {
        schedule();
        return;
      }
      socket.onopen = () => {
        opened = true;
        retry = 0;
        if (!disposed) setConnected(true);
      };
      socket.onmessage = (event) => {
        if (disposed || typeof event.data !== "string") return;
        try {
          const body = JSON.parse(event.data) as { vehicles?: TelemetryVehicle[] };
          if (!Array.isArray(body.vehicles)) return;
          const vehicles: TelemetryMap = {};
          for (const vehicle of body.vehicles) vehicles[vehicle.id] = vehicle;
          pending = { vehicles, updatedAt: Date.now() };
          if (!frame) frame = requestAnimationFrame(flush);
        } catch {
          /* ignore malformed frames */
        }
      };
      socket.onclose = (event) => {
        if (disposed) return;
        setConnected(false);
        // A refused or expired session looks like a plain close to the browser. Ask the API:
        // a 401 there ends the session through the shared "unauthorized" handler.
        if (!opened || event.code === 1008) void api.me().catch(() => undefined);
        schedule();
      };
      socket.onerror = () => socket?.close();
    };

    connect();
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      if (frame) cancelAnimationFrame(frame);
      socket?.close();
    };
  }, []);

  return (
    <StatusContext.Provider value={useMemo(() => ({ connected }), [connected])}>
      <FeedContext.Provider value={feed}>{children}</FeedContext.Provider>
    </StatusContext.Provider>
  );
}

/** Live vehicles for the signed-in organization. The argument is kept for older call sites. */
export function useTelemetry(_enabled = true) {
  const { vehicles, updatedAt } = useContext(FeedContext);
  const { connected } = useContext(StatusContext);
  return useMemo(() => ({ vehicles, connected, updatedAt }), [vehicles, connected, updatedAt]);
}

/** Connection state only; does not re-render on telemetry frames. */
export function useTelemetryStatus() {
  return useContext(StatusContext);
}

/** Tracks a CSS media query, SSR-safe. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

/** Counts a number up on mount — used for the landing-page stat band. */
export function useCountUp(target: number, durationMs = 1400, start = true): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let frame = 0;
    const began = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - began) / durationMs, 1);
      // easeOutExpo keeps the last digits from crawling
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(target * eased);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, start]);
  return value;
}
