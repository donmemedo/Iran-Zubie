# Implementation plan

## Objective

Take the Zubie Iran MVP from a demo to something a first customer can use safely: a hardened FastAPI and Next.js
application, then the product gaps that stop a new organization from getting value, then real devices and mobile.

## Current architecture (relevant parts)

- `backend/app`: `api/` routes, `core/` settings, security, rate limiting and audit, `services/telemetry.py` simulator
  and socket manager, `models/`, `schemas/`, `db/`.
- `frontend/src`: `app/[locale]/` routes, `components/dashboard/views` pages, `lib/` API client, auth, hooks, dictionaries.
- Constraints that shape the plan: single API worker (in-process limiter, revocation list, socket registry), schema
  created at startup, telemetry simulated, token stored in `localStorage`.

## Done in this branch

| Step | Files |
|---|---|
| Tenant isolation, roles, socket authentication | `api/fleet.py`, `api/ws.py`, `api/deps.py`, `services/telemetry.py` |
| Token and password hardening, logout revocation | `core/security.py`, `api/auth.py` |
| Edge hardening, logging, config guards | `main.py`, `core/config.py`, `core/audit.py`, `db/session.py` |
| Input validation and SQL-side performance | `schemas/__init__.py`, `models/entities.py`, `api/analytics.py` |
| Dependency upgrades | `backend/requirements.txt`, `frontend/package.json` |
| Frontend security: CSP, service worker, token and socket handling, safe CSV | `next.config.ts`, `public/sw.js`, `lib/api.ts`, `lib/auth.tsx`, `lib/hooks.tsx` |
| Frontend UX, accessibility, Persian copy, empty and error states | `globals.css`, `components/ui/*`, dashboard shell, views, dictionaries |
| Containers and CI | Dockerfiles, `docker-compose.yml`, `.github/` |
| Tests and live probe | `backend/tests`, `backend/scripts/pentest_probe.py` |

## Next steps

| Priority | Step | Notes |
|---|---|---|
| P0 | Vehicle, device and driver registration (API and screens) | Without it a new organization stays empty |
| P0 | Team invitations with roles | Sign-up no longer joins an existing fleet |
| P1 | Redis for rate limits, revocation and socket fan-out | Unlocks more than one worker |
| P1 | Alembic migrations | Replace `create_all` |
| P1 | Cookie session with CSRF protection | Removes the `localStorage` token |
| P1 | Real telemetry ingest with per-device keys | Retire the simulator for customer data |
| P1 | Frontend tests and a browser-driven smoke test in CI | Currently none |
| P1 | Password reset, email verification | |
| P2 | Prometheus metrics, tracing, log shipping | |
| P2 | OpenAPI-generated TypeScript client | |
| P2 | Capacitor shells for Android and iOS | Follow [`packaging.md`](packaging.md) |

## Risks and edge cases

- Moving to cookies changes CORS, the socket handshake and CSRF at once; do it behind one change.
- A second worker without Redis silently weakens rate limits and leaves revoked tokens valid on other workers.
- Real devices send bursts and out-of-order frames; the ingest needs idempotent writes.
- Demo seeding must stay off in production (`ZUBIE_SEED_DEMO`), or the public demo password becomes a real account.

## Verification plan

1. `pytest` for the backend, `tsc --noEmit` and `next build` for the front end, on every pull request.
2. `scripts/pentest_probe.py` against staging after each deploy; any failed probe blocks the release.
3. Manual QA pass from the table in [`ROLE_REVIEWS.md`](ROLE_REVIEWS.md) before each release.
4. Weekly scheduled CI run so new advisories appear without a code change.
