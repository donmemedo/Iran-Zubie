"use client";

import { Car, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { DataTable, type Column } from "@/components/dashboard/data-table";
import { PageBody, PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { Chip, StatusPill } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { clsx, formatDecimal, formatNumber, formatRelative, pick } from "@/lib/format";
import { useApi, useTelemetry } from "@/lib/hooks";
import { useLocale } from "@/lib/locale-context";
import type { Vehicle, VehicleStatus } from "@/lib/types";

const FILTERS: (VehicleStatus | "all")[] = ["all", "moving", "idle", "parked", "service", "offline"];

/** A 0-100 health score with its band named, so colour is never the only cue. */
function HealthBar({ value }: { value: number }) {
  const { locale, t } = useLocale();
  const tone = value >= 82 ? "good" : value >= 65 ? "warning" : "critical";
  const label = value >= 82 ? t.vehicles.healthGood : value >= 65 ? t.vehicles.healthWatch : t.vehicles.healthPoor;

  return (
    <div className="flex items-center justify-end gap-2.5" title={label}>
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
        <div
          className="h-full rounded-full"
          style={{ width: `${value}%`, background: `var(--${tone})` }}
        />
      </div>
      <span className="tnum w-8 text-end text-[13px] font-medium text-ink">
        {formatDecimal(value, locale, 0)}
      </span>
    </div>
  );
}

export function VehiclesView() {
  const { t, locale, href } = useLocale();
  const router = useRouter();
  const { data, loading } = useApi(() => api.vehicles(), []);
  const { vehicles: live } = useTelemetry(true);

  const [filter, setFilter] = useState<VehicleStatus | "all">("all");
  const [query, setQuery] = useState("");

  const rows = useMemo<Vehicle[]>(() => {
    const merged = (data ?? []).map((vehicle) => {
      const frame = live[vehicle.id];
      return frame ? { ...vehicle, ...frame, last_seen: frame.last_seen ?? vehicle.last_seen } : vehicle;
    });
    const needle = query.trim().toLowerCase();
    return merged.filter((vehicle) => {
      if (filter !== "all" && vehicle.status !== filter) return false;
      if (!needle) return true;
      return (
        pick(vehicle, "name", locale).toLowerCase().includes(needle) ||
        vehicle.plate.includes(needle) ||
        vehicle.plate_en.toLowerCase().includes(needle) ||
        (vehicle.driver ? pick(vehicle.driver, "full_name", locale).toLowerCase().includes(needle) : false)
      );
    });
  }, [data, live, filter, query, locale]);

  const columns: Column<Vehicle>[] = [
    {
      key: "name",
      header: t.vehicles.name,
      cell: (vehicle) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-sunken)] text-ink-muted">
            <Car className="size-[18px]" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{pick(vehicle, "name", locale)}</p>
            <p className="truncate text-[11.5px] text-ink-muted">{vehicle.plate}</p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: t.vehicles.status,
      cell: (vehicle) => (
        <StatusPill status={vehicle.status} label={t.dash.status[vehicle.status]} pulse />
      ),
    },
    {
      key: "driver",
      header: t.vehicles.driver,
      hideBelow: "md",
      cell: (vehicle) => (
        <span className="text-ink-secondary">
          {vehicle.driver ? pick(vehicle.driver, "full_name", locale) : "—"}
        </span>
      ),
    },
    {
      key: "speed",
      header: t.vehicles.speed,
      numeric: true,
      hideBelow: "sm",
      cell: (vehicle) => formatDecimal(vehicle.speed_kmh, locale, 0),
    },
    {
      key: "fuel",
      header: t.vehicles.fuel,
      numeric: true,
      hideBelow: "lg",
      cell: (vehicle) => (
        <span className={clsx(vehicle.fuel_percent < 15 && "text-[var(--critical-text)]")}>
          {formatDecimal(vehicle.fuel_percent, locale, 0)}٪
        </span>
      ),
    },
    {
      key: "odometer",
      header: t.vehicles.odometer,
      numeric: true,
      hideBelow: "lg",
      cell: (vehicle) => formatNumber(vehicle.odometer_km, locale),
    },
    {
      key: "health",
      header: t.vehicles.health,
      numeric: true,
      cell: (vehicle) => <HealthBar value={vehicle.health_score} />,
    },
    {
      key: "lastSeen",
      header: t.vehicles.lastSeen,
      numeric: true,
      hideBelow: "lg",
      cell: (vehicle) => (
        <span className="text-ink-muted">{formatRelative(vehicle.last_seen, locale)}</span>
      ),
    },
  ];

  return (
    <PageBody>
      <PageHeader title={t.vehicles.title} lead={t.vehicles.lead} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex h-10 flex-1 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 sm:max-w-[280px]">
          <Search className="size-4 shrink-0 text-ink-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.common.searchPlaceholder}
            className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-muted"
          />
        </div>
        <div className="scroll-thin flex items-center gap-1.5 overflow-x-auto">
          {FILTERS.map((value) => (
            <Chip key={value} active={filter === value} onClick={() => setFilter(value)}>
              {value === "all" ? t.common.all : t.dash.status[value]}
            </Chip>
          ))}
        </div>
        <span className="tnum ms-auto text-[12.5px] text-ink-muted">
          {formatNumber(rows.length, locale)} {t.vehicles.resultCount}
        </span>
      </div>

      <Card padded={false}>
        {loading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <Skeleton key={index} className="h-14" />
            ))}
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            onRowClick={(vehicle) => router.push(href(`/app/vehicles/${vehicle.id}`))}
            empty={<EmptyState icon={<Car className="size-5" />} title={t.common.none} />}
          />
        )}
      </Card>
    </PageBody>
  );
}
