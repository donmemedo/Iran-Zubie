"use client";

import { formatDecimal } from "@/lib/format";
import { useLocale } from "@/lib/locale-context";

/**
 * A 240° arc meter for a single bounded score. The value is always printed in
 * the middle, so the arc is reinforcement rather than the only encoding.
 */
export function Gauge({
  value,
  max = 100,
  size = 132,
  color = "var(--series-1)",
  label,
}: {
  value: number;
  max?: number;
  size?: number;
  color?: string;
  label?: string;
}) {
  const { locale } = useLocale();
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const sweep = 0.72; // 260° of the circle
  const ratio = Math.min(Math.max(value / max, 0), 1);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ direction: "ltr" }} aria-hidden="true">
        <g transform={`rotate(${90 + (1 - sweep) * 180} ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--surface-sunken)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference * sweep} ${circumference}`}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference * sweep * ratio} ${circumference}`}
            style={{ transition: "stroke-dasharray 900ms cubic-bezier(0.22,1,0.36,1)" }}
          />
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tnum text-[26px] font-semibold leading-none tracking-tight text-ink">
          {formatDecimal(value, locale, 1)}
        </span>
        {label && <span className="mt-1.5 text-[11px] text-ink-muted">{label}</span>}
      </div>
    </div>
  );
}
