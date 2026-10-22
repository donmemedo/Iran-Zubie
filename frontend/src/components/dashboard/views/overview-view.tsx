"use client";

import {
  BellRing,
  Car,
  Droplets,
  Gauge,
  HeartPulse,
  PiggyBank,
  Route,
  Timer,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { BarChart } from "@/components/charts/bar-chart";
import { HBarChart } from "@/components/charts/hbar-chart";
import { LineChart } from "@/components/charts/line-chart";
import { PageBody, PageHeader } from "@/components/dashboard/page-header";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyFleet } from "@/components/dashboard/views/shared";
import { EmptyState, ErrorState } from "@/components/ui/empty";
import { SeverityPill } from "@/components/ui/pill";
import { SkeletonCard, Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { clsx, formatDateShort, formatDecimal, formatNumber, formatRelative, formatToman, pick } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import { useLocale } from "@/lib/locale-context";
import type { Badge } from "@/lib/types";

const BADGE_COLOR: Record<Badge, string> = {
  gold: "var(--series-4)",
  silver: "var(--ink-muted)",
  bronze: "var(--series-2)",
  risk: "var(--critical)",
};

export function OverviewView() {
  const { t, locale, href } = useLocale();

  const overview = useApi(() => api.overview(), []);
  const series = useApi(() => api.timeseries(14), []);
  const bands = useApi(() => api.scoreDistribution(), []);
  const mix = useApi(() => api.alertMix(), []);
  const drivers = useApi(() => api.drivers(), []);
  const alerts = useApi(() => api.alerts({ onlyOpen: true, limit: 6 }), []);

  const points = series.data?.points ?? [];
  const axis = (key: string) =>
    points.map((point) => ({
      label: locale === "fa" ? point.label_fa : formatDateShort(point.label, locale),
      value: point.values[key] ?? 0,
    }));

  const distanceTrend = useMemo(() => points.map((point) => point.values.distance_km ?? 0), [points]);
  const fuelTrend = useMemo(() => points.map((point) => point.values.fuel_l ?? 0), [points]);
  const idleTrend = useMemo(() => points.map((point) => point.values.idle_hours ?? 0), [points]);

  /* The plot area is LTR, so an *ordinal* category axis is reversed in RTL to
     put the first band at the reading start. Time axes stay left-to-right. */
  const scoreBands = useMemo(() => {
    const mapped = (bands.data ?? []).map((band) => ({
      label: locale === "fa" ? band.band_fa : t.drivers.badge[band.band],
      value: band.count,
      color: BADGE_COLOR[band.band],
    }));
    return locale === "fa" ? mapped.reverse() : mapped;
  }, [bands.data, locale, t]);

  const data = overview.data;
  const statusStrip = data
    ? [
        { key: "moving" as const, value: data.moving, color: "var(--good)" },
        { key: "idle" as const, value: data.idle, color: "var(--warning)" },
        { key: "parked" as const, value: data.parked, color: "var(--ink-muted)" },
        { key: "service" as const, value: data.in_service, color: "var(--serious)" },
        { key: "offline" as const, value: data.offline, color: "var(--axis)" },
      ]
    : [];

  return (
    <PageBody>
      <PageHeader title={t.dash.overview} lead={t.dash.statusTitle} />

      {!overview.data && overview.error && <ErrorState compact onRetry={overview.reload} />}
      {overview.data?.total_vehicles === 0 && <EmptyFleet />}

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {overview.loading && [0, 1, 2, 3].map((index) => <SkeletonCard key={index} />)}
        {data && (
          <>
            <StatTile
              label={t.dash.kpi.distanceToday}
              value={formatNumber(data.distance_today_km.value, locale)}
              unit={t.common.km}
              delta={data.distance_today_km}
              icon={Route}
              trend={distanceTrend}
              trendColor="var(--series-1)"
              accent="var(--series-1)"
            />
            <StatTile
              label={t.dash.kpi.fuelToday}
              value={formatNumber(data.fuel_today_l.value, locale)}
              unit={t.common.litre}
              delta={data.fuel_today_l}
              icon={Droplets}
              trend={fuelTrend}
              trendColor="var(--series-2)"
              accent="var(--series-2)"
            />
            <StatTile
              label={t.dash.kpi.avgScore}
              value={formatDecimal(data.avg_driver_score.value, locale, 1)}
              delta={data.avg_driver_score}
              icon={Trophy}
              accent="var(--series-3)"
            />
            <StatTile
              label={t.dash.kpi.fleetHealth}
              value={formatDecimal(data.fleet_health.value, locale, 1)}
              delta={data.fleet_health}
              icon={HeartPulse}
              accent="var(--series-7)"
            />
          </>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data && (
          <>
            <StatTile
              label={t.dash.kpi.utilization}
              value={formatDecimal(data.utilization_pct.value, locale, 0)}
              unit="٪"
              delta={data.utilization_pct}
              icon={Gauge}
            />
            <StatTile
              label={t.dash.kpi.idleToday}
              value={formatDecimal(data.idle_hours_today.value, locale, 1)}
              unit={t.common.hour}
              delta={data.idle_hours_today}
              icon={Timer}
              trend={idleTrend}
              trendColor="var(--series-4)"
            />
            <StatTile
              label={t.dash.kpi.openAlerts}
              value={formatNumber(data.open_alerts, locale)}
              icon={BellRing}
            />
            <StatTile
              label={t.dash.kpi.costSaved}
              value={formatToman(data.cost_saved_toman, locale)}
              unit={t.common.toman}
              icon={PiggyBank}
            />
          </>
        )}
      </div>

      {/* fleet status strip */}
      <Card>
        <CardHeader
          title={t.dash.statusTitle}
          action={
            <Link
              href={href("/app/map")}
              className="text-[12.5px] font-medium text-[var(--brand)] hover:underline"
            >
              {t.dash.liveMap}
            </Link>
          }
        />
        {data ? (
          <>
            <div className="mt-5 flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full">
              {statusStrip.map((item) => (
                <span
                  key={item.key}
                  className="h-full first:rounded-s-full last:rounded-e-full"
                  style={{
                    width: `${Math.max((item.value / Math.max(data.total_vehicles, 1)) * 100, item.value ? 3 : 0)}%`,
                    background: item.color,
                  }}
                />
              ))}
            </div>
            <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
              {statusStrip.map((item) => (
                <li key={item.key} className="flex items-center gap-2.5">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: item.color }} />
                  <span className="flex-1 truncate text-[12.5px] text-ink-secondary">
                    {t.dash.status[item.key]}
                  </span>
                  <span className="tnum text-[14px] font-semibold text-ink">
                    {formatNumber(item.value, locale)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <Skeleton className="mt-5 h-24" />
        )}
      </Card>

      {/* charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={t.dash.charts.activityTitle} lead={t.dash.charts.activityLead} />
          <div className="mt-4">
            {series.loading ? (
              <Skeleton className="h-[220px]" />
            ) : (
              <LineChart
                points={axis("distance_km")}
                unit={t.common.km}
                ariaLabel={t.dash.charts.activityTitle}
              />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title={t.dash.charts.scoreTitle} lead={t.dash.charts.scoreLead} />
          <div className="mt-4">
            {bands.loading ? (
              <Skeleton className="h-[200px]" />
            ) : (
              <BarChart
                data={scoreBands}
                unit={t.common.drivers}
                ariaLabel={t.dash.charts.scoreTitle}
              />
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title={t.dash.charts.fuelTitle} lead={t.dash.charts.fuelLead} />
          <div className="mt-4">
            {series.loading ? (
              <Skeleton className="h-[180px]" />
            ) : (
              <LineChart
                points={axis("fuel_l")}
                color="var(--series-2)"
                height={180}
                unit={t.common.litre}
                ariaLabel={t.dash.charts.fuelTitle}
              />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title={t.dash.charts.idleTitle} lead={t.dash.charts.idleLead} />
          <div className="mt-4">
            {series.loading ? (
              <Skeleton className="h-[180px]" />
            ) : (
              <LineChart
                points={axis("idle_hours")}
                color="var(--series-4)"
                height={180}
                fractionDigits={1}
                unit={t.common.hour}
                ariaLabel={t.dash.charts.idleTitle}
              />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title={t.dash.charts.alertMixTitle} lead={t.dash.charts.alertMixLead} />
          <div className="mt-5">
            {mix.loading ? (
              <Skeleton className="h-[180px]" />
            ) : (
              <HBarChart
                data={(mix.data ?? []).slice(0, 6).map((item) => ({
                  label: t.alerts.kindLabel[item.kind],
                  value: item.count,
                  color: `var(--${item.severity === "good" ? "good" : item.severity})`,
                }))}
              />
            )}
          </div>
        </Card>
      </div>

      {/* leaderboard + alerts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card padded={false}>
          <div className="p-5">
            <CardHeader
              title={t.dash.leaderboard}
              lead={t.dash.leaderboardLead}
              action={
                <Link
                  href={href("/app/drivers")}
                  className="text-[12.5px] font-medium text-[var(--brand)] hover:underline"
                >
                  {t.common.seeAll}
                </Link>
              }
            />
          </div>
          <ul className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
            {(drivers.data ?? []).slice(0, 6).map((driver, index) => (
              <li key={driver.id} className="flex items-center gap-3 px-5 py-3">
                <span
                  className={clsx(
                    "tnum flex size-7 shrink-0 items-center justify-center rounded-lg text-[12px] font-semibold",
                    index === 0
                      ? "bg-[var(--series-4)] text-white"
                      : "bg-[var(--surface-sunken)] text-ink-secondary",
                  )}
                >
                  {formatNumber(index + 1, locale)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-ink">
                    {pick(driver, "full_name", locale)}
                  </p>
                  <p className="truncate text-[11.5px] text-ink-muted">
                    {formatNumber(driver.trips_count, locale)} {t.drivers.trips} ·{" "}
                    {formatNumber(driver.distance_km, locale)} {t.common.km}
                  </p>
                </div>
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{ background: `${BADGE_COLOR[driver.badge]}22`, color: BADGE_COLOR[driver.badge] }}
                >
                  {t.drivers.badge[driver.badge]}
                </span>
                <span className="tnum w-10 text-end text-[15px] font-semibold text-ink">
                  {formatDecimal(driver.score, locale, 0)}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card padded={false}>
          <div className="p-5">
            <CardHeader
              title={t.dash.recentAlerts}
              action={
                <Link
                  href={href("/app/alerts")}
                  className="text-[12.5px] font-medium text-[var(--brand)] hover:underline"
                >
                  {t.common.seeAll}
                </Link>
              }
            />
          </div>
          {(alerts.data ?? []).length === 0 && !alerts.loading ? (
            <EmptyState icon={<BellRing className="size-5" />} title={t.alerts.empty} />
          ) : (
            <ul className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
              {(alerts.data ?? []).map((alert) => (
                <li key={alert.id} className="flex items-start gap-3 px-5 py-3.5">
                  <Car className="mt-0.5 size-4 shrink-0 text-ink-muted" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-ink">
                      {pick(alert, "title", locale)}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-ink-muted">
                      {pick(alert, "message", locale)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <SeverityPill
                      severity={alert.severity}
                      label={t.alerts.severityLabel[alert.severity]}
                    />
                    <span className="text-[11px] text-ink-muted">
                      {formatRelative(alert.occurred_at, locale)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </PageBody>
  );
}
