import asyncio
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.telemetry import manager, simulator

router = APIRouter(tags=["realtime"])


@router.websocket("/ws/telemetry")
async def telemetry_socket(websocket: WebSocket) -> None:
    """Push live vehicle positions. Read-only: any client frame is ignored."""
    await manager.connect(websocket)
    try:
        await websocket.send_json(
            {
                "type": "snapshot",
                "at": datetime.now(timezone.utc).isoformat(),
                "vehicles": simulator.snapshot(),
            }
        )
        while True:
            # Keeps the socket open; the simulator does the talking.
            await asyncio.wait_for(websocket.receive_text(), timeout=300)
    except (WebSocketDisconnect, asyncio.TimeoutError, RuntimeError):
        pass
    finally:
        await manager.disconnect(websocket)
