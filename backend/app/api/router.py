from fastapi import APIRouter

from app.api import analytics, auth, fleet, public, ws

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(fleet.router)
api_router.include_router(analytics.router)
api_router.include_router(public.router)
api_router.include_router(ws.router)
