"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { WS_URL } from "@/lib/api";
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

/**
 * Subscribes to the live telemetry socket with exponential backoff.
 * Returns the latest frame keyed by vehicle id plus the connection state.
 */
export function useTelemetry(enabled = true) {
  const [vehicles, setVehicles] = useState<TelemetryMap>({});
  const [connected, setConnected] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number>(0);
  const socketRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      let socket: WebSocket;
      try {
        socket = new WebSocket(`${WS_URL}/api/ws/telemetry`);
      } catch {
        schedule();
        return;
      }
      socketRef.current = socket;

      socket.onopen = () => {
        if (disposed) return;
        retryRef.current = 0;
        setConnected(true);
      };
      socket.onmessage = (event) => {
        if (disposed) return;
        try {
          const frame = JSON.parse(event.data) as { vehicles?: TelemetryVehicle[] };
          if (!frame.vehicles) return;
          const next: TelemetryMap = {};
          for (const vehicle of frame.vehicles) next[vehicle.id] = vehicle;
          setVehicles(next);
          setUpdatedAt(Date.now());
        } catch {
          /* ignore malformed frames */
        }
      };
      socket.onclose = () => {
        if (disposed) return;
        setConnected(false);
        schedule();
      };
      socket.onerror = () => socket.close();
    };

    const schedule = () => {
      if (disposed) return;
      const delay = Math.min(1000 * 2 ** retryRef.current, 15_000);
      retryRef.current += 1;
      timerRef.current = setTimeout(connect, delay);
    };

    connect();
    return () => {
      disposed = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [enabled]);

  return useMemo(() => ({ vehicles, connected, updatedAt }), [vehicles, connected, updatedAt]);
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
