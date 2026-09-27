export type VehicleStatus = "moving" | "idle" | "parked" | "offline" | "service";
export type Severity = "good" | "warning" | "serious" | "critical";
export type Badge = "gold" | "silver" | "bronze" | "risk";

export interface DriverBrief {
  id: number;
  full_name: string;
  full_name_fa: string;
  score: number;
  badge: Badge;
}

export interface Vehicle {
  id: number;
  plate: string;
  plate_en: string;
  name: string;
  name_fa: string;
  make: string;
  model: string;
  model_fa: string;
  year: number;
  vin: string;
  device_id: string;
  vehicle_type: string;
  status: VehicleStatus;
  lat: number;
  lng: number;
  heading: number;
  speed_kmh: number;
  odometer_km: number;
  fuel_percent: number;
  battery_volt: number;
  coolant_c: number;
  engine_rpm: number;
  health_score: number;
  last_seen: string;
  driver: DriverBrief | null;
}

export interface Driver extends DriverBrief {
  phone: string;
  license_no: string;
  trips_count: number;
  distance_km: number;
  harsh_brake_count: number;
  harsh_accel_count: number;
  speeding_count: number;
  idle_minutes: number;
}

export interface Trip {
  id: number;
  vehicle_id: number;
  driver_id: number | null;
  started_at: string;
  ended_at: string;
  distance_km: number;
  duration_min: number;
  idle_min: number;
  avg_speed: number;
  max_speed: number;
  fuel_used_l: number;
  score: number;
  start_label: string;
  start_label_fa: string;
  end_label: string;
  end_label_fa: string;
  path: [number, number][];
}

export type AlertKind =
  | "engine"
  | "geofence"
  | "speeding"
  | "battery"
  | "idle"
  | "maintenance"
  | "harsh"
  | "towing";

export interface Alert {
  id: number;
  vehicle_id: number | null;
  kind: AlertKind;
  severity: Severity;
  title: string;
  title_fa: string;
  message: string;
  message_fa: string;
  acknowledged: boolean;
  occurred_at: string;
}

export interface Geofence {
  id: number;
  name: string;
  name_fa: string;
  kind: "depot" | "customer" | "restricted" | "service";
  lat: number;
  lng: number;
  radius_m: number;
  alert_on_enter: boolean;
  alert_on_exit: boolean;
  active: boolean;
}

export interface MaintenanceTask {
  id: number;
  vehicle_id: number;
  kind: string;
  title: string;
  title_fa: string;
  due_km: number;
  due_date: string | null;
  status: "overdue" | "due" | "upcoming" | "done";
  cost_toman: number;
}

export interface Diagnostic {
  id: number;
  vehicle_id: number;
  code: string;
  description: string;
  description_fa: string;
  severity: Severity;
  detected_at: string;
  cleared: boolean;
}

export interface StatDelta {
  value: number;
  delta_pct: number;
  direction: "up" | "down" | "flat";
  good: boolean;
}

export interface FleetOverview {
  total_vehicles: number;
  moving: number;
  idle: number;
  parked: number;
  offline: number;
  in_service: number;
  active_drivers: number;
  open_alerts: number;
  critical_alerts: number;
  distance_today_km: StatDelta;
  fuel_today_l: StatDelta;
  avg_driver_score: StatDelta;
  fleet_health: StatDelta;
  utilization_pct: StatDelta;
  idle_hours_today: StatDelta;
  cost_saved_toman: number;
  co2_saved_kg: number;
}

export interface SeriesPoint {
  label: string;
  label_fa: string;
  values: Record<string, number>;
}

export interface TimeSeries {
  keys: string[];
  points: SeriesPoint[];
}

export interface ScoreBand {
  band: Badge;
  band_fa: string;
  count: number;
  low: number;
  high: number;
}

export interface AlertMixItem {
  kind: AlertKind;
  count: number;
  severity: Severity;
}

export interface MaintenanceForecast {
  overdue: number;
  due: number;
  upcoming: number;
  done: number;
  open_cost_toman: number;
}

export interface Organization {
  id: number;
  name: string;
  name_fa: string;
  plan: string;
  city: string;
  city_fa: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  full_name_fa: string;
  role: string;
  locale: string;
  phone: string;
  organization: Organization;
}

export interface Plan {
  id: string;
  name: string;
  name_fa: string;
  price_toman: number;
  unit: string;
  unit_fa: string;
  audience: string;
  audience_fa: string;
  popular?: boolean;
  features: string[];
  features_fa: string[];
}

/** A single frame from the telemetry websocket. */
export interface TelemetryVehicle {
  id: number;
  lat: number;
  lng: number;
  heading: number;
  speed_kmh: number;
  status: VehicleStatus;
  fuel_percent: number;
  odometer_km: number;
  engine_rpm: number;
  coolant_c: number;
  battery_volt: number;
  health_score: number;
  last_seen: string | null;
}
