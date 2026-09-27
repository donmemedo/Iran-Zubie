from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, utcnow


class Organization(Base, TimestampMixin):
    """A fleet-owning customer. Everything else is scoped to one of these."""

    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    name_fa: Mapped[str] = mapped_column(String(120))
    plan: Mapped[str] = mapped_column(String(20), default="pro")  # basic | pro | enterprise
    city: Mapped[str] = mapped_column(String(60), default="Tehran")
    city_fa: Mapped[str] = mapped_column(String(60), default="تهران")

    users: Mapped[list["User"]] = relationship(back_populates="organization")
    vehicles: Mapped[list["Vehicle"]] = relationship(back_populates="organization")


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(180), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(120))
    full_name_fa: Mapped[str] = mapped_column(String(120), default="")
    role: Mapped[str] = mapped_column(String(20), default="manager")  # admin | manager | viewer
    locale: Mapped[str] = mapped_column(String(5), default="fa")
    phone: Mapped[str] = mapped_column(String(30), default="")
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"))

    organization: Mapped[Organization] = relationship(back_populates="users")


class Driver(Base, TimestampMixin):
    __tablename__ = "drivers"

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"))
    full_name: Mapped[str] = mapped_column(String(120))
    full_name_fa: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(30), default="")
    license_no: Mapped[str] = mapped_column(String(40), default="")
    # Gamified 0-100 score, recomputed from the event counters below.
    score: Mapped[float] = mapped_column(Float, default=80.0)
    trips_count: Mapped[int] = mapped_column(Integer, default=0)
    distance_km: Mapped[float] = mapped_column(Float, default=0.0)
    harsh_brake_count: Mapped[int] = mapped_column(Integer, default=0)
    harsh_accel_count: Mapped[int] = mapped_column(Integer, default=0)
    speeding_count: Mapped[int] = mapped_column(Integer, default=0)
    idle_minutes: Mapped[int] = mapped_column(Integer, default=0)
    badge: Mapped[str] = mapped_column(String(30), default="bronze")  # gold|silver|bronze|risk

    vehicles: Mapped[list["Vehicle"]] = relationship(back_populates="driver")


class Vehicle(Base, TimestampMixin):
    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"))
    driver_id: Mapped[int | None] = mapped_column(ForeignKey("drivers.id"), nullable=True)

    plate: Mapped[str] = mapped_column(String(30))          # e.g. "۲۲ ایران ۳۴۵ ب ۱۲"
    plate_en: Mapped[str] = mapped_column(String(30))       # ASCII form for search
    name: Mapped[str] = mapped_column(String(80))
    name_fa: Mapped[str] = mapped_column(String(80))
    make: Mapped[str] = mapped_column(String(40))
    model: Mapped[str] = mapped_column(String(40))
    model_fa: Mapped[str] = mapped_column(String(40), default="")
    year: Mapped[int] = mapped_column(Integer, default=1400)
    vin: Mapped[str] = mapped_column(String(40), default="")
    device_id: Mapped[str] = mapped_column(String(40), default="")
    vehicle_type: Mapped[str] = mapped_column(String(20), default="van")  # van|truck|sedan|pickup|bike

    status: Mapped[str] = mapped_column(String(20), default="moving")  # moving|idle|parked|offline|service
    lat: Mapped[float] = mapped_column(Float, default=35.6892)
    lng: Mapped[float] = mapped_column(Float, default=51.3890)
    heading: Mapped[float] = mapped_column(Float, default=0.0)
    speed_kmh: Mapped[float] = mapped_column(Float, default=0.0)
    odometer_km: Mapped[float] = mapped_column(Float, default=0.0)
    fuel_percent: Mapped[float] = mapped_column(Float, default=70.0)
    battery_volt: Mapped[float] = mapped_column(Float, default=12.6)
    coolant_c: Mapped[float] = mapped_column(Float, default=88.0)
    engine_rpm: Mapped[float] = mapped_column(Float, default=0.0)
    health_score: Mapped[float] = mapped_column(Float, default=92.0)
    last_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    organization: Mapped[Organization] = relationship(back_populates="vehicles")
    driver: Mapped[Driver | None] = relationship(back_populates="vehicles")


class Trip(Base, TimestampMixin):
    __tablename__ = "trips"

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"))
    vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.id"))
    driver_id: Mapped[int | None] = mapped_column(ForeignKey("drivers.id"), nullable=True)

    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    distance_km: Mapped[float] = mapped_column(Float, default=0.0)
    duration_min: Mapped[int] = mapped_column(Integer, default=0)
    idle_min: Mapped[int] = mapped_column(Integer, default=0)
    avg_speed: Mapped[float] = mapped_column(Float, default=0.0)
    max_speed: Mapped[float] = mapped_column(Float, default=0.0)
    fuel_used_l: Mapped[float] = mapped_column(Float, default=0.0)
    score: Mapped[float] = mapped_column(Float, default=85.0)
    start_label: Mapped[str] = mapped_column(String(120), default="")
    start_label_fa: Mapped[str] = mapped_column(String(120), default="")
    end_label: Mapped[str] = mapped_column(String(120), default="")
    end_label_fa: Mapped[str] = mapped_column(String(120), default="")
    path: Mapped[list] = mapped_column(JSON, default=list)  # [[lat, lng], ...]


class Alert(Base, TimestampMixin):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"))
    vehicle_id: Mapped[int | None] = mapped_column(ForeignKey("vehicles.id"), nullable=True)

    # engine | geofence | speeding | battery | idle | maintenance | harsh | towing
    kind: Mapped[str] = mapped_column(String(30))
    severity: Mapped[str] = mapped_column(String(20), default="warning")  # good|warning|serious|critical
    title: Mapped[str] = mapped_column(String(160))
    title_fa: Mapped[str] = mapped_column(String(160))
    message: Mapped[str] = mapped_column(Text, default="")
    message_fa: Mapped[str] = mapped_column(Text, default="")
    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Geofence(Base, TimestampMixin):
    __tablename__ = "geofences"

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"))
    name: Mapped[str] = mapped_column(String(120))
    name_fa: Mapped[str] = mapped_column(String(120))
    kind: Mapped[str] = mapped_column(String(20), default="depot")  # depot|customer|restricted|service
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    radius_m: Mapped[int] = mapped_column(Integer, default=500)
    alert_on_enter: Mapped[bool] = mapped_column(Boolean, default=True)
    alert_on_exit: Mapped[bool] = mapped_column(Boolean, default=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class MaintenanceTask(Base, TimestampMixin):
    __tablename__ = "maintenance_tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"))
    vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.id"))
    kind: Mapped[str] = mapped_column(String(40))          # oil|brake|tire|filter|timing_belt|inspection
    title: Mapped[str] = mapped_column(String(120))
    title_fa: Mapped[str] = mapped_column(String(120))
    due_km: Mapped[float] = mapped_column(Float, default=0.0)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="upcoming")  # upcoming|due|overdue|done
    cost_toman: Mapped[int] = mapped_column(Integer, default=0)


class DiagnosticCode(Base, TimestampMixin):
    __tablename__ = "diagnostic_codes"

    id: Mapped[int] = mapped_column(primary_key=True)
    vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.id"))
    code: Mapped[str] = mapped_column(String(12))  # e.g. P0301
    description: Mapped[str] = mapped_column(String(200))
    description_fa: Mapped[str] = mapped_column(String(200))
    severity: Mapped[str] = mapped_column(String(20), default="warning")
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    cleared: Mapped[bool] = mapped_column(Boolean, default=False)


class Lead(Base, TimestampMixin):
    """Landing-page 'request a pilot' submissions."""

    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(primary_key=True)
    company: Mapped[str] = mapped_column(String(140))
    contact_name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(40))
    email: Mapped[str] = mapped_column(String(180), default="")
    fleet_size: Mapped[int] = mapped_column(Integer, default=10)
    message: Mapped[str] = mapped_column(Text, default="")
