# زوبی ایران · Zubie Iran

A connected-car and fleet-telematics platform, built from the *Zubie Iran*
business plan in this folder: put a small OBD key in every company vehicle and
turn it into three things a fleet manager can act on — **live position**,
**vehicle health**, and a **gamified driver score**.

Persian-first (RTL, Solar Hijri dates, toman amounts) with a full English
locale, light and dark themes, and a responsive layout from 390 px up.

```
16_Zubie/
├── backend/            FastAPI + SQLAlchemy (async), JWT auth, telemetry simulator
├── frontend/           Next.js 15 App Router, Tailwind v4, Leaflet, hand-built SVG charts
├── docs/               design notes and the PWA / APK / IPA packaging plan
├── docker-compose.yml  postgres + api + web
└── .env.example        copy to .env before `docker compose up`
```

---

## Run it

### Docker (everything at once)

```bash
cp .env.example .env        # then edit ZUBIE_SECRET_KEY
docker compose up --build
```

- Web: <http://localhost:3010>
- API + interactive docs: <http://localhost:8010/docs>

### Local development

Two terminals.

```bash
# backend  →  http://localhost:8010
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --port 8010
```

```bash
# frontend →  http://localhost:3010
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

The database is created and seeded on first boot — SQLite locally, Postgres
under Docker. Delete `backend/zubie.db` to reseed.

### Demo account

| email | password |
|---|---|
| `demo@zubie.ir` | `zubie1234` |

A second account, `manager@zubie.ir` with the same password, has the `manager`
role. The login screen fills the demo credentials in for you.

---

## What is in it

**Marketing site** (`/fa`, `/en`) — hero with a *live* fleet map driven by the
same telemetry socket the dashboard uses, feature and how-it-works sections,
pricing served from the API, FAQ, and a pilot-request form that writes a lead
to the database.

**Dashboard** (`/fa/app`)

| Route | What it does |
|---|---|
| `/app` | KPI tiles, fleet status strip, distance / fuel / idling trends, score distribution, alert mix, driver leaderboard, latest alerts |
| `/app/map` | Full-screen live map, status filters, search, geofence overlay, vehicle panel |
| `/app/vehicles` | Sortable fleet table with live speed, fuel, health and last-seen |
| `/app/vehicles/[id]` | Health gauge, OBD telemetry, fault codes, trip history with route replay on the map |
| `/app/drivers` | Score distribution, leaderboard and a card per driver with their event counters |
| `/app/trips` | Recent trips; click one to draw its route |
| `/app/alerts` | Filter by state and severity, acknowledge an alert |
| `/app/maintenance` | Service plan by status with estimated cost, mark done |
| `/app/geofences` | Create and delete zones, see them on the map |
| `/app/reports` | Range picker, totals, four charts, table view, CSV export |
| `/app/settings` | Account, organisation, theme, language, alert preferences, PWA install |

`⌘K` / `Ctrl+K` opens a command palette over pages, vehicles and drivers.

---

## How the live data works

There is no real hardware here, so `backend/app/services/telemetry.py` stands in
for the Zubie key: a background task advances every vehicle on a 2-second tick
(heading, speed, fuel burn, odometer, coolant, occasional status changes),
broadcasts the frame to every websocket subscriber on `/api/ws/telemetry`, and
flushes to the database every 15 ticks so a page reload shows a coherent fleet.

The REST endpoints overlay that in-memory state on the persisted rows, so the
table and the map never disagree. Swapping in a real MQTT consumer means
replacing that one module.

Seed data is generated from a fixed RNG seed, so the leaderboard and every chart
are stable across restarts.

---

## API

Interactive docs at `/docs`, OpenAPI at `/openapi.json`.

```
POST   /api/auth/login | /api/auth/register     GET /api/auth/me
GET    /api/vehicles[?status=&search=]          GET /api/vehicles/{id}
GET    /api/vehicles/{id}/trips | /diagnostics
GET    /api/drivers | /api/drivers/{id}         GET /api/trips
GET    /api/alerts[?only_open=&severity=]       POST /api/alerts/{id}/acknowledge
GET    /api/geofences   POST /api/geofences     DELETE /api/geofences/{id}
GET    /api/maintenance                         POST /api/maintenance/{id}/complete
GET    /api/analytics/overview | /timeseries | /alert-mix
       | /score-distribution | /maintenance-forecast
GET    /api/public/plans                        POST /api/public/leads
WS     /api/ws/telemetry
```

---

## Design notes

See [`docs/design.md`](docs/design.md) for the token system, the validated
chart palette, and the bidirectional-layout rules. Short version:

- Light is the base palette; dark is a **selected** set of steps, not an
  inverted flip. Both are declared for the OS media query *and* the in-app
  switch, so the toggle wins in both directions.
- Chart colours come from a colourblind-validated categorical palette. Status
  colours (good / warning / serious / critical) are reserved and always ship
  with a label, never colour alone.
- Time axes stay left-to-right in both locales, matching Iranian dashboard
  convention. Ordinal category axes flip so the first band starts at the
  reading edge.
- Persian copy follows the Persian UX-writing reference — پیش‌خوان for the
  dashboard, حساب کاربری for the account, اعلان for notifications, and
  «رمز نادرست است» rather than blaming the user.

## Packaging

The web app already ships as an installable PWA (manifest, icons, offline
service worker). [`docs/packaging.md`](docs/packaging.md) covers the next step —
wrapping the same build as an Android APK and an iOS IPA with Capacitor.
