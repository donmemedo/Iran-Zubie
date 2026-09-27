"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { Circle, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";

import { useCssVars } from "@/lib/css-var";
import { formatDecimal, pick } from "@/lib/format";
import { useLocale } from "@/lib/locale-context";
import { useTheme } from "@/lib/theme";
import type { Geofence, Vehicle, VehicleStatus } from "@/lib/types";

/* Marker icons are HTML, so they may use tokens directly. */
const STATUS_COLOR: Record<VehicleStatus, string> = {
  moving: "var(--good)",
  idle: "var(--warning)",
  parked: "var(--ink-muted)",
  offline: "var(--axis)",
  service: "var(--serious)",
};

/* Leaflet paths are SVG attributes, so these tokens must be resolved first. */
const FENCE_TOKENS: Record<Geofence["kind"], string> = {
  depot: "--series-1",
  customer: "--series-3",
  restricted: "--critical",
  service: "--series-4",
};

/**
 * Vehicle markers are div icons rather than images so they inherit the theme
 * tokens and can be rotated to the reported heading.
 */
function vehicleIcon(status: VehicleStatus, heading: number, selected: boolean) {
  const color = STATUS_COLOR[status];
  const pulse =
    status === "moving"
      ? `<span style="position:absolute;inset:0;border-radius:999px;background:${color};opacity:.35;animation:pulse-ring 2.2s cubic-bezier(0.25,1,0.5,1) infinite"></span>`
      : "";
  const ring = selected
    ? `box-shadow:0 0 0 3px var(--surface),0 0 0 5px ${color},0 6px 16px rgba(0,0,0,.28)`
    : `box-shadow:0 0 0 2px var(--surface),0 3px 10px rgba(0,0,0,.28)`;

  return L.divIcon({
    className: "zubie-marker",
    html: `
      <div style="position:relative;width:26px;height:26px">
        ${pulse}
        <div style="position:absolute;inset:0;border-radius:999px;background:${color};${ring};display:flex;align-items:center;justify-content:center">
          <svg width="13" height="13" viewBox="0 0 12 12" style="transform:rotate(${heading}deg)">
            <path d="M6 1.4 L9.6 10 L6 7.8 L2.4 10 Z" fill="#fff"/>
          </svg>
        </div>
      </div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function FitBounds({ vehicles, active }: { vehicles: Vehicle[]; active: boolean }) {
  const map = useMap();
  const done = useRef(false);

  useEffect(() => {
    if (!active || done.current || vehicles.length === 0) return;
    const bounds = L.latLngBounds(vehicles.map((vehicle) => [vehicle.lat, vehicle.lng]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13 });
    done.current = true;
  }, [map, vehicles, active]);

  return null;
}

function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, Math.max(map.getZoom(), 14), { duration: 0.9 });
  }, [map, target]);
  return null;
}

export interface FleetMapProps {
  vehicles: Vehicle[];
  geofences?: Geofence[];
  trail?: [number, number][];
  selectedId?: number | null;
  onSelect?: (id: number) => void;
  flyTo?: [number, number] | null;
  center?: [number, number];
  zoom?: number;
  fitToVehicles?: boolean;
  interactive?: boolean;
  className?: string;
}

export default function FleetMap({
  vehicles,
  geofences = [],
  trail,
  selectedId = null,
  onSelect,
  flyTo = null,
  center = [35.6892, 51.389],
  zoom = 11,
  fitToVehicles = true,
  interactive = true,
  className,
}: FleetMapProps) {
  const { locale, t } = useLocale();
  const { resolved: themeKey } = useTheme();
  const colors = useCssVars(
    { ...FENCE_TOKENS, trail: "--series-1" } as Record<string, string>,
    themeKey,
  );

  const icons = useMemo(
    () =>
      new Map(
        vehicles.map((vehicle) => [
          vehicle.id,
          vehicleIcon(vehicle.status, vehicle.heading, vehicle.id === selectedId),
        ]),
      ),
    [vehicles, selectedId],
  );

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className={className}
      scrollWheelZoom={interactive}
      dragging={interactive}
      zoomControl={interactive}
      doubleClickZoom={interactive}
      attributionControl
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />

      {geofences.map((fence) => (
        <Circle
          key={fence.id}
          center={[fence.lat, fence.lng]}
          radius={fence.radius_m}
          pathOptions={{
            color: colors[fence.kind],
            fillColor: colors[fence.kind],
            fillOpacity: 0.08,
            weight: 1.5,
            dashArray: fence.kind === "restricted" ? "6 5" : undefined,
          }}
        >
          <Tooltip direction="top" offset={[0, -4]} opacity={1}>
            <span className="text-[12px] font-medium">{pick(fence, "name", locale)}</span>
          </Tooltip>
        </Circle>
      ))}

      {trail && trail.length > 1 && (
        <Polyline
          positions={trail}
          pathOptions={{ color: colors.trail, weight: 3.5, opacity: 0.85, lineCap: "round" }}
        />
      )}

      {vehicles.map((vehicle) => (
        <Marker
          key={vehicle.id}
          position={[vehicle.lat, vehicle.lng]}
          icon={icons.get(vehicle.id)!}
          eventHandlers={onSelect ? { click: () => onSelect(vehicle.id) } : undefined}
        >
          <Tooltip direction="top" offset={[0, -14]} opacity={1}>
            <div className="min-w-[130px] space-y-0.5">
              <p className="text-[12px] font-semibold">{pick(vehicle, "name", locale)}</p>
              <p className="text-[11px] opacity-70">{vehicle.plate}</p>
              <p className="tnum text-[11px]">
                {formatDecimal(vehicle.speed_kmh, locale, 0)} {t.common.kmh} ·{" "}
                {t.dash.status[vehicle.status]}
              </p>
            </div>
          </Tooltip>
        </Marker>
      ))}

      <FitBounds vehicles={vehicles} active={fitToVehicles} />
      <FlyTo target={flyTo} />
    </MapContainer>
  );
}
