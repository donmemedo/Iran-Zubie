import {
  BellRing,
  Car,
  LayoutDashboard,
  MapPinned,
  Route,
  Settings,
  Shapes,
  Trophy,
  Wrench,
  FileBarChart,
  type LucideIcon,
} from "lucide-react";

import type { Dictionary } from "@/lib/dictionaries";

export interface NavItem {
  path: string;
  icon: LucideIcon;
  label: (t: Dictionary) => string;
  /** Shown in the bottom bar on phones. */
  primary?: boolean;
}

export const navItems: NavItem[] = [
  { path: "/app", icon: LayoutDashboard, label: (t) => t.dash.overview, primary: true },
  { path: "/app/map", icon: MapPinned, label: (t) => t.dash.liveMap, primary: true },
  { path: "/app/vehicles", icon: Car, label: (t) => t.dash.vehicles, primary: true },
  { path: "/app/drivers", icon: Trophy, label: (t) => t.dash.drivers, primary: true },
  { path: "/app/alerts", icon: BellRing, label: (t) => t.dash.alerts, primary: true },
  { path: "/app/trips", icon: Route, label: (t) => t.dash.trips },
  { path: "/app/maintenance", icon: Wrench, label: (t) => t.dash.maintenance },
  { path: "/app/geofences", icon: Shapes, label: (t) => t.dash.geofences },
  { path: "/app/reports", icon: FileBarChart, label: (t) => t.dash.reports },
  { path: "/app/settings", icon: Settings, label: (t) => t.dash.settings },
];

/** Overview matches exactly; every other section also owns its sub-routes. */
export function isActive(item: NavItem, current: string): boolean {
  return item.path === "/app"
    ? current === "/app"
    : current === item.path || current.startsWith(`${item.path}/`);
}
