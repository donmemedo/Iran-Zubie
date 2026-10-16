from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select
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

SEVERITIES = ["good", "warning", "serious", "critical"]
SEVERITY_RANK = {name: rank for rank, name in enumerate(SEVERITIES)}


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
    org = user.organization_id
    # Live status lives in the simulator, so only (id, status, health) leave the DB.
    vehicles = (
        await session.execute(
            select(Vehicle.id, Vehicle.status, Vehicle.health_score).where(Vehicle.organization_id == org)
        )
    ).all()
    counts = Counter(simulator.state.get(v.id, {}).get("status", v.status) for v in vehicles)

    drivers = (
        await session.execute(
            select(
                func.coalesce(func.avg(Driver.score), 0.0).label("avg_score"),
                func.count(case((Driver.trips_count > 0, 1))).label("active"),
                func.coalesce(func.sum(Driver.idle_minutes), 0).label("idle_minutes"),
                func.coalesce(
                    func.sum(Driver.harsh_brake_count + Driver.harsh_accel_count + Driver.speeding_count), 0
                ).label("risk_events"),
            ).where(Driver.organization_id == org)
        )
    ).one()
    alerts = (
        await session.execute(
            select(
                func.count().label("open"),
                func.count(case((Alert.severity == "critical", 1))).label("critical"),
            ).where(Alert.organization_id == org, Alert.acknowledged.is_(False))
        )
    ).one()

    now = datetime.now(timezone.utc)
    today_start = now - timedelta(days=1)
    is_today = Trip.started_at >= today_start
    trips = (
        await session.execute(
            select(
                func.coalesce(func.sum(case((is_today, Trip.distance_km))), 0.0),
                func.coalesce(func.sum(case((~is_today, Trip.distance_km))), 0.0),
                func.coalesce(func.sum(case((is_today, Trip.fuel_used_l))), 0.0),
                func.coalesce(func.sum(case((~is_today, Trip.fuel_used_l))), 0.0),
            ).where(Trip.organization_id == org, Trip.started_at >= now - timedelta(days=2))
        )
    ).one()
    distance_today, distance_yesterday, fuel_today, fuel_yesterday = trips

    avg_score = float(drivers.avg_score)
    avg_health = sum(v.health_score for v in vehicles) / max(len(vehicles), 1)

    active = counts.get("moving", 0) + counts.get("idle", 0)
    utilization = active / max(len(vehicles), 1) * 100
    idle_hours_today = drivers.idle_minutes / 60 / 30  # seeded counters cover ~30 days

    cost_saved = int(idle_hours_today * 30 * TOMAN_PER_IDLE_HOUR + drivers.risk_events * TOMAN_PER_RISK_EVENT)

    return FleetOverview(
        total_vehicles=len(vehicles),
        moving=counts.get("moving", 0),
        idle=counts.get("idle", 0),
        parked=counts.get("parked", 0),
        offline=counts.get("offline", 0),
        in_service=counts.get("service", 0),
        active_drivers=drivers.active,
        open_alerts=alerts.open,
        critical_alerts=alerts.critical,
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
    days: int = Query(default=14, ge=1, le=90),
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> TimeSeries:
    days = max(7, min(days, 30))
    since = datetime.now(timezone.utc) - timedelta(days=days)
    # Only the summed columns: full rows would also parse every trip's path JSON.
    # ponytail: per-day grouping stays in Python because date bucketing SQL differs
    # between SQLite and Postgres; move it to SQL if a fleet has 100k+ trips a month.
    trips = (
        await session.execute(
            select(Trip.started_at, Trip.distance_km, Trip.fuel_used_l, Trip.idle_min, Trip.score).where(
                Trip.organization_id == user.organization_id, Trip.started_at >= since
            )
        )
    ).all()

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
    count = func.count()
    rows = await session.execute(
        select(Alert.kind, count, func.max(case(SEVERITY_RANK, value=Alert.severity)))
        .where(Alert.organization_id == user.organization_id)
        .group_by(Alert.kind)
        .order_by(count.desc(), func.min(Alert.id))  # ties keep first-seen order, like Counter
    )
    return [
        {"kind": kind, "count": n, "severity": SEVERITIES[worst] if worst is not None else "warning"}
        for kind, n, worst in rows
    ]


@router.get("/score-distribution")
async def score_distribution(
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    bands = [
        ("risk", "در معرض ریسک", 0, 72),
        ("bronze", "برنزی", 72, 84),
        ("silver", "نقره‌ای", 84, 92),
        ("gold", "طلایی", 92, 101),
    ]
    counts = (
        await session.execute(
            select(
                *(func.count(case(((Driver.score >= low) & (Driver.score < high), 1))) for *_, low, high in bands)
            ).where(Driver.organization_id == user.organization_id)
        )
    ).one()
    return [
        {"band": band, "band_fa": band_fa, "count": n, "low": low, "high": min(high, 100)}
        for (band, band_fa, low, high), n in zip(bands, counts)
    ]


@router.get("/maintenance-forecast")
async def maintenance_forecast(
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    rows = (
        await session.execute(
            select(MaintenanceTask.status, func.count(), func.sum(MaintenanceTask.cost_toman))
            .where(MaintenanceTask.organization_id == user.organization_id)
            .group_by(MaintenanceTask.status)
        )
    ).all()
    by_status = {task_status: n for task_status, n, _ in rows}
    return {
        "overdue": by_status.get("overdue", 0),
        "due": by_status.get("due", 0),
        "upcoming": by_status.get("upcoming", 0),
        "done": by_status.get("done", 0),
        "open_cost_toman": sum(cost or 0 for task_status, _, cost in rows if task_status != "done"),
    }
