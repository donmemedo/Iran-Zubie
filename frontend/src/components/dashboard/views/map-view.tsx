"use client";

import { Car, Layers, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { MapPanel } from "@/components/map/map-panel";
import { Chip, StatusPill } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { clsx, formatDecimal, formatRelative, pick } from "@/lib/format";
import { useApi, useTelemetry } from "@/lib/hooks";
import { useLocale } from "@/lib/locale-context";
import type { Vehicle, VehicleStatus } from "@/lib/types";

const STATUS_FILTERS: (VehicleStatus | "all")[] = ["all", "moving", "idle", "parked", "service", "offline"];

export function MapView() {
  const { t, locale, href } = useLocale();
  const router = useRouter();

  const { data: vehicles, loading } = useApi(() => api.vehicles(), []);
  const { data: geofences } = useApi(() => api.geofences(), []);
  const { vehicles: live } = useTelemetry(true);

  const [filter, setFilter] = useState<VehicleStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [showFences, setShowFences] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);

  /** The persisted row is the source of names; the socket owns the position. */
  const merged = useMemo<Vehicle[]>(
    () =>
      (vehicles ?? []).map((vehicle) => {
        const frame = live[vehicle.id];
        return frame ? { ...vehicle, ...frame, last_seen: frame.last_seen ?? vehicle.last_seen } : vehicle;
      }),
    [vehicles, live],
  );

  const visible = useMemo(() => {
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
  }, [merged, filter, query, locale]);

  const focus = selected ? merged.find((vehicle) => vehicle.id === selected) : null;

  return (
    <div className="relative h-[calc(100dvh-4rem)]">
      <div className="absolute inset-0">
        {loading ? (
          <Skeleton className="size-full rounded-none" />
        ) : (
          <MapPanel
            vehicles={visible}
            geofences={showFences ? (geofences ?? []) : []}
            selectedId={selected}
            onSelect={setSelected}
            flyTo={focus ? [focus.lat, focus.lng] : null}
          />
        )}
      </div>

      {/* floating controls */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] p-3 sm:p-4">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <div className="glass flex h-10 items-center gap-2 rounded-xl px-3">
            <Search className="size-4 shrink-0 text-ink-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.common.searchPlaceholder}
              className="w-[150px] bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-muted sm:w-[210px]"
            />
          </div>

          <div className="glass hidden items-center gap-1 rounded-xl p-1 md:flex">
            {STATUS_FILTERS.map((value) => (
              <Chip key={value} active={filter === value} onClick={() => setFilter(value)}>
                {value === "all" ? t.common.all : t.dash.status[value]}
              </Chip>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowFences((value) => !value)}
            className={clsx(
              "glass inline-flex h-10 items-center gap-2 rounded-xl px-3 text-[13px] transition-colors",
              showFences ? "text-[var(--brand)]" : "text-ink-muted",
            )}
          >
            <Layers className="size-4" />
            {t.geofences.title}
          </button>
        </div>
      </div>

      {/* vehicle list panel */}
      <div
        className={clsx(
          "absolute bottom-0 z-[500] w-full transition-transform duration-300 sm:bottom-4 sm:w-[336px] ltr:sm:left-4 rtl:sm:right-4",
          panelOpen ? "translate-y-0" : "translate-y-[calc(100%-46px)]",
        )}
      >
        <div className="glass overflow-hidden rounded-t-2xl sm:rounded-2xl">
          <button
            type="button"
            onClick={() => setPanelOpen((value) => !value)}
            className="flex w-full items-center justify-between gap-2 px-4 py-3"
          >
            <span className="flex items-center gap-2 text-[13px] font-semibold text-ink">
              <Car className="size-4" />
              {t.vehicles.title}
              <span className="tnum rounded-full bg-[var(--surface-sunken)] px-2 py-0.5 text-[11px] font-normal text-ink-muted">
                {visible.length}
              </span>
            </span>
            <X
              className={clsx(
                "size-4 text-ink-muted transition-transform duration-300",
                !panelOpen && "rotate-45",
              )}
            />
          </button>

          <ul className="scroll-thin max-h-[38dvh] divide-y divide-[var(--glass-line)] overflow-y-auto border-t border-[var(--glass-line)] sm:max-h-[46dvh]">
            {visible.map((vehicle) => (
              <li key={vehicle.id}>
                <button
                  type="button"
                  onClick={() => setSelected(vehicle.id)}
                  onDoubleClick={() => router.push(href(`/app/vehicles/${vehicle.id}`))}
                  className={clsx(
                    "flex w-full items-center gap-3 px-4 py-3 text-start transition-colors",
                    selected === vehicle.id ? "bg-[var(--brand-soft)]" : "hover:bg-[var(--surface-sunken)]",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">
                      {pick(vehicle, "name", locale)}
                    </p>
                    <p className="truncate text-[11.5px] text-ink-muted">
                      {vehicle.driver ? pick(vehicle.driver, "full_name", locale) : vehicle.plate}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatusPill
                      status={vehicle.status}
                      label={t.dash.status[vehicle.status]}
                      pulse
                    />
                    <span className="tnum text-[11px] text-ink-muted">
                      {vehicle.status === "offline"
                        ? formatRelative(vehicle.last_seen, locale)
                        : `${formatDecimal(vehicle.speed_kmh, locale, 0)} ${t.common.kmh}`}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
