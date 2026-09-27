"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import type { FleetMapProps } from "@/components/map/fleet-map";

/** Leaflet touches `window` on import, so the map is client-only. */
const FleetMap = dynamic(() => import("@/components/map/fleet-map"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
});

export function MapPanel(props: FleetMapProps) {
  return <FleetMap {...props} />;
}
