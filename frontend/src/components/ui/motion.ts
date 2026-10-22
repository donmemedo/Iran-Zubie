"use client";

import { useReducedMotion } from "framer-motion";

/** Critically damped: no overshoot, ~350 ms, and interruptible mid-flight. */
export const spring = { type: "spring", bounce: 0, duration: 0.35 } as const;

/** Cross-fade used instead of any slide or spring when motion is reduced. */
export const fade = { duration: 0.15 } as const;

/** A travel distance that collapses to 0 under reduced motion, leaving only the fade. */
export function useShift(distance: number): number {
  return useReducedMotion() ? 0 : distance;
}
