import type {
  Alert,
  AlertMixItem,
  Diagnostic,
  Driver,
  FleetOverview,
  Geofence,
  MaintenanceForecast,
  MaintenanceTask,
  Plan,
  ScoreBand,
  TimeSeries,
  Trip,
  User,
  Vehicle,
} from "@/lib/types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8010";

export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL?.replace(/\/$/, "") || API_URL.replace(/^http/, "ws");

const TOKEN_KEY = "zubie.token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode — the session simply won't persist */
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}/api${path}`, { ...init, headers, cache: "no-store" });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(detail, response.status);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ access_token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (payload: { email: string; password: string; full_name: string; company: string }) =>
    request<{ access_token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  me: () => request<User>("/auth/me"),

  overview: () => request<FleetOverview>("/analytics/overview"),
  timeseries: (days = 14) => request<TimeSeries>(`/analytics/timeseries?days=${days}`),
  alertMix: () => request<AlertMixItem[]>("/analytics/alert-mix"),
  scoreDistribution: () => request<ScoreBand[]>("/analytics/score-distribution"),
  maintenanceForecast: () => request<MaintenanceForecast>("/analytics/maintenance-forecast"),

  vehicles: (params: { status?: string; search?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.status && params.status !== "all") query.set("status", params.status);
    if (params.search) query.set("search", params.search);
    const suffix = query.toString() ? `?${query}` : "";
    return request<Vehicle[]>(`/vehicles${suffix}`);
  },
  vehicle: (id: number) => request<Vehicle>(`/vehicles/${id}`),
  vehicleTrips: (id: number) => request<Trip[]>(`/vehicles/${id}/trips`),
  vehicleDiagnostics: (id: number) => request<Diagnostic[]>(`/vehicles/${id}/diagnostics`),

  drivers: () => request<Driver[]>("/drivers"),
  trips: (limit = 40) => request<Trip[]>(`/trips?limit=${limit}`),

  alerts: (params: { onlyOpen?: boolean; severity?: string; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.onlyOpen) query.set("only_open", "true");
    if (params.severity && params.severity !== "all") query.set("severity", params.severity);
    query.set("limit", String(params.limit ?? 50));
    return request<Alert[]>(`/alerts?${query}`);
  },
  acknowledgeAlert: (id: number) => request<Alert>(`/alerts/${id}/acknowledge`, { method: "POST" }),

  geofences: () => request<Geofence[]>("/geofences"),
  createGeofence: (payload: Partial<Geofence>) =>
    request<Geofence>("/geofences", { method: "POST", body: JSON.stringify(payload) }),
  deleteGeofence: (id: number) => request<void>(`/geofences/${id}`, { method: "DELETE" }),

  maintenance: (status?: string) =>
    request<MaintenanceTask[]>(`/maintenance${status && status !== "all" ? `?status=${status}` : ""}`),
  completeMaintenance: (id: number) =>
    request<MaintenanceTask>(`/maintenance/${id}/complete`, { method: "POST" }),

  plans: () => request<Plan[]>("/public/plans"),
  createLead: (payload: Record<string, unknown>) =>
    request<{ ok: boolean }>("/public/leads", { method: "POST", body: JSON.stringify(payload) }),
};
