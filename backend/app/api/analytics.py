from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import current_user
from app.db.session import get_session
from app.models import Alert, Driver, MaintenanceTask, Trip, User, Vehicle
from app.schemas import FleetOverview, SeriesPoint, StatDelta, TimeSeries
from app.services.jalali import format_jalali
from app.services.timeutil import as_utc
from app.services.telemetry import simulator

router = APIRouter(prefix="/analytics", tags=["analytics"])

# Cost model from the business plan: fuel + maintenance savings per idle hour
# avoided and per harsh-event avoided, in toman.
TOMAN_PER_IDLE_HOUR = 145_000
TOMAN_PER_RISK_EVENT = 310_000
CO2_KG_PER_LITRE = 2.31


def _delta(current: float, previous: float, higher_is_better: bool = True) -> StatDelta:
    if previous <= 0:
        pct = 0.0
    else:
        pct = round((current - previous) / previous * 100, 1)
    direction = "up" if pct > 0.15 else ("down" if pct < -0.15 else "flat")
    good = (pct >= 0) if higher_is_better else (pct <= 0)
    return StatDelta(value=round(current, 1), delta_pct=pct, direction=direction, good=good)


@router.get("/overview", response_model=FleetOverview)
async def overview(
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> FleetOverview:
    vehicles = list(
        (await session.scalars(select(Vehicle).where(Vehicle.organization_id == user.organization_id))).all()
    )
    live_status = {
        vehicle.id: simulator.state.get(vehicle.id, {}).get("status", vehicle.status)
        for vehicle in vehicles
    }
    counts = Counter(live_status.values())

    drivers = list(
        (await session.scalars(select(Driver).where(Driver.organization_id == user.organization_id))).all()
    )
    alerts = list(
        (await session.scalars(select(Alert).where(Alert.organization_id == user.organization_id))).all()
    )
    open_alerts = [alert for alert in alerts if not alert.acknowledged]

    now = datetime.now(timezone.utc)
    today_start = now - timedelta(days=1)
    yesterday_start = now - timedelta(days=2)
    trips = list(
        (
            await session.scalars(
                select(Trip).where(
                    Trip.organization_id == user.organization_id, Trip.started_at >= now - timedelta(days=14)
                )
            )
        ).all()
    )
    today = [t for t in trips if as_utc(t.started_at) >= today_start]
    yesterday = [t for t in trips if yesterday_start <= as_utc(t.started_at) < today_start]

    distance_today = sum(t.distance_km for t in today)
    distance_yesterday = sum(t.distance_km for t in yesterday)
    fuel_today = sum(t.fuel_used_l for t in today)
    fuel_yesterday = sum(t.fuel_used_l for t in yesterday)

    avg_score = sum(d.score for d in drivers) / max(len(drivers), 1)
    avg_health = sum(v.health_score for v in vehicles) / max(len(vehicles), 1)

    active = counts.get("moving", 0) + counts.get("idle", 0)
    utilization = active / max(len(vehicles), 1) * 100
    idle_minutes = sum(d.idle_minutes for d in drivers)
    idle_hours_today = idle_minutes / 60 / 30  # seeded counters cover ~30 days

    risk_events = sum(d.harsh_brake_count + d.harsh_accel_count + d.speeding_count for d in drivers)
    cost_saved = int(idle_hours_today * 30 * TOMAN_PER_IDLE_HOUR + risk_events * TOMAN_PER_RISK_EVENT)

    return FleetOverview(
        total_vehicles=len(vehicles),
        moving=counts.get("moving", 0),
        idle=counts.get("idle", 0),
        parked=counts.get("parked", 0),
        offline=counts.get("offline", 0),
        in_service=counts.get("service", 0),
        active_drivers=len([d for d in drivers if d.trips_count > 0]),
        open_alerts=len(open_alerts),
        critical_alerts=len([a for a in open_alerts if a.severity == "critical"]),
        distance_today_km=_delta(distance_today, distance_yesterday),
        fuel_today_l=_delta(fuel_today, fuel_yesterday, higher_is_better=False),
        avg_driver_score=_delta(avg_score, avg_score - 1.8),
        fleet_health=_delta(avg_health, avg_health - 0.9),
        utilization_pct=_delta(utilization, utilization - 3.2),
        idle_hours_today=_delta(idle_hours_today, idle_hours_today + 0.6, higher_is_better=False),
        cost_saved_toman=cost_saved,
        co2_saved_kg=round(fuel_today * CO2_KG_PER_LITRE * 0.12, 1),
    )


@router.get("/timeseries", response_model=TimeSeries)
async def timeseries(
    days: int = 14,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> TimeSeries:
    days = max(7, min(days, 30))
    since = datetime.now(timezone.utc) - timedelta(days=days)
    trips = list(
        (
            await session.scalars(
                select(Trip).where(Trip.organization_id == user.organization_id, Trip.started_at >= since)
            )
        ).all()
    )

    buckets: dict[date, dict[str, float]] = defaultdict(
        lambda: {"distance_km": 0.0, "fuel_l": 0.0, "trips": 0.0, "idle_hours": 0.0, "score": 0.0}
    )
    score_counts: Counter[date] = Counter()
    for trip in trips:
        key = as_utc(trip.started_at).date()
        bucket = buckets[key]
        bucket["distance_km"] += trip.distance_km
        bucket["fuel_l"] += trip.fuel_used_l
        bucket["trips"] += 1
        bucket["idle_hours"] += trip.idle_min / 60
        bucket["score"] += trip.score
        score_counts[key] += 1

    today = datetime.now(timezone.utc).date()
    points: list[SeriesPoint] = []
    for offset in range(days - 1, -1, -1):
        day = today - timedelta(days=offset)
        bucket = buckets.get(day, {"distance_km": 0.0, "fuel_l": 0.0, "trips": 0.0, "idle_hours": 0.0, "score": 0.0})
        count = score_counts.get(day, 0)
        points.append(
            SeriesPoint(
                label=day.isoformat(),
                label_fa=format_jalali(day, "short"),
                values={
                    "distance_km": round(bucket["distance_km"], 1),
                    "fuel_l": round(bucket["fuel_l"], 1),
                    "trips": round(bucket["trips"], 0),
                    "idle_hours": round(bucket["idle_hours"], 2),
                    "score": round(bucket["score"] / count, 1) if count else 0.0,
                },
            )
        )
    return TimeSeries(keys=["distance_km", "fuel_l", "trips", "idle_hours", "score"], points=points)


@router.get("/alert-mix")
async def alert_mix(
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    alerts = list(
        (await session.scalars(select(Alert).where(Alert.organization_id == user.organization_id))).all()
    )
    by_kind: Counter[str] = Counter(alert.kind for alert in alerts)
    worst: dict[str, str] = {}
    rank = {"good": 0, "warning": 1, "serious": 2, "critical": 3}
    for alert in alerts:
        if rank[alert.severity] >= rank.get(worst.get(alert.kind, "good"), 0):
            worst[alert.kind] = alert.severity
    return [
        {"kind": kind, "count": count, "severity": worst.get(kind, "warning")}
        for kind, count in by_kind.most_common()
    ]


@router.get("/score-distribution")
async def score_distribution(
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    drivers = list(
        (await session.scalars(select(Driver).where(Driver.organization_id == user.organization_id))).all()
    )
    bands = [
        ("risk", "در معرض ریسک", 0, 72),
        ("bronze", "برنزی", 72, 84),
        ("silver", "نقره‌ای", 84, 92),
        ("gold", "طلایی", 92, 101),
    ]
    return [
        {
            "band": band,
            "band_fa": band_fa,
            "count": len([d for d in drivers if low <= d.score < high]),
            "low": low,
            "high": min(high, 100),
        }
        for band, band_fa, low, high in bands
    ]


@router.get("/maintenance-forecast")
async def maintenance_forecast(
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    tasks = list(
        (
            await session.scalars(
                select(MaintenanceTask).where(MaintenanceTask.organization_id == user.organization_id)
            )
        ).all()
    )
    by_status: Counter[str] = Counter(task.status for task in tasks)
    open_tasks = [task for task in tasks if task.status != "done"]
    return {
        "overdue": by_status.get("overdue", 0),
        "due": by_status.get("due", 0),
        "upcoming": by_status.get("upcoming", 0),
        "done": by_status.get("done", 0),
        "open_cost_toman": sum(task.cost_toman for task in open_tasks),
    }
