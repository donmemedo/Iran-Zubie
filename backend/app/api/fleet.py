from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import current_user
from app.db.session import get_session
from app.models import Alert, DiagnosticCode, Driver, Geofence, MaintenanceTask, Trip, User, Vehicle
from app.schemas import (
    AlertOut,
    DiagnosticOut,
    DriverOut,
    GeofenceCreate,
    GeofenceOut,
    MaintenanceOut,
    TripOut,
    VehicleOut,
)
from app.services.telemetry import simulator

router = APIRouter(tags=["fleet"])


def _merge_live(vehicle: Vehicle) -> Vehicle:
    """Overlay the simulator's in-memory position on the persisted row."""
    live = simulator.state.get(vehicle.id)
    if not live:
        return vehicle
    for field in (
        "lat", "lng", "heading", "speed_kmh", "status",
        "fuel_percent", "odometer_km", "engine_rpm", "coolant_c", "battery_volt",
    ):
        setattr(vehicle, field, live[field])
    return vehicle


@router.get("/vehicles", response_model=list[VehicleOut])
async def list_vehicles(
    vehicle_status: str | None = Query(default=None, alias="status"),
    search: str | None = None,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> list[Vehicle]:
    stmt = (
        select(Vehicle)
        .options(selectinload(Vehicle.driver))
        .where(Vehicle.organization_id == user.organization_id)
        .order_by(Vehicle.id)
    )
    vehicles = list((await session.scalars(stmt)).all())
    vehicles = [_merge_live(vehicle) for vehicle in vehicles]

    if vehicle_status and vehicle_status != "all":
        vehicles = [v for v in vehicles if v.status == vehicle_status]
    if search:
        needle = search.strip().lower()
        vehicles = [
            v for v in vehicles
            if needle in v.name.lower()
            or needle in v.name_fa
            or needle in v.plate
            or needle in v.plate_en.lower()
            or needle in (v.driver.full_name_fa if v.driver else "")
            or needle in (v.driver.full_name.lower() if v.driver else "")
        ]
    return vehicles


@router.get("/vehicles/{vehicle_id}", response_model=VehicleOut)
async def get_vehicle(
    vehicle_id: int,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> Vehicle:
    vehicle = await session.scalar(
        select(Vehicle)
        .options(selectinload(Vehicle.driver))
        .where(Vehicle.id == vehicle_id, Vehicle.organization_id == user.organization_id)
    )
    if vehicle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    return _merge_live(vehicle)


@router.get("/vehicles/{vehicle_id}/trips", response_model=list[TripOut])
async def vehicle_trips(
    vehicle_id: int,
    limit: int = 12,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> list[Trip]:
    stmt = (
        select(Trip)
        .where(Trip.vehicle_id == vehicle_id, Trip.organization_id == user.organization_id)
        .order_by(Trip.started_at.desc())
        .limit(limit)
    )
    return list((await session.scalars(stmt)).all())


@router.get("/vehicles/{vehicle_id}/diagnostics", response_model=list[DiagnosticOut])
async def vehicle_diagnostics(
    vehicle_id: int,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> list[DiagnosticCode]:
    stmt = (
        select(DiagnosticCode)
        .where(DiagnosticCode.vehicle_id == vehicle_id)
        .order_by(DiagnosticCode.detected_at.desc())
    )
    return list((await session.scalars(stmt)).all())


@router.get("/drivers", response_model=list[DriverOut])
async def list_drivers(
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> list[Driver]:
    stmt = (
        select(Driver)
        .where(Driver.organization_id == user.organization_id)
        .order_by(Driver.score.desc())
    )
    return list((await session.scalars(stmt)).all())


@router.get("/drivers/{driver_id}", response_model=DriverOut)
async def get_driver(
    driver_id: int,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> Driver:
    driver = await session.scalar(
        select(Driver).where(Driver.id == driver_id, Driver.organization_id == user.organization_id)
    )
    if driver is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver not found")
    return driver


@router.get("/trips", response_model=list[TripOut])
async def list_trips(
    limit: int = 40,
    days: int = 30,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> list[Trip]:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    stmt = (
        select(Trip)
        .where(Trip.organization_id == user.organization_id, Trip.started_at >= since)
        .order_by(Trip.started_at.desc())
        .limit(limit)
    )
    return list((await session.scalars(stmt)).all())


@router.get("/alerts", response_model=list[AlertOut])
async def list_alerts(
    only_open: bool = False,
    severity: str | None = None,
    limit: int = 50,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> list[Alert]:
    stmt = select(Alert).where(Alert.organization_id == user.organization_id)
    if only_open:
        stmt = stmt.where(Alert.acknowledged.is_(False))
    if severity and severity != "all":
        stmt = stmt.where(Alert.severity == severity)
    stmt = stmt.order_by(Alert.occurred_at.desc()).limit(limit)
    return list((await session.scalars(stmt)).all())


@router.post("/alerts/{alert_id}/acknowledge", response_model=AlertOut)
async def acknowledge_alert(
    alert_id: int,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> Alert:
    alert = await session.scalar(
        select(Alert).where(Alert.id == alert_id, Alert.organization_id == user.organization_id)
    )
    if alert is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    alert.acknowledged = True
    await session.commit()
    await session.refresh(alert)
    return alert


@router.get("/geofences", response_model=list[GeofenceOut])
async def list_geofences(
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> list[Geofence]:
    stmt = select(Geofence).where(Geofence.organization_id == user.organization_id).order_by(Geofence.id)
    return list((await session.scalars(stmt)).all())


@router.post("/geofences", response_model=GeofenceOut, status_code=status.HTTP_201_CREATED)
async def create_geofence(
    payload: GeofenceCreate,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> Geofence:
    fence = Geofence(
        organization_id=user.organization_id,
        name=payload.name,
        name_fa=payload.name_fa or payload.name,
        kind=payload.kind,
        lat=payload.lat,
        lng=payload.lng,
        radius_m=payload.radius_m,
        alert_on_enter=payload.alert_on_enter,
        alert_on_exit=payload.alert_on_exit,
    )
    session.add(fence)
    await session.commit()
    await session.refresh(fence)
    return fence


@router.delete("/geofences/{fence_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_geofence(
    fence_id: int,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    fence = await session.scalar(
        select(Geofence).where(Geofence.id == fence_id, Geofence.organization_id == user.organization_id)
    )
    if fence is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Geofence not found")
    await session.delete(fence)
    await session.commit()


@router.get("/maintenance", response_model=list[MaintenanceOut])
async def list_maintenance(
    task_status: str | None = Query(default=None, alias="status"),
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> list[MaintenanceTask]:
    stmt = select(MaintenanceTask).where(MaintenanceTask.organization_id == user.organization_id)
    if task_status and task_status != "all":
        stmt = stmt.where(MaintenanceTask.status == task_status)
    stmt = stmt.order_by(MaintenanceTask.due_date.asc().nulls_last())
    return list((await session.scalars(stmt)).all())


@router.post("/maintenance/{task_id}/complete", response_model=MaintenanceOut)
async def complete_maintenance(
    task_id: int,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> MaintenanceTask:
    task = await session.scalar(
        select(MaintenanceTask).where(
            MaintenanceTask.id == task_id, MaintenanceTask.organization_id == user.organization_id
        )
    )
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    task.status = "done"
    await session.commit()
    await session.refresh(task)
    return task

