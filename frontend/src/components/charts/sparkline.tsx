"use client";

import { useMemo } from "react";

/** A bare trend mark for stat tiles — no axes, no tooltip, decorative support. */
export function Sparkline({
  values,
  color = "var(--series-1)",
  width = 92,
  height = 30,
}: {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  const path = useMemo(() => {
    if (values.length < 2) return "";
    const max = Math.max(...values);
    const min = Math.min(...values);
    const span = max - min || 1;
    return values
      .map((value, index) => {
        const x = (index / (values.length - 1)) * (width - 2) + 1;
        const y = height - 2 - ((value - min) / span) * (height - 4);
        return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [values, width, height]);

  if (!path) return null;
  return (
    <svg width={width} height={height} aria-hidden="true" style={{ direction: "ltr" }}>
      <path d={path} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
