"""Deterministic demo data for the Zubie Iran fleet.

Seeded from a fixed RNG so screenshots, charts and the driver leaderboard stay
stable between restarts. Everything is Tehran/Karaj-centred because that is the
first phase target market in the business plan.
"""

from __future__ import annotations

import math
import random
from datetime import date, datetime, time as clock_time, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models import (
    Alert,
    DiagnosticCode,
    Driver,
    Geofence,
    MaintenanceTask,
    Organization,
    Trip,
    User,
    Vehicle,
)

RNG = random.Random(1405)

TEHRAN = (35.6892, 51.3890)

# (fa, en) landmark anchors used as trip endpoints and vehicle home points.
PLACES: list[tuple[str, str, float, float]] = [
    ("انبار مرکزی شهرری", "Shahr-e Rey Central Depot", 35.5906, 51.4386),
    ("بازار بزرگ تهران", "Tehran Grand Bazaar", 35.6725, 51.4215),
    ("میدان آزادی", "Azadi Square", 35.6997, 51.3380),
    ("شهرک صنعتی چهاردانگه", "Chahardangeh Industrial Zone", 35.6089, 51.3062),
    ("پایانه غرب", "West Terminal", 35.7089, 51.3239),
    ("بیمارستان میلاد", "Milad Hospital", 35.7255, 51.3752),
    ("میدان ونک", "Vanak Square", 35.7573, 51.4100),
    ("فرودگاه مهرآباد", "Mehrabad Airport", 35.6892, 51.3134),
    ("کرج ـ عظیمیه", "Karaj Azimiyeh", 35.8355, 50.9915),
    ("شهرک صنعتی اشتهارد", "Eshtehard Industrial Park", 35.7239, 50.3672),
    ("ورامین", "Varamin", 35.3242, 51.6462),
    ("اسلامشهر", "Eslamshahr", 35.5522, 51.2300),
    ("پردیس", "Pardis", 35.7412, 51.8180),
    ("میدان تجریش", "Tajrish Square", 35.8020, 51.4336),
    ("انبار پخش شرق", "East Distribution Hub", 35.7010, 51.5290),
]

DRIVER_NAMES: list[tuple[str, str]] = [
    ("رضا موسوی", "Reza Mousavi"),
    ("سمیرا کاظمی", "Samira Kazemi"),
    ("امیر رستگار", "Amir Rastegar"),
    ("مهدی شریفی", "Mehdi Sharifi"),
    ("نگار احمدی", "Negar Ahmadi"),
    ("حسین قنبری", "Hossein Ghanbari"),
    ("فاطمه نوری", "Fatemeh Nouri"),
    ("علی صادقی", "Ali Sadeghi"),
    ("مریم جعفری", "Maryam Jafari"),
    ("بهروز کریمی", "Behrooz Karimi"),
    ("سعید بهرامی", "Saeed Bahrami"),
    ("زهرا مرادی", "Zahra Moradi"),
    ("یاسر عبدی", "Yaser Abdi"),
    ("پویا اسدی", "Pouya Asadi"),
    ("الهام رحیمی", "Elham Rahimi"),
    ("کاوه نجفی", "Kaveh Najafi"),
    ("شیما ملکی", "Shima Maleki"),
    ("جواد فتحی", "Javad Fathi"),
]

# (make, model_en, model_fa, type)
MODELS: list[tuple[str, str, str, str]] = [
    ("Iran Khodro", "Peugeot 405", "پژو ۴۰۵", "sedan"),
    ("Iran Khodro", "Samand LX", "سمند ال‌ایکس", "sedan"),
    ("Iran Khodro", "Dena Plus", "دنا پلاس", "sedan"),
    ("Saipa", "Pride 151", "پراید ۱۵۱ وانت", "pickup"),
    ("Saipa", "Shahin", "شاهین", "sedan"),
    ("Saipa", "Arisan", "آریسان", "pickup"),
    ("Bahman", "Vanet Kara", "وانت کارا", "pickup"),
    ("Iveco", "Daily 35", "ایویکو دیلی ۳۵", "van"),
    ("Isuzu", "NPR 75", "ایسوزو ۷۵", "truck"),
    ("Hyundai", "H100", "هیوندای اچ‌۱۰۰", "van"),
    ("Foton", "Aumark", "فوتون آمارک", "truck"),
]

PLATE_LETTERS = ["ب", "ج", "د", "س", "ص", "ط", "ق", "ل", "م", "ن", "و", "ه", "ی"]
FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹"

DTC_LIBRARY: list[tuple[str, str, str, str]] = [
    ("P0301", "Cylinder 1 misfire detected", "نقص احتراق در سیلندر ۱", "serious"),
    ("P0420", "Catalyst system efficiency below threshold", "افت بازده کاتالیست", "warning"),
    ("P0171", "System too lean (bank 1)", "مخلوط سوخت رقیق است", "warning"),
    ("P0128", "Coolant thermostat below regulating temperature", "ترموستات خنک‌کننده نادرست", "warning"),
    ("P0562", "System voltage low", "ولتاژ برق خودرو پایین است", "serious"),
    ("C1234", "Wheel speed sensor circuit", "خطای سنسور سرعت چرخ", "warning"),
    ("P0442", "Evaporative emission leak (small)", "نشت کوچک در سامانه بخار سوخت", "good"),
]

MAINTENANCE_LIBRARY: list[tuple[str, str, str]] = [
    ("oil", "Engine oil & filter change", "تعویض روغن و فیلتر موتور"),
    ("brake", "Brake pad inspection", "بازبینی لنت ترمز"),
    ("tire", "Tire rotation & balance", "جابه‌جایی و بالانس لاستیک"),
    ("filter", "Cabin & air filter replacement", "تعویض فیلتر هوا و کابین"),
    ("timing_belt", "Timing belt replacement", "تعویض تسمه تایم"),
    ("inspection", "Annual technical inspection", "معاینه فنی سالانه"),
]


def _fa_number(value: int) -> str:
    return "".join(FA_DIGITS[int(ch)] for ch in str(value))


def _make_plate() -> tuple[str, str]:
    two = RNG.randint(10, 99)
    three = RNG.randint(100, 999)
    letter = RNG.choice(PLATE_LETTERS)
    region = RNG.choice([10, 11, 22, 33, 40, 44, 55, 66, 68, 77, 78, 88, 99])
    fa = f"{_fa_number(two)} {letter} {_fa_number(three)} ایران {_fa_number(region)}"
    en = f"{two}{letter}{three}-IR{region}"
    return fa, en


def _walk(start: tuple[float, float], end: tuple[float, float], steps: int) -> list[list[float]]:
    """A jittered great-circle-ish path so drawn routes do not look like rulers."""
    path: list[list[float]] = []
    for i in range(steps + 1):
        t = i / steps
        lat = start[0] + (end[0] - start[0]) * t
        lng = start[1] + (end[1] - start[1]) * t
        wiggle = math.sin(t * math.pi) * 0.012
        lat += RNG.uniform(-0.0018, 0.0018) + wiggle * RNG.uniform(-1, 1)
        lng += RNG.uniform(-0.0022, 0.0022) + wiggle * RNG.uniform(-1, 1)
        path.append([round(lat, 6), round(lng, 6)])
    return path


def _badge(score: float) -> str:
    if score >= 92:
        return "gold"
    if score >= 84:
        return "silver"
    if score >= 72:
        return "bronze"
    return "risk"


def _score_from_events(harsh_brake: int, harsh_accel: int, speeding: int, idle: int) -> float:
    penalty = harsh_brake * 0.7 + harsh_accel * 0.55 + speeding * 1.2 + idle * 0.015
    return round(max(48.0, min(99.0, 100.0 - penalty)), 1)


async def seed_database(session: AsyncSession) -> None:
    existing = await session.scalar(select(Organization).limit(1))
    if existing is not None:
        return

    now = datetime.now(timezone.utc)

    org = Organization(
        name="Pakhsh-e Sepehr Logistics",
        name_fa="پخش سپهر",
        plan="pro",
        city="Tehran",
        city_fa="تهران",
    )
    session.add(org)
    await session.flush()

    demo_hash = hash_password("zubie1234")  # one bcrypt round at boot instead of two
    session.add_all(
        [
            User(
                email="demo@zubie.ir",
                hashed_password=demo_hash,
                full_name="Mohammad Khataei",
                full_name_fa="محمد خطایی",
                role="admin",
                locale="fa",
                phone="۰۹۱۲۱۲۳۴۵۶۷",
                organization_id=org.id,
            ),
            User(
                email="manager@zubie.ir",
                hashed_password=demo_hash,
                full_name="Leila Ebrahimi",
                full_name_fa="لیلا ابراهیمی",
                role="manager",
                locale="fa",
                phone="۰۹۳۵۹۸۷۶۵۴۳",
                organization_id=org.id,
            ),
        ]
    )

    # ---- drivers -----------------------------------------------------
    drivers: list[Driver] = []
    # Target a readable leaderboard shape (a couple of gold, a long bronze
    # middle, a couple at risk) and derive plausible event counts from it,
    # rather than hoping random counters land on a good curve.
    targets = [96.4, 94.1, 91.3, 89.6, 88.2, 86.5, 84.9, 83.1, 81.4,
               79.8, 78.2, 76.6, 75.1, 73.4, 71.8, 69.2, 66.4, 61.7]
    for (fa_name, en_name), target in zip(DRIVER_NAMES, targets):
        budget = 100.0 - target
        harsh_brake = max(0, round(budget * RNG.uniform(0.18, 0.30) / 0.7))
        harsh_accel = max(0, round(budget * RNG.uniform(0.12, 0.24) / 0.55))
        speeding = max(0, round(budget * RNG.uniform(0.20, 0.34) / 1.2))
        idle = max(15, round(budget * RNG.uniform(0.16, 0.30) / 0.015))
        score = _score_from_events(harsh_brake, harsh_accel, speeding, idle)
        driver = Driver(
            organization_id=org.id,
            full_name=en_name,
            full_name_fa=fa_name,
            phone=f"۰۹{_fa_number(RNG.randint(100000000, 399999999))}",
            license_no=f"IR-{RNG.randint(100000, 999999)}",
            score=score,
            trips_count=RNG.randint(40, 260),
            distance_km=round(RNG.uniform(1800, 16500), 1),
            harsh_brake_count=harsh_brake,
            harsh_accel_count=harsh_accel,
            speeding_count=speeding,
            idle_minutes=idle,
            badge=_badge(score),
        )
        drivers.append(driver)
    session.add_all(drivers)
    await session.flush()

    # ---- vehicles ----------------------------------------------------
    statuses = (
        ["moving"] * 11 + ["idle"] * 4 + ["parked"] * 5 + ["offline"] * 2 + ["service"] * 2
    )
    vehicles: list[Vehicle] = []
    for index, status in enumerate(statuses):
        make, model_en, model_fa, vtype = MODELS[index % len(MODELS)]
        place_fa, place_en, lat, lng = PLACES[index % len(PLACES)]
        plate_fa, plate_en = _make_plate()
        driver = drivers[index % len(drivers)]
        moving = status == "moving"
        speed = round(RNG.uniform(24, 96), 1) if moving else (round(RNG.uniform(0, 4), 1) if status == "idle" else 0.0)
        health = round(RNG.uniform(69, 99), 1) if status != "service" else round(RNG.uniform(44, 63), 1)
        vehicles.append(
            Vehicle(
                organization_id=org.id,
                driver_id=driver.id,
                plate=plate_fa,
                plate_en=plate_en,
                name=f"{model_en} · {place_en.split()[0]}",
                name_fa=f"{model_fa} · {place_fa.split()[0]}",
                make=make,
                model=model_en,
                model_fa=model_fa,
                year=RNG.randint(1394, 1404),
                vin=f"IR{RNG.randint(10**10, 10**11 - 1)}",
                device_id=f"ZBK-{2200 + index}",
                vehicle_type=vtype,
                status=status,
                lat=round(lat + RNG.uniform(-0.02, 0.02), 6),
                lng=round(lng + RNG.uniform(-0.03, 0.03), 6),
                heading=round(RNG.uniform(0, 359), 1),
                speed_kmh=speed,
                odometer_km=round(RNG.uniform(24000, 410000), 1),
                fuel_percent=round(RNG.uniform(12, 98), 1),
                battery_volt=round(RNG.uniform(11.6, 14.2), 2),
                coolant_c=round(RNG.uniform(72, 104), 1),
                engine_rpm=round(RNG.uniform(750, 3100), 0) if moving else 0.0,
                health_score=health,
                last_seen=now - timedelta(minutes=RNG.randint(0, 4) if status != "offline" else RNG.randint(190, 900)),
            )
        )
    session.add_all(vehicles)
    await session.flush()

    # ---- trips -------------------------------------------------------
    trips: list[Trip] = []
    for day_offset in range(30):
        for _ in range(RNG.randint(4, 9)):
            vehicle = RNG.choice(vehicles)
            start = RNG.choice(PLACES)
            end = RNG.choice([p for p in PLACES if p is not start])
            duration = RNG.randint(22, 190)
            idle_min = RNG.randint(0, max(2, duration // 5))
            if day_offset == 0:
                # Only the elapsed part of today has trips in it.
                elapsed = max(45, now.hour * 60 + now.minute)
                started = now - timedelta(minutes=RNG.randint(20, elapsed))
            else:
                # Anchor to the calendar day, not to an offset from "now" — an
                # hour offset would spill trips into the previous day.
                target_day = (now - timedelta(days=day_offset)).date()
                started = datetime.combine(
                    target_day,
                    clock_time(hour=RNG.randint(6, 19), minute=RNG.randint(0, 59)),
                    tzinfo=timezone.utc,
                )
            distance = round(duration * RNG.uniform(0.32, 0.78), 1)
            avg_speed = round(distance / (duration / 60), 1)
            trips.append(
                Trip(
                    organization_id=org.id,
                    vehicle_id=vehicle.id,
                    driver_id=vehicle.driver_id,
                    started_at=started,
                    ended_at=started + timedelta(minutes=duration),
                    distance_km=distance,
                    duration_min=duration,
                    idle_min=idle_min,
                    avg_speed=avg_speed,
                    max_speed=round(avg_speed * RNG.uniform(1.25, 1.9), 1),
                    fuel_used_l=round(distance * RNG.uniform(0.07, 0.14), 2),
                    score=round(RNG.uniform(56, 99), 1),
                    start_label=start[1],
                    start_label_fa=start[0],
                    end_label=end[1],
                    end_label_fa=end[0],
                    path=_walk((start[2], start[3]), (end[2], end[3]), RNG.randint(14, 26)),
                )
            )
    session.add_all(trips)

    # ---- geofences ---------------------------------------------------
    fence_specs = [
        ("Shahr-e Rey Central Depot", "انبار مرکزی شهرری", "depot", 35.5906, 51.4386, 900),
        ("East Distribution Hub", "انبار پخش شرق", "depot", 35.7010, 51.5290, 700),
        ("Milad Hospital Customer", "مشتری بیمارستان میلاد", "customer", 35.7255, 51.3752, 400),
        ("Karaj Service Centre", "مرکز خدمات کرج", "service", 35.8355, 50.9915, 550),
        ("Downtown Restricted Zone", "محدوده طرح ترافیک", "restricted", 35.6892, 51.4100, 2600),
    ]
    session.add_all(
        Geofence(
            organization_id=org.id,
            name=name,
            name_fa=name_fa,
            kind=kind,
            lat=lat,
            lng=lng,
            radius_m=radius,
            alert_on_enter=kind != "restricted",
            alert_on_exit=True,
            active=True,
        )
        for name, name_fa, kind, lat, lng, radius in fence_specs
    )

    # ---- alerts ------------------------------------------------------
    alert_specs = [
        ("engine", "critical", "Engine misfire detected", "نقص احتراق موتور شناسایی شد",
         "DTC P0301 raised on cylinder 1. Schedule service within 48h.",
         "کد خطای P0301 روی سیلندر ۱ ثبت شد. سرویس ظرف ۴۸ ساعت لازم است."),
        ("speeding", "serious", "Speeding above 110 km/h", "سرعت بیش از ۱۱۰ کیلومتر بر ساعت",
         "Sustained 118 km/h on Tehran-Karaj freeway for 4 minutes.",
         "سرعت پیوسته ۱۱۸ کیلومتر در آزادراه تهران‌ـ‌کرج به مدت ۴ دقیقه."),
        ("geofence", "warning", "Left depot outside schedule", "خروج از انبار خارج از برنامه",
         "Vehicle exited Shahr-e Rey depot at 02:14 without an assigned trip.",
         "خودرو ساعت ۰۲:۱۴ بدون سفر ثبت‌شده از انبار شهرری خارج شد."),
        ("battery", "serious", "Battery voltage low", "افت ولتاژ باتری",
         "Resting voltage 11.7 V — starting failure likely in cold mornings.",
         "ولتاژ در حالت سکون ۱۱٫۷ ولت است؛ احتمال روشن‌نشدن در صبح‌های سرد."),
        ("idle", "warning", "Excessive idling", "درجا کارکردن بیش از حد",
         "47 minutes of engine idling today, above the 20 minute policy.",
         "۴۷ دقیقه درجا کارکردن امروز، بیش از سقف ۲۰ دقیقه‌ای سازمان."),
        ("maintenance", "warning", "Oil change overdue", "تعویض روغن عقب‌افتاده",
         "1,240 km past the scheduled oil service interval.",
         "۱٬۲۴۰ کیلومتر از موعد تعویض روغن گذشته است."),
        ("harsh", "warning", "Harsh braking cluster", "ترمزهای شدید پیاپی",
         "5 harsh braking events within 20 minutes on Resalat Expressway.",
         "۵ ترمز شدید در ۲۰ دقیقه روی بزرگراه رسالت ثبت شد."),
        ("towing", "critical", "Unauthorised movement", "جابه‌جایی غیرمجاز",
         "Vehicle moved while ignition was off — possible towing.",
         "خودرو با سوئیچ خاموش جابه‌جا شد؛ احتمال بکسل‌شدن."),
        ("engine", "warning", "Coolant temperature high", "دمای خنک‌کننده بالا",
         "Coolant reached 103°C in stop-and-go traffic.",
         "دمای مایع خنک‌کننده در ترافیک به ۱۰۳ درجه رسید."),
        ("geofence", "good", "Arrived at customer site", "رسیدن به محل مشتری",
         "Entered Milad Hospital geofence, 6 minutes ahead of the window.",
         "ورود به محدوده بیمارستان میلاد، ۶ دقیقه زودتر از بازه تعیین‌شده."),
    ]
    alerts: list[Alert] = []
    for index, (kind, severity, title, title_fa, message, message_fa) in enumerate(alert_specs * 3):
        vehicle = vehicles[(index * 5) % len(vehicles)]
        alerts.append(
            Alert(
                organization_id=org.id,
                vehicle_id=vehicle.id,
                kind=kind,
                severity=severity,
                title=title,
                title_fa=title_fa,
                message=message,
                message_fa=message_fa,
                acknowledged=index > 11,
                occurred_at=now - timedelta(hours=index * 3 + RNG.randint(0, 2)),
            )
        )
    session.add_all(alerts)

    # ---- maintenance + DTC ------------------------------------------
    tasks: list[MaintenanceTask] = []
    for vehicle in vehicles:
        for kind, title, title_fa in RNG.sample(MAINTENANCE_LIBRARY, RNG.randint(1, 3)):
            days = RNG.randint(-30, 70)
            status = "overdue" if days < 0 else ("due" if days < 10 else "upcoming")
            tasks.append(
                MaintenanceTask(
                    organization_id=org.id,
                    vehicle_id=vehicle.id,
                    kind=kind,
                    title=title,
                    title_fa=title_fa,
                    due_km=round(vehicle.odometer_km + RNG.uniform(-1500, 6000), 0),
                    due_date=(date.today() + timedelta(days=days)),
                    status=status,
                    cost_toman=RNG.randrange(800_000, 14_000_000, 50_000),
                )
            )
    session.add_all(tasks)

    codes: list[DiagnosticCode] = []
    for vehicle in vehicles:
        if vehicle.health_score < 80 or RNG.random() < 0.25:
            code, desc, desc_fa, severity = RNG.choice(DTC_LIBRARY)
            codes.append(
                DiagnosticCode(
                    vehicle_id=vehicle.id,
                    code=code,
                    description=desc,
                    description_fa=desc_fa,
                    severity=severity,
                    detected_at=now - timedelta(hours=RNG.randint(2, 400)),
                    cleared=False,
                )
            )
    session.add_all(codes)

    await session.commit()
