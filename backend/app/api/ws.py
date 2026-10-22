import asyncio
import contextlib
import logging
import time
from datetime import UTC, datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status

from app.api.deps import user_from_token
from app.core.config import settings
from app.core.security import token_claims
from app.db.session import SessionLocal
from app.services.telemetry import encode, manager, simulator

router = APIRouter(tags=["realtime"])
log = logging.getLogger("zubie.ws")

SUBPROTOCOL = "zubie.v1"
BEARER = "bearer."
# The client never needs to talk; its frames only count as liveness. Dead peers are also
# reaped by the server's protocol-level ping, so this just bounds silent sockets.
IDLE_SECONDS = 300


@router.websocket("/ws/telemetry")
async def telemetry_socket(websocket: WebSocket) -> None:
    """Push the caller's organization's live vehicle positions. Read-only.

    Browsers cannot set headers on a WebSocket, so the token travels as a
    subprotocol: new WebSocket(url, ["zubie.v1", "bearer." + token]).
    """
    origin = websocket.headers.get("origin")
    token = next((p[len(BEARER):] for p in websocket.scope.get("subprotocols", ()) if p.startswith(BEARER)), None)
    claims = token_claims(token) if token and (origin is None or origin in settings.cors_origin_list) else None
    user = None
    if claims:
        # Short-lived session: never hold a pooled DB connection for the socket's lifetime.
        async with SessionLocal() as session:
            user = await user_from_token(token, session)
    if user is None or claims is None:
        log.warning("ws refused reason=auth origin=%r ip=%s", origin, websocket.client.host if websocket.client else "-")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    if not manager.reserve(websocket, user.organization_id, user.id):
        log.warning("ws refused reason=capacity user=%s", user.id)
        await websocket.close(code=status.WS_1013_TRY_AGAIN_LATER)
        return

    expires_at = float(claims["exp"])
    try:
        await websocket.accept(subprotocol=SUBPROTOCOL)
        await websocket.send_text(
            encode(
                {
                    "type": "snapshot",
                    "at": datetime.now(UTC).isoformat(),
                    "vehicles": simulator.snapshot(user.organization_id),
                }
            )
        )
        while True:
            # Client frames are discarded unread; they only reset the idle timer.
            message = await asyncio.wait_for(
                websocket.receive(), timeout=min(IDLE_SECONDS, expires_at - time.time())
            )
            if message["type"] == "websocket.disconnect":
                return
    except TimeoutError:
        expired = time.time() >= expires_at
        with contextlib.suppress(Exception):  # the broadcaster may already have closed it
            await websocket.close(
                code=status.WS_1008_POLICY_VIOLATION if expired else status.WS_1000_NORMAL_CLOSURE,
                reason="token expired" if expired else "idle",
            )
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        manager.release(websocket)
