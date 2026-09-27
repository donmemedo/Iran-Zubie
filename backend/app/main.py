from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.db.base import Base
from app.db.seed import seed_database
from app.db.session import SessionLocal, engine
from app.services.telemetry import simulator

# Imported for their side effect of registering tables on Base.metadata.
from app.models import entities  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    async with SessionLocal() as session:
        await seed_database(session)
    await simulator.start()
    try:
        yield
    finally:
        await simulator.stop()
        await engine.dispose()


app = FastAPI(
    title=settings.project_name,
    version="1.0.0",
    description=(
        "Connected-car and fleet telematics API for Zubie Iran: live tracking, "
        "vehicle health, driver scoring, geofencing and maintenance."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/health", tags=["meta"])
async def health() -> dict:
    return {"status": "ok", "vehicles_tracked": len(simulator.state)}
