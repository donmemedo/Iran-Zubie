"use client";

import { useMemo, useState } from "react";

import { useSize } from "@/components/charts/use-size";
import { formatDecimal, formatNumber } from "@/lib/format";
import { useLocale } from "@/lib/locale-context";

export interface LinePoint {
  label: string;
  value: number;
}

/**
 * Single-series line + area with a crosshair tooltip.
 *
 * The plot area is always LTR: Iranian dashboards conventionally keep a time
 * axis running left-to-right even in a right-to-left page, and flipping it
 * confuses the read. Labels and numbers are still localised.
 */
export function LineChart({
  points,
  color = "var(--series-1)",
  height = 220,
  unit,
  fractionDigits = 0,
  ariaLabel,
}: {
  points: LinePoint[];
  color?: string;
  height?: number;
  unit?: string;
  fractionDigits?: number;
  ariaLabel?: string;
}) {
  const { locale } = useLocale();
  const { ref, width } = useSize<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const padding = { top: 16, right: 12, bottom: 26, left: 44 };
  const plotWidth = Math.max(width - padding.left - padding.right, 10);
  const plotHeight = height - padding.top - padding.bottom;

  const { max, ticks, coords, areaPath, linePath } = useMemo(() => {
    const values = points.map((point) => point.value);
    const rawMax = Math.max(...values, 1);
    // Round the top of the scale up to a readable step.
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
    const niceMax = Math.ceil(rawMax / (magnitude / 2)) * (magnitude / 2);
    const tickValues = [0, niceMax / 2, niceMax];

    const x = (index: number) =>
      points.length <= 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth;
    const y = (value: number) => plotHeight - (value / niceMax) * plotHeight;

    const pointCoords = points.map((point, index) => ({ x: x(index), y: y(point.value) }));
    const line = pointCoords
      .map((coord, index) => `${index === 0 ? "M" : "L"}${coord.x.toFixed(1)},${coord.y.toFixed(1)}`)
      .join(" ");
    const area =
      pointCoords.length > 0
        ? `${line} L${pointCoords[pointCoords.length - 1].x.toFixed(1)},${plotHeight} L${pointCoords[0].x.toFixed(1)},${plotHeight} Z`
        : "";

    return { max: niceMax, ticks: tickValues, coords: pointCoords, areaPath: area, linePath: line };
  }, [points, plotWidth, plotHeight]);

  const gradientId = useMemo(() => `line-fill-${Math.random().toString(36).slice(2, 9)}`, []);
  const format = (value: number) =>
    fractionDigits > 0 ? formatDecimal(value, locale, fractionDigits) : formatNumber(value, locale);

  // Keep the axis readable on narrow screens by thinning the labels.
  const labelStep = Math.max(1, Math.ceil(points.length / (plotWidth < 360 ? 4 : 7)));

  return (
    <div ref={ref} className="relative w-full" style={{ height, direction: "ltr" }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={ariaLabel}
          onMouseLeave={() => setHover(null)}
          onMouseMove={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect();
            const relative = event.clientX - bounds.left - padding.left;
            const index = Math.round((relative / plotWidth) * (points.length - 1));
            setHover(Math.min(Math.max(index, 0), points.length - 1));
          }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.26" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          <g transform={`translate(${padding.left},${padding.top})`}>
            {ticks.map((tick) => {
              const y = plotHeight - (tick / max) * plotHeight;
              return (
                <g key={tick}>
                  <line
                    x1={0}
                    x2={plotWidth}
                    y1={y}
                    y2={y}
                    stroke="var(--grid)"
                    strokeWidth={1}
                    strokeDasharray={tick === 0 ? undefined : "3 4"}
                  />
                  <text
                    x={-10}
                    y={y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fontSize={10}
                    className="tnum"
                    fill="var(--ink-muted)"
                  >
                    {format(tick)}
                  </text>
                </g>
              );
            })}

            {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {hover !== null && coords[hover] && (
              <g>
                <line
                  x1={coords[hover].x}
                  x2={coords[hover].x}
                  y1={0}
                  y2={plotHeight}
                  stroke="var(--axis)"
                  strokeWidth={1}
                />
                <circle
                  cx={coords[hover].x}
                  cy={coords[hover].y}
                  r={5}
                  fill={color}
                  stroke="var(--surface)"
                  strokeWidth={2}
                />
              </g>
            )}

            {points.map((point, index) =>
              index % labelStep === 0 ? (
                <text
                  key={point.label}
                  x={coords[index]?.x ?? 0}
                  y={plotHeight + 17}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--ink-muted)"
                >
                  {point.label}
                </text>
              ) : null,
            )}
          </g>
        </svg>
      )}

      {hover !== null && points[hover] && coords[hover] && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] px-3 py-2 shadow-[var(--shadow-pop)]"
          style={{
            left: Math.min(Math.max(coords[hover].x + padding.left, 56), width - 56),
            top: Math.max(coords[hover].y + padding.top - 56, 0),
          }}
        >
          <p className="text-[11px] text-ink-muted">{points[hover].label}</p>
          <p className="tnum text-[13px] font-semibold text-ink">
            {format(points[hover].value)}
            {unit && <span className="ms-1 text-[11px] font-normal text-ink-secondary">{unit}</span>}
          </p>
        </div>
      )}
    </div>
  );
}
