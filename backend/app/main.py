import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from starlette.middleware.gzip import GZipMiddleware

from app.api.router import api_router
from app.core.audit import request_id as request_id_var
from app.core.config import settings
from app.db.base import Base
from app.db.seed import seed_database
from app.db.session import SessionLocal, engine

# Imported for their side effect of registering tables on Base.metadata.
from app.models import entities  # noqa: F401
from app.services.telemetry import simulator

# No-op when the operator already configured logging; otherwise makes zubie.* loggers print.
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
access_log = logging.getLogger("zubie.access")
error_log = logging.getLogger("zubie.error")

AUTH_PREFIX = f"{settings.api_prefix}/auth"
SECURITY_HEADERS = [
    (b"x-content-type-options", b"nosniff"),
    (b"referrer-policy", b"no-referrer"),
    (b"x-frame-options", b"DENY"),
    (b"cross-origin-opener-policy", b"same-origin"),
]
if settings.is_production:
    SECURITY_HEADERS.append((b"strict-transport-security", b"max-age=63072000; includeSubDomains"))


class EdgeMiddleware:
    """Request id, body cap, security headers, generic 500 and one access-log line.

    Pure ASGI: no BaseHTTPMiddleware task or body re-streaming per request.
    """

    def __init__(self, app) -> None:
        self.app = app

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start = time.perf_counter()
        request_id = uuid.uuid4().hex
        request_id_var.set(request_id)
        scope.setdefault("state", {})["request_id"] = request_id
        is_api = scope["path"].startswith(settings.api_prefix)
        limit = settings.max_body_bytes
        status_code, started, received = 500, False, 0

        async def capped_receive():
            nonlocal received
            message = await receive()
            received += len(message.get("body", b""))
            if received > limit:
                # FastAPI re-raises HTTPException from body parsing, so this renders as a 413.
                raise HTTPException(status_code=413, detail="Request body too large")
            return message

        async def send_with_headers(message) -> None:
            nonlocal status_code, started
            if message["type"] == "http.response.start":
                started, status_code = True, message["status"]
                headers = [*message.get("headers", ()), *SECURITY_HEADERS, (b"x-request-id", request_id.encode())]
                if is_api and not any(key.lower() == b"cache-control" for key, _ in headers):
                    headers.append((b"cache-control", b"no-store"))
                message["headers"] = headers
            await send(message)

        try:
            declared = next((value for key, value in scope["headers"] if key == b"content-length"), b"0")
            if declared.isdigit() and int(declared) > limit:
                response = JSONResponse({"detail": "Request body too large"}, status_code=413)
                await response(scope, receive, send_with_headers)
            else:
                await self.app(scope, capped_receive, send_with_headers)
        except Exception:
            error_log.exception("unhandled error rid=%s", request_id)
            if started:
                raise
            response = JSONResponse({"detail": "Internal server error", "request_id": request_id}, status_code=500)
            await response(scope, receive, send_with_headers)
        finally:
            client = scope.get("client")
            access_log.info(
                "method=%s path=%s status=%d ms=%.1f ip=%s rid=%s",
                scope["method"],
                # raw_path keeps %0a encoded, so a crafted URL cannot forge log lines.
                (scope.get("raw_path") or scope["path"].encode()).decode("latin-1"),
                status_code,
                (time.perf_counter() - start) * 1000,
                client[0] if client else "-",
                request_id,
            )


class SelectiveGZip(GZipMiddleware):
    """Never compress /api/auth: tokens must not share a compression context with input (BREACH)."""

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] == "http" and scope["path"].startswith(AUTH_PREFIX):
            await self.app(scope, receive, send)
            return
        await super().__call__(scope, receive, send)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    if settings.should_seed:
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
    # None also removes /docs and /redoc, which FastAPI only mounts when the schema exists.
    openapi_url="/openapi.json" if settings.show_docs else None,
)

# add_middleware wraps outward: CORS is outermost so 413/500 from the edge still carry CORS headers.
app.add_middleware(SelectiveGZip, minimum_size=1024, compresslevel=6)
app.add_middleware(EdgeMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,  # empty list = no cross-origin access
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/health", tags=["meta"])
async def health() -> dict:
    """Liveness: the process is up. Says nothing about tenants or infrastructure."""
    return {"status": "ok"}


@app.get("/health/ready", tags=["meta"])
async def ready() -> JSONResponse:
    """Readiness: the database answers. Orchestrators route traffic only when this is 200."""
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
    except Exception:  # noqa: BLE001 - any failure means "not ready"; details stay in the log
        error_log.exception("readiness check failed")
        return JSONResponse({"status": "unavailable"}, status_code=503)
    return JSONResponse({"status": "ready"})
