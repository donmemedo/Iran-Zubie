from datetime import UTC, date, datetime
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, BeforeValidator, ConfigDict, EmailStr, Field, StringConstraints


def _as_utc(value: datetime | str) -> datetime | str:
    """SQLite returns naive datetimes; everything stored is UTC."""
    if isinstance(value, datetime) and value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


UtcDatetime = Annotated[datetime, BeforeValidator(_as_utc)]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class StrictInput(BaseModel):
    """Inbound payloads reject unknown fields, so a client cannot smuggle `role` or `organization_id`."""

    model_config = ConfigDict(extra="forbid")


# Lengths match the DB columns so oversized input is a 422, never a 500 on Postgres.
Email = Annotated[EmailStr, Field(max_length=180)]
# Stripped first, so "   " is rejected instead of saved as a blank name.
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]

AlertSeverity = Literal["good", "warning", "serious", "critical"]
VehicleStatus = Literal["moving", "idle", "parked", "offline", "service"]
MaintenanceStatus = Literal["upcoming", "due", "overdue", "done"]
GeofenceKind = Literal["depot", "customer", "restricted", "service"]

# ponytail: tiny denylist of the most common 10+ character passwords; swap for a
# breached-password (HIBP k-anonymity) check when sign-up volume justifies it.
COMMON_PASSWORDS = frozenset({
    "0123456789", "1234567890", "12345678910", "0987654321", "1q2w3e4r5t", "1qaz2wsx3edc",
    "qwertyuiop", "asdfghjkl;", "password12", "password123", "password1234", "passw0rd123",
    "qwerty1234", "qwerty12345", "qwerty123456", "iloveyou12", "zubie12345", "admin12345",
})


def _strong_password(value: str) -> str:
    if len(value.encode()) > 72:  # bcrypt silently ignores everything past 72 bytes
        raise ValueError("Password must be at most 72 bytes")
    if value.lower() in COMMON_PASSWORDS or len(set(value)) < 4:
        raise ValueError("This password is too common")
    return value


# Persian/Arabic digits -> ASCII, and drop the separators people type.
_PHONE_CHARS = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "0123456789" * 2, " -()")


def _normalise_phone(value: object) -> object:
    return value.translate(_PHONE_CHARS) if isinstance(value, str) else value


# Iranian mobile/landline (0 + 10 digits) or international (+ or 00, then 8-15 digits).
Phone = Annotated[
    str,
    BeforeValidator(_normalise_phone),
    Field(max_length=40, pattern=r"^(?:0[0-9]{10}|(?:\+|00)[0-9]{8,15})$"),
]


# ---------------------------------------------------------------- auth


class LoginRequest(StrictInput):
    email: Email
    password: str = Field(max_length=128)


class RegisterRequest(StrictInput):
    email: Email
    password: Annotated[str, Field(min_length=10, max_length=72), AfterValidator(_strong_password)]
    full_name: Name
    full_name_fa: str = Field(default="", max_length=120)
    company: str = Field(default="Zubie Demo Fleet", max_length=120)


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
    token_type: str = "bearer"  # noqa: S105 - OAuth2 token type, not a secret
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


class GeofenceCreate(StrictInput):
    name: Name
    name_fa: str = Field(default="", max_length=120)
    kind: GeofenceKind = "customer"
    lat: float = Field(ge=25, le=40)  # Iran's bounding box
    lng: float = Field(ge=44, le=64)
    radius_m: int = Field(default=500, ge=50, le=50_000)
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


class LeadCreate(StrictInput):
    company: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=140)]
    contact_name: Name
    phone: Phone
    email: Email | Literal[""] = ""
    fleet_size: int = Field(default=10, ge=1, le=10_000)
    message: str = Field(default="", max_length=2000)
