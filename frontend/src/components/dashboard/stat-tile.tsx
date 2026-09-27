"use client";

import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";

import { Sparkline } from "@/components/charts/sparkline";
import { clsx, formatDecimal } from "@/lib/format";
import { useLocale } from "@/lib/locale-context";
import type { StatDelta } from "@/lib/types";

/**
 * A headline number with its own change cue. The delta arrow is paired with a
 * sign and a colour that means *good or bad*, never just up or down — a fuel
 * increase is a regression even though the arrow points up.
 */
export function StatTile({
  label,
  value,
  unit,
  delta,
  icon: Icon,
  trend,
  trendColor = "var(--series-1)",
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: StatDelta;
  icon?: LucideIcon;
  trend?: number[];
  trendColor?: string;
  accent?: string;
}) {
  const { locale, t } = useLocale();
  const DeltaIcon =
    delta?.direction === "up" ? ArrowUpRight : delta?.direction === "down" ? ArrowDownRight : Minus;

  return (
    <div className="card group relative overflow-hidden p-5">
      {accent && (
        <span
          className="absolute inset-x-0 top-0 h-[3px] opacity-70"
          style={{ background: accent }}
          aria-hidden="true"
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12.5px] leading-tight text-ink-muted">{label}</p>
        {Icon && (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-sunken)] text-ink-muted transition-colors group-hover:text-[var(--brand)]">
            <Icon className="size-4" />
          </span>
        )}
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="flex items-baseline gap-1.5">
          <span className="text-[27px] font-semibold leading-none tracking-tight text-ink">{value}</span>
          {unit && <span className="text-[12.5px] text-ink-muted">{unit}</span>}
        </p>
        {trend && trend.length > 1 && <Sparkline values={trend} color={trendColor} />}
      </div>

      {delta && (
        <p className="mt-3 flex items-center gap-1.5 text-[12px]">
          <span
            className={clsx(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium tnum",
              delta.direction === "flat"
                ? "bg-[var(--surface-sunken)] text-ink-muted"
                : delta.good
                  ? "bg-[var(--good-soft)] text-[var(--good-text)]"
                  : "bg-[var(--critical-soft)] text-[var(--critical-text)]",
            )}
          >
            <DeltaIcon className="size-3 rtl:-scale-x-100" />
            {formatDecimal(Math.abs(delta.delta_pct), locale, 1)}٪
          </span>
          <span className="text-ink-muted">{t.common.vsYesterday}</span>
        </p>
      )}
    </div>
  );
}
