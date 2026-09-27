"use client";

import { formatNumber } from "@/lib/format";
import { useLocale } from "@/lib/locale-context";

export interface HBarDatum {
  label: string;
  value: number;
  color?: string;
  note?: string;
}

/**
 * Horizontal bars for a ranked category list. Built from flex rows rather than
 * SVG so the labels wrap and mirror correctly in RTL.
 */
export function HBarChart({ data, unit }: { data: HBarDatum[]; unit?: string }) {
  const { locale } = useLocale();
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <ul className="space-y-3">
      {data.map((item) => (
        <li key={item.label} className="group">
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="truncate text-[13px] text-ink-secondary">{item.label}</span>
            <span className="tnum shrink-0 text-[13px] font-semibold text-ink">
              {formatNumber(item.value, locale)}
              {unit && <span className="ms-1 text-[11px] font-normal text-ink-muted">{unit}</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: `${Math.max((item.value / max) * 100, 3)}%`,
                background: item.color ?? "var(--series-1)",
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
