# زوبی ایران · Zubie Iran

A connected-car and fleet-telematics platform, built from the *Zubie Iran*
business plan in this folder: put a small OBD key in every company vehicle and
turn it into three things a fleet manager can act on — **live position**,
**vehicle health**, and a **gamified driver score**.

Persian-first (RTL, Solar Hijri dates, toman amounts) with a full English
locale, light and dark themes, and a responsive layout from 390 px up.

```
16_Zubie/
├── backend/            FastAPI + SQLAlchemy (async), JWT auth, telemetry simulator, tests, pentest probe
├── frontend/           Next.js 15 App Router, Tailwind v4, Leaflet, hand-built SVG charts
├── docs/               implementation report, security audit, pentest results, role reviews, plans
├── .github/            CI: tests, SAST, dependency audit, secret scan, container scan
├── docker-compose.yml  postgres + api + web (hardened, loopback-only ports)
└── .env.example        copy to .env and fill the REQUIRED values before `docker compose up`
```

---

## Run it

### Docker (everything at once)

```bash
cp .env.example .env        # fill POSTGRES_PASSWORD, ZUBIE_SECRET_KEY, ZUBIE_CORS_ORIGINS
docker compose up --build
```

The compose stack runs the API in **production mode**: it refuses to start with a
placeholder secret, a wildcard CORS origin or a missing password, the interactive
docs are switched off, and the demo accounts are not created. Ports bind to
`127.0.0.1`; put a TLS reverse proxy in front for anything public.

- Web: <http://localhost:3010>
- API: <http://localhost:8010> (interactive docs only exist in development, at `/docs`)

Production checklist: random 32+ character `ZUBIE_SECRET_KEY`, exact
`ZUBIE_CORS_ORIGINS`, TLS at the proxy, `FORWARDED_ALLOW_IPS` set to the proxy,
a single API worker (the rate limiter and token revocation list are in-process;
move them to Redis before scaling out).

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

### Demo account (development only)

| email | password |
|---|---|
| `demo@zubie.ir` | `zubie1234` |

A second account, `manager@zubie.ir` with the same password, has the `manager`
role. In development the login screen fills the demo credentials in for you. A
production build starts with empty fields, and the server only creates these
accounts when `ZUBIE_SEED_DEMO=true`.

**Sign-ups get their own organisation.** Registering creates a new, empty
organisation with you as its `admin`; it never joins the demo fleet. Roles are
`viewer` (read-only), `manager` and `admin`; acknowledging alerts, editing
geofences and completing maintenance need `manager` or higher.

---

## What is in it

**Marketing site** (`/fa`, `/en`) — hero with a moving demo fleet (simulated in
the browser; the real telemetry socket needs a signed-in account), feature and
how-it-works sections,
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
sends each organisation **only its own vehicles** over `/api/ws/telemetry`, and
flushes changed rows to the database every 15 ticks so a page reload shows a
coherent fleet. The socket needs a token: browsers connect with
`new WebSocket(url, ["zubie.v1", "bearer." + token])`, and the server checks the
token and the `Origin` header before accepting.

The REST endpoints overlay that in-memory state on the persisted rows, so the
table and the map never disagree. Swapping in a real MQTT consumer means
replacing that one module.

Seed data is generated from a fixed RNG seed, so the leaderboard and every chart
are stable across restarts.

---

## API

Interactive docs at `/docs` and OpenAPI at `/openapi.json` (development only).

```
POST   /api/auth/login | /api/auth/register | /api/auth/logout     GET /api/auth/me
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

## Security, tests and CI

- [`docs/SECURITY_AUDIT.md`](docs/SECURITY_AUDIT.md): red-team and blue-team findings, what was fixed, residual risk.
- [`docs/PENTEST_RESULTS.md`](docs/PENTEST_RESULTS.md): output of the live probe, `backend/scripts/pentest_probe.py`.
- [`docs/ROLE_REVIEWS.md`](docs/ROLE_REVIEWS.md): product owner, tech lead, red team, blue team and QA review.

```bash
cd backend && .venv/bin/pip install pytest httpx && .venv/bin/python -m pytest -q   # 18 regression tests
```

GitHub Actions (`.github/workflows/ci.yml`) runs the tests, Bandit, Semgrep,
`pip-audit`, `npm audit`, Gitleaks and a Trivy scan of both images on every pull
request, plus weekly so new advisories surface on their own.

## Packaging

The web app already ships as an installable PWA (manifest, icons, offline
service worker). [`docs/packaging.md`](docs/packaging.md) covers the next step —
wrapping the same build as an Android APK and an iOS IPA with Capacitor.
