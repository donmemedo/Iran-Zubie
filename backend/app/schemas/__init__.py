from datetime import date, datetime, timezone
from typing import Annotated

from pydantic import BaseModel, BeforeValidator, ConfigDict, EmailStr, Field


def _as_utc(value: datetime | str) -> datetime | str:
    """SQLite returns naive datetimes; everything stored is UTC."""
    if isinstance(value, datetime) and value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


UtcDatetime = Annotated[datetime, BeforeValidator(_as_utc)]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------- auth


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str
    full_name_fa: str = ""
    company: str = "Zubie Demo Fleet"


class OrganizationOut(ORMModel):
    id: int
    name: str
    name_fa: str
    plan: str
    city: str
    city_fa: str


class UserOut(ORMModel):
    id: int
    email: EmailStr
    full_name: str
    full_name_fa: str
    role: str
    locale: str
    phone: str
    organization: OrganizationOut


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------------------------------------------------------------- fleet


class DriverBrief(ORMModel):
    id: int
    full_name: str
    full_name_fa: str
    score: float
    badge: str


class VehicleOut(ORMModel):
    id: int
    plate: str
    plate_en: str
    name: str
    name_fa: str
    make: str
    model: str
    model_fa: str
    year: int
    vin: str
    device_id: str
    vehicle_type: str
    status: str
    lat: float
    lng: float
    heading: float
    speed_kmh: float
    odometer_km: float
    fuel_percent: float
    battery_volt: float
    coolant_c: float
    engine_rpm: float
    health_score: float
    last_seen: UtcDatetime
    driver: DriverBrief | None = None


class DriverOut(ORMModel):
    id: int
    full_name: str
    full_name_fa: str
    phone: str
    license_no: str
    score: float
    trips_count: int
    distance_km: float
    harsh_brake_count: int
    harsh_accel_count: int
    speeding_count: int
    idle_minutes: int
    badge: str


class TripOut(ORMModel):
    id: int
    vehicle_id: int
    driver_id: int | None
    started_at: UtcDatetime
    ended_at: UtcDatetime
    distance_km: float
    duration_min: int
    idle_min: int
    avg_speed: float
    max_speed: float
    fuel_used_l: float
    score: float
    start_label: str
    start_label_fa: str
    end_label: str
    end_label_fa: str
    path: list


class AlertOut(ORMModel):
    id: int
    vehicle_id: int | None
    kind: str
    severity: str
    title: str
    title_fa: str
    message: str
    message_fa: str
    acknowledged: bool
    occurred_at: UtcDatetime


class GeofenceOut(ORMModel):
    id: int
    name: str
    name_fa: str
    kind: str
    lat: float
    lng: float
    radius_m: int
    alert_on_enter: bool
    alert_on_exit: bool
    active: bool


class GeofenceCreate(BaseModel):
    name: str
    name_fa: str = ""
    kind: str = "customer"
    lat: float
    lng: float
    radius_m: int = 500
    alert_on_enter: bool = True
    alert_on_exit: bool = True


class MaintenanceOut(ORMModel):
    id: int
    vehicle_id: int
    kind: str
    title: str
    title_fa: str
    due_km: float
    due_date: date | None
    status: str
    cost_toman: int


class DiagnosticOut(ORMModel):
    id: int
    vehicle_id: int
    code: str
    description: str
    description_fa: str
    severity: str
    detected_at: UtcDatetime
    cleared: bool


# ---------------------------------------------------------------- analytics


class StatDelta(BaseModel):
    value: float
    delta_pct: float = 0.0
    direction: str = "flat"  # up | down | flat
    good: bool = True


class FleetOverview(BaseModel):
    total_vehicles: int
    moving: int
    idle: int
    parked: int
    offline: int
    in_service: int
    active_drivers: int
    open_alerts: int
    critical_alerts: int
    distance_today_km: StatDelta
    fuel_today_l: StatDelta
    avg_driver_score: StatDelta
    fleet_health: StatDelta
    utilization_pct: StatDelta
    idle_hours_today: StatDelta
    cost_saved_toman: int
    co2_saved_kg: float


class SeriesPoint(BaseModel):
    label: str
    label_fa: str
    values: dict[str, float]


class TimeSeries(BaseModel):
    keys: list[str]
    points: list[SeriesPoint]


class LeadCreate(BaseModel):
    company: str
    contact_name: str
    phone: str
    email: str = ""
    fleet_size: int = 10
    message: str = ""
