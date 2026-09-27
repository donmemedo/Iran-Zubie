"use client";

import {
  ArrowLeft,
  ArrowRight,
  BatteryMedium,
  Car,
  Droplets,
  Gauge,
  Route,
  Thermometer,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Gauge as GaugeMeter } from "@/components/charts/gauge";
import { PageBody } from "@/components/dashboard/page-header";
import { MapPanel } from "@/components/map/map-panel";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { SeverityPill, StatusPill } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import {
  formatDateTime,
  formatDecimal,
  formatNumber,
  formatRelative,
  formatTime,
  pick,
} from "@/lib/format";
import { useApi, useTelemetry } from "@/lib/hooks";
import { useLocale } from "@/lib/locale-context";

function Metric({
  icon: Icon,
  label,
  value,
  unit,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-sunken)] p-3.5">
      <p className="flex items-center gap-1.5 text-[11.5px] text-ink-muted">
        <Icon className="size-3.5" />
        {label}
      </p>
      <p className="mt-1.5 flex items-baseline gap-1">
        <span className="tnum text-[19px] font-semibold leading-none text-ink">{value}</span>
        {unit && (
          /* bdi keeps "°C" and "V" from being reordered inside RTL copy */
          <bdi className="text-[11px] text-ink-muted">{unit}</bdi>
        )}
      </p>
    </div>
  );
}

export function VehicleDetailView({ vehicleId }: { vehicleId: number }) {
  const { t, locale, href } = useLocale();
  const { data: vehicle, loading } = useApi(() => api.vehicle(vehicleId), [vehicleId]);
  const { data: trips } = useApi(() => api.vehicleTrips(vehicleId), [vehicleId]);
  const { data: codes } = useApi(() => api.vehicleDiagnostics(vehicleId), [vehicleId]);
  const { vehicles: live } = useTelemetry(true);
  const [activeTrip, setActiveTrip] = useState<number | null>(null);

  const current = useMemo(() => {
    if (!vehicle) return null;
    const frame = live[vehicle.id];
    return frame ? { ...vehicle, ...frame, last_seen: frame.last_seen ?? vehicle.last_seen } : vehicle;
  }, [vehicle, live]);

  const trail = useMemo(() => {
    if (!activeTrip) return undefined;
    const trip = trips?.find((item) => item.id === activeTrip);
    return trip?.path as [number, number][] | undefined;
  }, [activeTrip, trips]);

  const Back = locale === "fa" ? ArrowRight : ArrowLeft;

  if (loading || !current) {
    return (
      <PageBody>
        <Skeleton className="h-10 w-52" />
        <Skeleton className="h-[380px]" />
      </PageBody>
    );
  }

  const healthColor =
    current.health_score >= 82 ? "var(--good)" : current.health_score >= 65 ? "var(--warning)" : "var(--critical)";

  return (
    <PageBody>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href={href("/app/vehicles")}
            className="inline-flex size-10 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-ink-secondary transition-colors hover:text-ink"
            aria-label={t.common.back}
          >
            <Back className="size-[18px]" />
          </Link>
          <div>
            <h1 className="text-[21px] font-bold tracking-tight text-ink">
              {pick(current, "name", locale)}
            </h1>
            <p className="mt-0.5 flex items-center gap-2 text-[12.5px] text-ink-muted">
              <span>{current.plate}</span>
              <span>·</span>
              <span>{current.make} {locale === "fa" ? current.model_fa : current.model}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status={current.status} label={t.dash.status[current.status]} pulse />
          <span className="text-[12px] text-ink-muted">
            {t.common.lastUpdate}: {formatRelative(current.last_seen, locale)}
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card padded={false} className="flex overflow-hidden lg:min-h-[560px]">
          <div className="h-[340px] w-full sm:h-[420px] lg:h-auto">
            <MapPanel
              vehicles={[current]}
              trail={trail}
              fitToVehicles={!trail}
              center={[current.lat, current.lng]}
              zoom={13}
              selectedId={current.id}
            />
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title={t.vehicles.liveTelemetry} />
            <div className="mt-4 flex items-center gap-5">
              <GaugeMeter
                value={current.health_score}
                color={healthColor}
                label={t.vehicles.health}
                size={124}
              />
              <div className="flex-1 space-y-2.5">
                {[
                  { label: t.vehicles.speed, value: `${formatDecimal(current.speed_kmh, locale, 0)} ${t.common.kmh}` },
                  { label: t.vehicles.fuel, value: `${formatDecimal(current.fuel_percent, locale, 0)}٪` },
                  { label: t.vehicles.odometer, value: `${formatNumber(current.odometer_km, locale)} ${t.common.km}` },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-3">
                    <span className="text-[12.5px] text-ink-muted">{row.label}</span>
                    <span className="tnum text-[13.5px] font-medium text-ink">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <Metric
                icon={BatteryMedium}
                label={t.vehicles.battery}
                value={formatDecimal(current.battery_volt, locale, 1)}
                unit="V"
              />
              <Metric
                icon={Thermometer}
                label={t.vehicles.coolant}
                value={formatDecimal(current.coolant_c, locale, 0)}
                unit="°C"
              />
              <Metric
                icon={Gauge}
                label={t.vehicles.rpm}
                value={formatNumber(current.engine_rpm, locale)}
              />
              <Metric icon={Droplets} label={t.vehicles.device} value={current.device_id} />
            </div>
          </Card>

          <Card>
            <CardHeader title={t.vehicles.diagnostics} />
            {codes && codes.length > 0 ? (
              <ul className="mt-4 space-y-2.5">
                {codes.map((code) => (
                  <li
                    key={code.id}
                    className="flex items-start gap-3 rounded-xl border border-[var(--line)] p-3"
                  >
                    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[var(--serious)]" />
                    <div className="min-w-0 flex-1">
                      <p className="tnum text-[13px] font-semibold text-ink" style={{ direction: "ltr" }}>
                        {code.code}
                      </p>
                      <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-secondary">
                        {pick(code, "description", locale)}
                      </p>
                      <p className="mt-1 text-[11px] text-ink-muted">
                        {formatRelative(code.detected_at, locale)}
                      </p>
                    </div>
                    <SeverityPill
                      severity={code.severity}
                      label={t.alerts.severityLabel[code.severity]}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={<Wrench className="size-5" />} title={t.vehicles.noDiagnostics} />
            )}
          </Card>
        </div>
      </div>

      <Card padded={false}>
        <div className="p-5">
          <CardHeader title={t.vehicles.tripHistory} />
        </div>
        {trips && trips.length > 0 ? (
          <ul className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
            {trips.map((trip) => (
              <li key={trip.id}>
                <button
                  type="button"
                  onClick={() => setActiveTrip(activeTrip === trip.id ? null : trip.id)}
                  className={`flex w-full flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-3.5 text-start transition-colors hover:bg-[var(--surface-sunken)] ${
                    activeTrip === trip.id ? "bg-[var(--brand-soft)]" : ""
                  }`}
                >
                  <Route className="size-4 shrink-0 text-ink-muted" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-ink">
                      {pick(trip, "start_label", locale)} ← {pick(trip, "end_label", locale)}
                    </p>
                    <p className="text-[11.5px] text-ink-muted">
                      {formatDateTime(trip.started_at, locale)} · {formatTime(trip.ended_at, locale)}
                    </p>
                  </div>
                  <span className="tnum shrink-0 text-[13px] text-ink-secondary">
                    {formatDecimal(trip.distance_km, locale, 1)} {t.common.km}
                  </span>
                  <span className="tnum shrink-0 text-[13px] text-ink-secondary">
                    {formatNumber(trip.duration_min, locale)} {t.common.minute}
                  </span>
                  <span className="tnum shrink-0 rounded-lg bg-[var(--surface-sunken)] px-2 py-1 text-[12px] font-semibold text-ink">
                    {formatDecimal(trip.score, locale, 0)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<Car className="size-5" />} title={t.common.none} />
        )}
      </Card>
    </PageBody>
  );
}
