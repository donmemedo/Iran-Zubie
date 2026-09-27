"use client";

import { useMemo, useState } from "react";

import { useSize } from "@/components/charts/use-size";
import { formatNumber } from "@/lib/format";
import { useLocale } from "@/lib/locale-context";

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

/**
 * Vertical bars with 4px rounded data-ends anchored to the baseline and a 2px
 * surface gap between neighbours, per the data-viz mark spec.
 */
export function BarChart({
  data,
  height = 200,
  unit,
  ariaLabel,
}: {
  data: BarDatum[];
  height?: number;
  unit?: string;
  ariaLabel?: string;
}) {
  const { locale } = useLocale();
  const { ref, width } = useSize<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const padding = { top: 18, right: 8, bottom: 30, left: 34 };
  const plotWidth = Math.max(width - padding.left - padding.right, 10);
  const plotHeight = height - padding.top - padding.bottom;

  const { max, bandWidth, barWidth } = useMemo(() => {
    const rawMax = Math.max(...data.map((item) => item.value), 1);
    const band = plotWidth / Math.max(data.length, 1);
    return {
      max: rawMax,
      bandWidth: band,
      barWidth: Math.max(Math.min(band - 10, 46), 6),
    };
  }, [data, plotWidth]);

  return (
    <div ref={ref} className="relative w-full" style={{ height, direction: "ltr" }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel}>
          <g transform={`translate(${padding.left},${padding.top})`}>
            {[0, max / 2, max].map((tick) => {
              const y = plotHeight - (tick / max) * plotHeight;
              return (
                <g key={tick}>
                  <line
                    x1={0}
                    x2={plotWidth}
                    y1={y}
                    y2={y}
                    stroke={tick === 0 ? "var(--axis)" : "var(--grid)"}
                    strokeWidth={1}
                    strokeDasharray={tick === 0 ? undefined : "3 4"}
                  />
                  <text
                    x={-8}
                    y={y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fontSize={10}
                    className="tnum"
                    fill="var(--ink-muted)"
                  >
                    {formatNumber(tick, locale)}
                  </text>
                </g>
              );
            })}

            {data.map((item, index) => {
              const barHeight = Math.max((item.value / max) * plotHeight, item.value > 0 ? 3 : 0);
              const x = index * bandWidth + (bandWidth - barWidth) / 2;
              const y = plotHeight - barHeight;
              return (
                <g
                  key={item.label}
                  onMouseEnter={() => setHover(index)}
                  onMouseLeave={() => setHover(null)}
                >
                  {/* generous hit target, independent of the drawn mark */}
                  <rect
                    x={index * bandWidth}
                    y={0}
                    width={bandWidth}
                    height={plotHeight}
                    fill="transparent"
                  />
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx={4}
                    fill={item.color ?? "var(--series-1)"}
                    opacity={hover === null || hover === index ? 1 : 0.45}
                    style={{ transition: "opacity 150ms ease" }}
                  />
                  <text
                    x={index * bandWidth + bandWidth / 2}
                    y={y - 7}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={600}
                    className="tnum"
                    fill="var(--ink)"
                  >
                    {formatNumber(item.value, locale)}
                  </text>
                  <text
                    x={index * bandWidth + bandWidth / 2}
                    y={plotHeight + 18}
                    textAnchor="middle"
                    fontSize={10}
                    fill="var(--ink-muted)"
                  >
                    {item.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      )}
      {hover !== null && unit && data[hover] && (
        <p className="absolute bottom-0 start-0 text-[11px] text-ink-muted">
          {data[hover].label}: {formatNumber(data[hover].value, locale)} {unit}
        </p>
      )}
    </div>
  );
}
