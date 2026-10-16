"""In-memory telemetry simulator.

A real deployment would consume MQTT frames from the Zubie OBD key. For the
demo we advance every vehicle on a short tick, keep the authoritative state in
memory, push each organization only its own vehicles over the websocket, and
flush changed rows to the database every few ticks so a page reload shows a
coherent fleet.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import math
import random
from collections import Counter
from datetime import datetime, timezone

from sqlalchemy import select, update
from starlette.websockets import WebSocket

from app.core.config import settings
from app.db.session import SessionLocal
from app.models import Vehicle

RNG = random.Random(7)

# Rough Tehran metro bounding box — vehicles bounce back inside when they leave.
BOUNDS = (35.44, 35.90, 50.90, 51.75)

MAX_SOCKETS_PER_USER = 10
# Columns the simulator mutates; last_seen is parsed separately because state keeps it as ISO text.
FLUSH_FIELDS = (
    "lat", "lng", "heading", "speed_kmh", "status", "fuel_percent",
    "odometer_km", "engine_rpm", "coolant_c", "battery_volt",
)


def encode(frame: dict) -> str:
    """Serialize a frame once per organization per tick; compact separators trim every frame."""
    return json.dumps(frame, separators=(",", ":"))


class ConnectionManager:
    """Live sockets grouped by organization.

    Slots are reserved before accept() and every mutation is synchronous, so the
    single event loop makes the caps race-free without a lock.
    """

    def __init__(self) -> None:
        self._orgs: dict[int, set[WebSocket]] = {}
        self._owner: dict[WebSocket, tuple[int, int]] = {}
        self._per_user: Counter[int] = Counter()

    def reserve(self, websocket: WebSocket, org_id: int, user_id: int) -> bool:
        if len(self._owner) >= settings.max_ws_connections or self._per_user[user_id] >= MAX_SOCKETS_PER_USER:
            return False
        self._owner[websocket] = (org_id, user_id)
        self._orgs.setdefault(org_id, set()).add(websocket)
        self._per_user[user_id] += 1
        return True

    def release(self, websocket: WebSocket) -> None:
        """Idempotent: the broadcaster and the socket handler may both release."""
        owner = self._owner.pop(websocket, None)
        if owner is None:
            return
        org_id, user_id = owner
        sockets = self._orgs[org_id]
        sockets.discard(websocket)
        if not sockets:
            del self._orgs[org_id]
        self._per_user[user_id] -= 1
        if self._per_user[user_id] <= 0:
            del self._per_user[user_id]

    @property
    def org_ids(self) -> list[int]:
        return list(self._orgs)

    async def broadcast(self, frames: dict[int, str]) -> None:
        """frames maps org id -> already-encoded text; each org only ever gets its own frame."""
        targets = [(ws, text) for org_id, text in frames.items() for ws in self._orgs.get(org_id, ())]
        # Concurrent with a per-send timeout, so one slow client cannot stall every tenant's tick.
        await asyncio.gather(*(self._send(ws, text) for ws, text in targets))

    async def _send(self, websocket: WebSocket, text: str) -> None:
        try:
            await asyncio.wait_for(websocket.send_text(text), settings.telemetry_interval)
        except Exception:  # noqa: BLE001 - a dropped or stalled client must not kill the tick
            self.release(websocket)
            with contextlib.suppress(Exception):
                await asyncio.wait_for(websocket.close(code=1011), 1)


manager = ConnectionManager()


class TelemetrySimulator:
    def __init__(self) -> None:
        self.state: dict[int, dict] = {}
        # org id -> the same item dicts as `state`, so a tick needs no per-vehicle lookup.
        self.by_org: dict[int, list[dict]] = {}
        self._dirty: set[int] = set()
        self._task: asyncio.Task | None = None
        self._tick = 0

    async def load(self) -> None:
        async with SessionLocal() as session:
            vehicles = (await session.scalars(select(Vehicle))).all()
        self.state, self.by_org = {}, {}
        for vehicle in vehicles:
            item = {
                "id": vehicle.id,
                "lat": vehicle.lat,
                "lng": vehicle.lng,
                "heading": vehicle.heading,
                "speed_kmh": vehicle.speed_kmh,
                "status": vehicle.status,
                "fuel_percent": vehicle.fuel_percent,
                "odometer_km": vehicle.odometer_km,
                "engine_rpm": vehicle.engine_rpm,
                "coolant_c": vehicle.coolant_c,
                "battery_volt": vehicle.battery_volt,
                "health_score": vehicle.health_score,
                "last_seen": vehicle.last_seen.isoformat() if vehicle.last_seen else None,
            }
            self.state[vehicle.id] = item
            self.by_org.setdefault(vehicle.organization_id, []).append(item)

    def snapshot(self, org_id: int) -> list[dict]:
        return self.by_org.get(org_id, [])

    def _advance(self, item: dict) -> None:
        status = item["status"]

        # Occasionally change what a vehicle is doing, so the fleet feels alive.
        if RNG.random() < 0.02:
            if status == "moving":
                status = RNG.choice(["idle", "parked", "moving"])
            elif status in {"idle", "parked"}:
                status = RNG.choice(["moving", "moving", status])
            item["status"] = status

        if status == "offline":
            return
        self._dirty.add(item["id"])

        if status == "moving":
            item["heading"] = (item["heading"] + RNG.uniform(-14, 14)) % 360
            item["speed_kmh"] = max(12.0, min(118.0, item["speed_kmh"] + RNG.uniform(-7, 7)))
            # km travelled this tick -> degrees
            km = item["speed_kmh"] * (settings.telemetry_interval / 3600.0) * 26
            rad = math.radians(item["heading"])
            item["lat"] += (km / 111.0) * math.cos(rad)
            item["lng"] += (km / (111.0 * math.cos(math.radians(item["lat"])))) * math.sin(rad)
            item["odometer_km"] = round(item["odometer_km"] + km, 2)
            item["fuel_percent"] = max(4.0, round(item["fuel_percent"] - km * 0.02, 2))
            item["engine_rpm"] = round(900 + item["speed_kmh"] * RNG.uniform(22, 30), 0)
            item["coolant_c"] = round(min(108.0, max(76.0, item["coolant_c"] + RNG.uniform(-1.4, 1.6))), 1)
        elif status == "idle":
            item["speed_kmh"] = round(max(0.0, RNG.uniform(0, 5)), 1)
            item["engine_rpm"] = round(RNG.uniform(700, 950), 0)
            item["fuel_percent"] = max(4.0, round(item["fuel_percent"] - 0.01, 2))
        else:  # parked | service
            item["speed_kmh"] = 0.0
            item["engine_rpm"] = 0.0
            item["coolant_c"] = round(max(24.0, item["coolant_c"] - 0.8), 1)

        lat_min, lat_max, lng_min, lng_max = BOUNDS
        if not (lat_min < item["lat"] < lat_max) or not (lng_min < item["lng"] < lng_max):
            item["lat"] = min(max(item["lat"], lat_min + 0.01), lat_max - 0.01)
            item["lng"] = min(max(item["lng"], lng_min + 0.01), lng_max - 0.01)
            item["heading"] = (item["heading"] + 180) % 360

        item["lat"] = round(item["lat"], 6)
        item["lng"] = round(item["lng"], 6)
        item["battery_volt"] = round(min(14.4, max(11.4, item["battery_volt"] + RNG.uniform(-0.05, 0.05))), 2)
        item["last_seen"] = datetime.now(timezone.utc).isoformat()

    async def _flush(self) -> None:
        """One executemany UPDATE for the rows that changed since the last flush."""
        if not self._dirty:
            return
        ids, self._dirty = self._dirty, set()
        rows = []
        for vehicle_id in ids:
            item = self.state[vehicle_id]
            row = {field: item[field] for field in FLUSH_FIELDS}
            row["id"] = vehicle_id
            row["last_seen"] = datetime.fromisoformat(item["last_seen"])
            rows.append(row)
        try:
            async with SessionLocal() as session:
                await session.execute(update(Vehicle), rows)
                await session.commit()
        except Exception:
            self._dirty |= ids  # retry these rows on the next flush instead of losing them
            raise

    async def _run(self) -> None:
        while True:
            try:
                await asyncio.sleep(settings.telemetry_interval)
                self._tick += 1
                for item in self.state.values():
                    self._advance(item)
                org_ids = manager.org_ids
                if org_ids:
                    at = datetime.now(timezone.utc).isoformat()
                    frames = {
                        org_id: encode(
                            {"type": "telemetry", "tick": self._tick, "at": at, "vehicles": self.by_org[org_id]}
                        )
                        for org_id in org_ids
                        if self.by_org.get(org_id)
                    }
                    await manager.broadcast(frames)
                if self._tick % 15 == 0:
                    await self._flush()
            except asyncio.CancelledError:
                raise
            except Exception:  # noqa: BLE001 - never let one bad tick stop the loop
                await asyncio.sleep(1)

    async def start(self) -> None:
        await self.load()
        if self._task is None:
            self._task = asyncio.create_task(self._run())

    async def stop(self) -> None:
        if self._task is not None:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
            self._task = None


simulator = TelemetrySimulator()
