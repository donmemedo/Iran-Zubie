"use client";

import { Gauge, Timer, TrendingDown, Trophy, Zap } from "lucide-react";

import { useMemo } from "react";

import { BarChart } from "@/components/charts/bar-chart";
import { PageBody, PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { clsx, formatDecimal, formatNumber, pick } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import { useLocale } from "@/lib/locale-context";
import type { Badge } from "@/lib/types";

const BADGE_COLOR: Record<Badge, string> = {
  gold: "var(--series-4)",
  silver: "var(--ink-muted)",
  bronze: "var(--series-2)",
  risk: "var(--critical)",
};

export function DriversView() {
  const { t, locale } = useLocale();
  const { data: drivers, loading } = useApi(() => api.drivers(), []);
  const { data: bands } = useApi(() => api.scoreDistribution(), []);

  /* Ordinal bands read from the start of the line: right in RTL, left in LTR. */
  const scoreBands = useMemo(() => {
    const mapped = (bands ?? []).map((band) => ({
      label: locale === "fa" ? band.band_fa : t.drivers.badge[band.band],
      value: band.count,
      color: BADGE_COLOR[band.band],
    }));
    return locale === "fa" ? mapped.reverse() : mapped;
  }, [bands, locale, t]);

  const events = [
    { key: "harsh_brake_count" as const, label: t.drivers.harshBrake, icon: TrendingDown },
    { key: "harsh_accel_count" as const, label: t.drivers.harshAccel, icon: Zap },
    { key: "speeding_count" as const, label: t.drivers.speeding, icon: Gauge },
  ];

  return (
    <PageBody>
      <PageHeader title={t.drivers.title} lead={t.drivers.lead} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={t.dash.charts.scoreTitle} lead={t.dash.charts.scoreLead} />
          <div className="mt-4">
            {bands ? (
              <BarChart
                data={scoreBands}
                height={220}
                unit={t.common.drivers}
                ariaLabel={t.dash.charts.scoreTitle}
              />
            ) : (
              <Skeleton className="h-[220px]" />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title={t.dash.leaderboard} lead={t.dash.leaderboardLead} />
          <ul className="mt-5 space-y-3">
            {(drivers ?? []).slice(0, 3).map((driver, index) => (
              <li
                key={driver.id}
                className="flex items-center gap-3 rounded-xl border border-[var(--line)] p-3"
              >
                <Trophy
                  className="size-5 shrink-0"
                  style={{ color: BADGE_COLOR[driver.badge] }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-ink">
                    {pick(driver, "full_name", locale)}
                  </p>
                  <p className="text-[11.5px] text-ink-muted">
                    {t.drivers.rank} {formatNumber(index + 1, locale)} ·{" "}
                    {t.drivers.badge[driver.badge]}
                  </p>
                </div>
                <span className="tnum text-[19px] font-semibold text-ink">
                  {formatDecimal(driver.score, locale, 0)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading && [0, 1, 2, 3, 4, 5].map((index) => <Skeleton key={index} className="h-[196px]" />)}
        {(drivers ?? []).map((driver, index) => (
          <Card key={driver.id} className="transition-shadow hover:shadow-[var(--shadow-float)]">
            <div className="flex items-start gap-3">
              <span
                className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-[15px] font-semibold"
                style={{ background: `${BADGE_COLOR[driver.badge]}1f`, color: BADGE_COLOR[driver.badge] }}
              >
                {formatNumber(index + 1, locale)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-semibold text-ink">
                  {pick(driver, "full_name", locale)}
                </p>
                <p className="tnum truncate text-[11.5px] text-ink-muted" style={{ direction: "ltr" }}>
                  {driver.license_no}
                </p>
              </div>
              <div className="text-end">
                <p className="tnum text-[22px] font-semibold leading-none text-ink">
                  {formatDecimal(driver.score, locale, 0)}
                </p>
                <p
                  className="mt-1 text-[11px] font-medium"
                  style={{ color: BADGE_COLOR[driver.badge] }}
                >
                  {t.drivers.badge[driver.badge]}
                </p>
              </div>
            </div>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{ width: `${driver.score}%`, background: BADGE_COLOR[driver.badge] }}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-[var(--line)] pt-4">
              <Stat label={t.drivers.trips} value={formatNumber(driver.trips_count, locale)} />
              <Stat
                label={t.drivers.distance}
                value={`${formatNumber(driver.distance_km, locale)} ${t.common.km}`}
              />
              {events.map((event) => (
                <Stat
                  key={event.key}
                  label={event.label}
                  value={formatNumber(driver[event.key], locale)}
                  warn={driver[event.key] > 8}
                />
              ))}
              <Stat
                label={t.drivers.idleTime}
                value={`${formatNumber(Math.round(driver.idle_minutes / 60), locale)} ${t.common.hour}`}
              />
            </div>
          </Card>
        ))}
      </div>
    </PageBody>
  );
}

function Stat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="truncate text-[11.5px] text-ink-muted">{label}</span>
      <span
        className={clsx("tnum shrink-0 text-[12.5px] font-medium", warn ? "text-[var(--critical-text)]" : "text-ink")}
      >
        {value}
      </span>
    </div>
  );
}
