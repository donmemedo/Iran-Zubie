# Security audit: Iran-Zubie

Red-team and blue-team review of the FastAPI backend and the Next.js frontend, with every finding
fixed where it could be, tested, and then attacked again from the outside.

## Method

| Step | Tool or technique | Result |
|---|---|---|
| Manual code review | All backend modules, plus the frontend files that touch tokens, sockets, caching and headers | 12 findings from the first pass, 13 more from this pass |
| SAST | Bandit on `backend/app` | 0 high, 0 medium, 9 low (see "Accepted") |
| SAST | Semgrep (`p/python`, `p/fastapi`, `p/typescript`, `p/react`, `p/nextjs`, `p/secrets`) | **Did not complete.** The scan timed out in the sandbox. It runs in CI instead. |
| Dependency audit | `pip-audit` (OSV), `npm audit` | 48 advisories in 5 Python packages before, none in `requirements.txt` after |
| Attack-tree modelling | [`ATTACK_TREE.md`](ATTACK_TREE.md) | 4 attack goals, 25 leaves, each mapped to a control |
| Live penetration test | `backend/scripts/pentest_probe.py` against a production-mode server | 38 of 38 probes pass, see [`PENTEST_RESULTS.md`](PENTEST_RESULTS.md) |
| Regression tests | `backend/tests` | 18 tests, one per finding |

Not done: DAST with OWASP ZAP, a browser-level XSS test, load testing, and any test of the Docker
runtime options (the Docker daemon was not running here; compose files were checked with `docker compose config` only).

## Findings and status

Severity is the exposure before the fix. "Verified" means a test or a live probe now proves the fix.

### First pass (from `HANDOFF.md`, re-checked against the code)

| # | Severity | Finding | Status | Verified by |
|---|---|---|---|---|
| 1 | Critical | Unauthenticated WebSocket streamed every tenant's live GPS | **Fixed.** Token in a subprotocol, `Origin` check, per-organization streams, connection caps, close on token expiry. | tests, probes WS-1 to WS-5 |
| 2 | Critical | Self-registration joined the demo tenant as manager | **Fixed.** Each sign-up gets its own organization as admin. | test, probe TENANT-1 |
| 3 | Critical | Hard-coded default JWT secret | **Fixed.** Production refuses placeholder or short secrets; compose requires one; the image sets production. | test, probe AUTH-1 |
| 4 | High | No role checks on mutating routes | **Fixed.** Viewers get 403 on four write routes; the UI hides those actions. | test |
| 5 | High | Diagnostics not scoped by organization | **Fixed.** Joined to the vehicle and filtered; foreign ids give 404. | test, probe TENANT-2 |
| 6 | Medium | Login timing oracle, no rate limit | **Fixed.** Dummy-hash equalisation, per-IP and per-account limits, lead form limited. | test, probes AUTH-3, AUTH-5 |
| 7 | Medium | 7-day JWT, no `jti`, no revocation | **Fixed with a limit.** 8 hours, `jti`, logout revokes. The revocation list is in memory (see residual risk). | test, probe SESS-1 |
| 8 | Medium | Token in `localStorage` | **Open.** Mitigated, not removed (see residual risk). | |
| 9 | Low | OpenAPI docs public | **Fixed.** Off in production. | probe RECON-1 |
| 10 | Low | Password minimum of 6 | **Fixed.** 10 to 72 bytes, common passwords refused. | test |
| 11 | Low | CORS wildcard with credentials | **Fixed.** No fallback, explicit methods and headers. | probe WEB-1, WEB-1b |
| 12 | Low | `/health` leaked a cross-tenant count | **Fixed.** Returns `{"status":"ok"}`. | probe RECON-2 |

### New in this pass

| # | Severity | Finding | Status |
|---|---|---|---|
| 13 | High | Known-vulnerable backend dependencies: `python-jose` 3.3.0 (CVE-2024-33663, CVE-2024-33664) and its `ecdsa`, `starlette` 0.41.3, `python-multipart` 0.0.20, 48 advisories in total | **Fixed.** PyJWT 2.15.1, `bcrypt` used directly, FastAPI 0.142.4 with Starlette 1.7.0, `python-multipart` 0.0.32. `passlib` removed. |
| 14 | High | Next.js 15.1.6 and React 19.0.0 predate several fixes: the middleware authorization bypass (CVE-2025-29927) and the later React Server Components security releases | **Fixed.** Next.js 15.5.27, React and React DOM 19.1.9. |
| 15 | Medium | Production seeded `demo@zubie.ir` with a password printed in the README | **Fixed.** Seeding is development-only unless `ZUBIE_SEED_DEMO=true`. |
| 16 | Medium | Service worker cached authenticated API responses and served HTML stale-while-revalidate | **Fixed.** Authenticated requests are never cached; pages are network-first; logout clears caches. |
| 17 | Medium | CSV export allowed spreadsheet formula injection | **Fixed.** Cells starting with `= + - @`, tab or CR get a quote prefix. Checked by `csv.check.mjs`. |
| 18 | Medium | No security headers on the frontend or API | **Fixed.** CSP, nosniff, frame denial, referrer and permissions policy, HSTS in production. |
| 19 | Medium | The landing hero used the (then public) telemetry socket | **Fixed.** The hero animates a local demo fleet; the real socket needs a signed-in user. |
| 20 | Low | No request-size limit, request ids, audit trail or generic 500 | **Fixed.** 256 KB body cap, `X-Request-ID`, structured access and audit logs, generic errors. |
| 21 | Low | Passwords over 72 bytes crash `bcrypt` 5 | **Fixed.** Login returns 401, register refuses them. |
| 22 | Low | Unknown JSON fields silently accepted on inbound payloads | **Fixed.** Inbound models reject extra fields. |
| 23 | Low | Demo password pre-filled and printed on the production login page | **Fixed.** Development only. |
| 24 | Low | Build and runtime depended on Google Fonts | **Fixed.** Fonts are bundled locally. |
| 25 | Low | Nested interactive controls (a button inside a button) in the geofence list | **Fixed.** Separate controls, 44 px targets, confirmation before delete. |

## Blue-team view

What an operator sees when someone attacks (confirmed in the server log during the pen test):

| Logger | Events |
|---|---|
| `zubie.access` | One line per request: method, path, status, milliseconds, client IP, request id |
| `zubie.auth` | `auth.login.failed`, `auth.login.ok`, `auth.register`, `auth.logout` with user, organization, IP |
| `zubie.audit` | `alert.acknowledge`, `geofence.create`, `geofence.delete`, `maintenance.complete` with user, role, organization |
| `zubie.ws` | Refused socket handshakes with the reason (auth or capacity) and origin |
| `zubie.error` | Unhandled exceptions with traceback and request id; the client only gets a generic message |

Suggested alerts: more than 10 `auth.login.failed` per IP in a minute, any `ws refused reason=auth`
from an internal origin, any 429 burst, any `zubie.error`.

Incident response, token compromise: rotate `ZUBIE_SECRET_KEY` and restart. That invalidates every
issued token and also empties the in-memory revocation list, which is acceptable because nothing signed
with the old key validates any more.

## Performance alongside security

| Control | Cost or gain |
|---|---|
| Per-organization single-serialization fan-out | JSON is encoded once per organization per tick instead of once per socket; empty organizations get nothing |
| Dirty-row bulk flush | One `UPDATE ... executemany` for changed vehicles instead of loading and dirtying every row |
| SQL aggregates for analytics, composite indexes | Overview, alert mix, score bands and maintenance forecast no longer load whole tables |
| Pure ASGI middleware | No `BaseHTTPMiddleware` task per request; headers are precomputed |
| Selective gzip at level 6 | Smaller JSON lists at lower CPU than level 9; auth responses never compressed (BREACH) |
| SQLite WAL, Postgres `pool_pre_ping` and pooling | Reads continue during the telemetry flush; no stale-connection errors |
| bcrypt in a thread pool | Password hashing no longer blocks the event loop |
| Map icon cache | At most 360 icon objects instead of one per vehicle per frame |
| One telemetry socket per dashboard, shell reads a separate status context | The shell no longer re-renders every 2 seconds |
| Self-hosted fonts | No third-party request, no render-blocking font CSS fetch |

## Residual risk and backlog

| Risk | Why it remains | Next step |
|---|---|---|
| Token in `localStorage` (finding 8) | Moving to an `httpOnly` cookie needs CSRF protection, cookie-aware WebSocket auth and CORS changes | Cookie session plus double-submit CSRF token; until then CSP, 8-hour lifetime and revocation limit the damage |
| Rate limiter, revocation list and socket registry are per process | Single worker by design | Redis for counters and revocation, Redis pub/sub for socket fan-out, before running more than one worker |
| Restart clears revocations | Same reason | A token revoked by logout validates again after a restart until it expires (at most 8 hours) |
| Per-account login limit allows lock-out of a victim | 8 failures in 5 minutes block that account for everyone | Key by account and IP, add step-up verification |
| CSP allows inline scripts | The theme bootstrap and Next.js inline data need it | Nonce-based CSP, which makes every page dynamic |
| `pip` and `certifi` flagged in the local venv | Tooling and a test-only dependency, not in `requirements.txt` | The runtime images ship neither `pip` nor `npm`; Dependabot covers the rest |
| No MFA, password reset, email verification or team invitations | Out of scope for the MVP | See the product backlog in [`ROLE_REVIEWS.md`](ROLE_REVIEWS.md) |
| Schema created at startup, no migrations | MVP shortcut | Alembic |
| Telemetry is simulated; real devices will need their own authentication | No hardware ingest exists yet | Per-device keys or mTLS on the MQTT or HTTP ingest |
| Audit log goes to stdout only | No tamper-evident store | Ship to a log platform with retention |

### Accepted Bandit findings (9 low)

Six are `assert` statements inside `if __name__ == "__main__"` self-checks, one is the documented
development-only default secret (production refuses it), and two are `random` used for simulation and
seed data, not for anything secret.
