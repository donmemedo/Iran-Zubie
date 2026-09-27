"use client";

import { useEffect, useState } from "react";

/**
 * Resolve design tokens to concrete colours.
 *
 * Leaflet writes path colours into SVG *presentation attributes*
 * (`stroke="..."`), where `var(--token)` is not resolved — so anything handed
 * to Leaflet has to be a real colour value read off the document.
 */
export function readCssVar(name: string, fallback = "#2a78d6"): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/** Same, but recomputed whenever the theme changes. */
export function useCssVars<T extends Record<string, string>>(tokens: T, themeKey: string): T {
  const [values, setValues] = useState<T>(tokens);

  useEffect(() => {
    const resolved = {} as T;
    for (const [key, token] of Object.entries(tokens)) {
      resolved[key as keyof T] = readCssVar(token, tokens[key]) as T[keyof T];
    }
    setValues(resolved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeKey]);

  return values;
}
