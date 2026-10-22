"""Unauthenticated endpoints that back the marketing site."""

import json

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.ratelimit import rate_limit
from app.db.session import get_session
from app.models import Lead
from app.schemas import LeadCreate

router = APIRouter(prefix="/public", tags=["public"])

# Tiers and pricing come straight from the Zubie Iran business plan.
PLANS = [
    {
        "id": "basic",
        "name": "Basic",
        "name_fa": "پایه",
        "price_toman": 390_000,
        "unit": "per vehicle / month",
        "unit_fa": "برای هر خودرو در ماه",
        "audience": "Small fleets, 5-25 vehicles",
        "audience_fa": "ناوگان کوچک، ۵ تا ۲۵ خودرو",
        "features": [
            "Live GPS tracking & route history",
            "Stop, speed and mileage reports",
            "Geofencing with enter/exit alerts",
            "Persian dashboard & mobile app",
        ],
        "features_fa": [
            "ردیابی زنده و تاریخچه مسیر",
            "گزارش توقف، سرعت و پیمایش",
            "محدوده جغرافیایی با هشدار ورود و خروج",
            "پیش‌خوان فارسی و اپلیکیشن موبایل",
        ],
    },
    {
        "id": "pro",
        "name": "Pro",
        "name_fa": "حرفه‌ای",
        "price_toman": 690_000,
        "unit": "per vehicle / month",
        "unit_fa": "برای هر خودرو در ماه",
        "audience": "Distribution & logistics, 25-150 vehicles",
        "audience_fa": "پخش و لجستیک، ۲۵ تا ۱۵۰ خودرو",
        "popular": True,
        "features": [
            "Everything in Basic",
            "OBD/CAN vehicle-health alerts",
            "Predictive maintenance scheduling",
            "Gamified driver scoring & leaderboard",
            "Monthly management reports",
        ],
        "features_fa": [
            "همه امکانات پایه",
            "هشدار سلامت خودرو با OBD/CAN",
            "برنامه‌ریزی نگهداری پیشگیرانه",
            "امتیازدهی بازی‌وار راننده و جدول رتبه‌بندی",
            "گزارش مدیریتی ماهانه",
        ],
    },
    {
        "id": "enterprise",
        "name": "Enterprise",
        "name_fa": "سازمانی",
        "price_toman": 0,
        "unit": "custom contract",
        "unit_fa": "قرارداد اختصاصی",
        "audience": "150+ vehicles, multi-city operations",
        "audience_fa": "بیش از ۱۵۰ خودرو، عملیات چندشهری",
        "features": [
            "Everything in Pro",
            "REST API for ERP, insurance & leasing",
            "Custom reports and data exports",
            "Guaranteed SLA and dedicated support",
            "On-site installation across provinces",
        ],
        "features_fa": [
            "همه امکانات حرفه‌ای",
            "API برای ERP، بیمه و لیزینگ",
            "گزارش‌های سفارشی و برون‌بری داده",
            "SLA تضمین‌شده و پشتیبانی اختصاصی",
            "نصب در محل در سراسر استان‌ها",
        ],
    },
]


# Static, so serialise once at import and let browsers and proxies cache it.
_PLANS_JSON = json.dumps(PLANS, ensure_ascii=False, separators=(",", ":")).encode()


@router.get("/plans")
async def plans() -> Response:
    return Response(
        _PLANS_JSON, media_type="application/json", headers={"Cache-Control": "public, max-age=3600"}
    )


@router.post(
    "/leads",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit("leads", limit=5, window_seconds=3600))],
)
async def create_lead(payload: LeadCreate, session: AsyncSession = Depends(get_session)) -> dict:
    lead = Lead(**payload.model_dump())
    session.add(lead)
    await session.commit()
    return {"ok": True, "id": lead.id}
