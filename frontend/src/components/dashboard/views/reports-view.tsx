"use client";

import { BarChart3, Download, Droplets, Route, Table2, Trophy } from "lucide-react";
import { useMemo, useState } from "react";

import { LineChart } from "@/components/charts/line-chart";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { PageBody, PageHeader } from "@/components/dashboard/page-header";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Chip } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatDateShort, formatDecimal, formatNumber } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import { useLocale } from "@/lib/locale-context";

interface DailyRow {
  id: string;
  label: string;
  distance: number;
  fuel: number;
  trips: number;
  idle: number;
  score: number;
}

export function ReportsView() {
  const { t, locale } = useLocale();
  const [days, setDays] = useState(14);
  const [view, setView] = useState<"chart" | "table">("chart");
  const { data, loading } = useApi(() => api.timeseries(days), [days]);

  const points = data?.points ?? [];

  const rows = useMemo<DailyRow[]>(
    () =>
      points.map((point) => ({
        id: point.label,
        label: locale === "fa" ? point.label_fa : formatDateShort(point.label, locale),
        distance: point.values.distance_km ?? 0,
        fuel: point.values.fuel_l ?? 0,
        trips: point.values.trips ?? 0,
        idle: point.values.idle_hours ?? 0,
        score: point.values.score ?? 0,
      })),
    [points, locale],
  );

  const totals = useMemo(() => {
    const distance = rows.reduce((sum, row) => sum + row.distance, 0);
    const fuel = rows.reduce((sum, row) => sum + row.fuel, 0);
    const trips = rows.reduce((sum, row) => sum + row.trips, 0);
    const scored = rows.filter((row) => row.score > 0);
    const score = scored.reduce((sum, row) => sum + row.score, 0) / Math.max(scored.length, 1);
    return { distance, fuel, trips, score };
  }, [rows]);

  const exportCsv = () => {
    const header = ["date", "distance_km", "fuel_l", "trips", "idle_hours", "avg_score"];
    const body = points.map((point) =>
      [
        point.label,
        point.values.distance_km ?? 0,
        point.values.fuel_l ?? 0,
        point.values.trips ?? 0,
        point.values.idle_hours ?? 0,
        point.values.score ?? 0,
      ].join(","),
    );
    const blob = new Blob([[header.join(","), ...body].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `zubie-fleet-report-${days}d.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const columns: Column<DailyRow>[] = [
    { key: "date", header: t.reports.date, cell: (row) => row.label },
    {
      key: "distance",
      header: `${t.reports.totalDistance} (${t.common.km})`,
      numeric: true,
      cell: (row) => formatDecimal(row.distance, locale, 1),
    },
    {
      key: "fuel",
      header: `${t.reports.totalFuel} (${t.common.litre})`,
      numeric: true,
      cell: (row) => formatDecimal(row.fuel, locale, 1),
    },
    {
      key: "trips",
      header: t.reports.totalTrips,
      numeric: true,
      hideBelow: "sm",
      cell: (row) => formatNumber(row.trips, locale),
    },
    {
      key: "idle",
      header: `${t.dash.kpi.idleToday} (${t.common.hour})`,
      numeric: true,
      hideBelow: "md",
      cell: (row) => formatDecimal(row.idle, locale, 2),
    },
    {
      key: "score",
      header: t.reports.avgTripScore,
      numeric: true,
      hideBelow: "sm",
      cell: (row) => formatDecimal(row.score, locale, 1),
    },
  ];

  const axis = (key: keyof DailyRow) =>
    rows.map((row) => ({ label: row.label, value: Number(row[key]) }));

  return (
    <PageBody>
      <PageHeader
        title={t.reports.title}
        lead={t.reports.lead}
        actions={
          <Button size="sm" variant="secondary" onClick={exportCsv}>
            <Download className="size-4" />
            {t.reports.exportCsv}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          {[7, 14, 30].map((value) => (
            <Chip key={value} active={days === value} onClick={() => setDays(value)}>
              {value === 7 ? t.reports.range7 : value === 14 ? t.reports.range14 : t.reports.range30}
            </Chip>
          ))}
        </div>
        <div className="ms-auto flex items-center gap-1.5">
          <Chip active={view === "chart"} onClick={() => setView("chart")}>
            <span className="flex items-center gap-1.5">
              <BarChart3 className="size-3.5" />
              {t.dash.charts.chartView}
            </span>
          </Chip>
          <Chip active={view === "table"} onClick={() => setView("table")}>
            <span className="flex items-center gap-1.5">
              <Table2 className="size-3.5" />
              {t.dash.charts.tableView}
            </span>
          </Chip>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label={t.reports.totalDistance}
          value={formatNumber(totals.distance, locale)}
          unit={t.common.km}
          icon={Route}
          accent="var(--series-1)"
        />
        <StatTile
          label={t.reports.totalFuel}
          value={formatNumber(totals.fuel, locale)}
          unit={t.common.litre}
          icon={Droplets}
          accent="var(--series-2)"
        />
        <StatTile
          label={t.reports.totalTrips}
          value={formatNumber(totals.trips, locale)}
          icon={BarChart3}
          accent="var(--series-3)"
        />
        <StatTile
          label={t.reports.avgTripScore}
          value={formatDecimal(totals.score, locale, 1)}
          icon={Trophy}
          accent="var(--series-4)"
        />
      </div>

      {view === "chart" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title={t.dash.charts.activityTitle} lead={t.dash.charts.activityLead} />
            <div className="mt-4">
              {loading ? <Skeleton className="h-[220px]" /> : <LineChart points={axis("distance")} unit={t.common.km} />}
            </div>
          </Card>
          <Card>
            <CardHeader title={t.dash.charts.fuelTitle} lead={t.dash.charts.fuelLead} />
            <div className="mt-4">
              {loading ? (
                <Skeleton className="h-[220px]" />
              ) : (
                <LineChart points={axis("fuel")} color="var(--series-2)" unit={t.common.litre} />
              )}
            </div>
          </Card>
          <Card>
            <CardHeader title={t.dash.charts.idleTitle} lead={t.dash.charts.idleLead} />
            <div className="mt-4">
              {loading ? (
                <Skeleton className="h-[220px]" />
              ) : (
                <LineChart
                  points={axis("idle")}
                  color="var(--series-4)"
                  fractionDigits={1}
                  unit={t.common.hour}
                />
              )}
            </div>
          </Card>
          <Card>
            <CardHeader title={t.reports.avgTripScore} lead={t.dash.leaderboardLead} />
            <div className="mt-4">
              {loading ? (
                <Skeleton className="h-[220px]" />
              ) : (
                <LineChart points={axis("score")} color="var(--series-3)" fractionDigits={1} />
              )}
            </div>
          </Card>
        </div>
      ) : (
        <Card padded={false}>
          <div className="p-5">
            <CardHeader title={t.reports.breakdown} />
          </div>
          {loading ? (
            <Skeleton className="m-4 h-64" />
          ) : (
            <div className="border-t border-[var(--line)]">
              <DataTable columns={columns} rows={rows} />
            </div>
          )}
        </Card>
      )}
    </PageBody>
  );
}
