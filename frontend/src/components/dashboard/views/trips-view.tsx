"use client";

import { Route } from "lucide-react";
import { useState } from "react";

import { DataTable, type Column } from "@/components/dashboard/data-table";
import { PageBody, PageHeader } from "@/components/dashboard/page-header";
import { MapPanel } from "@/components/map/map-panel";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { clsx, formatDate, formatDecimal, formatNumber, formatTime, pick } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import { useLocale } from "@/lib/locale-context";
import type { Trip } from "@/lib/types";

export function TripsView() {
  const { t, locale } = useLocale();
  const { data: trips, loading } = useApi(() => api.trips(60), []);
  const [selected, setSelected] = useState<Trip | null>(null);

  const columns: Column<Trip>[] = [
    {
      key: "route",
      header: t.dash.trips,
      cell: (trip) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">
            {pick(trip, "start_label", locale)} ← {pick(trip, "end_label", locale)}
          </p>
          <p className="text-[11.5px] text-ink-muted">
            {formatDate(trip.started_at, locale)} · {formatTime(trip.started_at, locale)}–
            {formatTime(trip.ended_at, locale)}
          </p>
        </div>
      ),
    },
    {
      key: "distance",
      header: t.reports.totalDistance,
      numeric: true,
      cell: (trip) => `${formatDecimal(trip.distance_km, locale, 1)}`,
    },
    {
      key: "duration",
      header: t.common.minute,
      numeric: true,
      hideBelow: "sm",
      cell: (trip) => formatNumber(trip.duration_min, locale),
    },
    {
      key: "avg",
      header: t.vehicles.speed,
      numeric: true,
      hideBelow: "md",
      cell: (trip) => formatDecimal(trip.avg_speed, locale, 0),
    },
    {
      key: "fuel",
      header: t.common.litre,
      numeric: true,
      hideBelow: "lg",
      cell: (trip) => formatDecimal(trip.fuel_used_l, locale, 1),
    },
    {
      key: "score",
      header: t.drivers.score,
      numeric: true,
      cell: (trip) => (
        <span
          className={clsx(
            "tnum rounded-lg px-2 py-1 text-[12px] font-semibold",
            trip.score >= 85
              ? "bg-[var(--good-soft)] text-[var(--good-text)]"
              : trip.score >= 70
                ? "bg-[var(--warning-soft)] text-ink"
                : "bg-[var(--critical-soft)] text-[var(--critical-text)]",
          )}
        >
          {formatDecimal(trip.score, locale, 0)}
        </span>
      ),
    },
  ];

  return (
    <PageBody>
      <PageHeader title={t.dash.trips} lead={t.dash.recentTrips} />

      {selected && (
        <Card padded={false} className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-5">
            <CardHeader
              title={`${pick(selected, "start_label", locale)} ← ${pick(selected, "end_label", locale)}`}
              lead={`${formatDate(selected.started_at, locale)} · ${formatDecimal(selected.distance_km, locale, 1)} ${t.common.km}`}
            />
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-[12.5px] text-ink-muted hover:text-ink"
            >
              {t.common.close}
            </button>
          </div>
          <div className="h-[320px] border-t border-[var(--line)]">
            <MapPanel
              vehicles={[]}
              trail={selected.path as [number, number][]}
              fitToVehicles={false}
              center={selected.path[0] ?? [35.6892, 51.389]}
              zoom={12}
            />
          </div>
        </Card>
      )}

      <Card padded={false}>
        {loading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3, 4].map((index) => (
              <Skeleton key={index} className="h-14" />
            ))}
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={trips ?? []}
            onRowClick={setSelected}
            empty={<EmptyState icon={<Route className="size-5" />} title={t.common.none} />}
          />
        )}
      </Card>
    </PageBody>
  );
}
