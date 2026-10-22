> **Superseded.** This is the handoff written on 2026-10-02. Everything in it has since been fixed, tested or moved to the backlog. See [`../LAST_Report.md`](../LAST_Report.md) for the current state.

# Session handoff: Iran-Zubie security, performance and UX pass

Written 2026-10-02 so another model or session can continue. Nothing is committed yet.

## 1. The task

The user asked for:

1. A full security audit using red-team and blue-team agents and the security skills, including a pen test of this project.
2. Every problem found must be fixed, not only reported.
3. Performance work alongside every security change, so hardening does not slow the app down.
4. A UI/UX pass using the `/apple-design` skill (fluid, interruptible motion, springs, press feedback, translucent materials, reduced-motion support, wayfinding).
5. Persian copy must follow `~/references/persian-ux-vocab/README.md`, which is loaded through the user's global CLAUDE.md.
6. The target was to finish within about 5 hours. Token cost is not a constraint.

## 2. Where things stand

| Area | Status |
|---|---|
| Audit | Only 2 of 13 finder lenses finished, both on auth and multi-tenancy. The other 11 lenses and every verifier failed on usage limits. The 13 findings in section 4 are **unverified**. |
| Backend auth hardening | Done and running. See section 3. |
| Other backend fixes | Not started: WebSocket auth, diagnostics scoping, role checks on routes, CORS, docs toggle, `/health`, validation. |
| Frontend security | Not started. |
| Performance | Not reviewed and not started. |
| Apple-design UX | Skill read, review not done, nothing changed. |
| Accessibility, RTL, Persian copy | Not reviewed. |
| Tests | None exist in the repo. None added yet. |
| Git | No commits. Working tree has the changes listed in section 3. |

## 3. Changes made this session

All under `backend/app/`. Verified live: login returns 200, a wrong password returns 401, the new token passes `/api/auth/me` and `/api/vehicles`.

**`core/config.py`**
- New `environment` setting: `development` (default) or `production`.
- In production the app refuses to boot when `ZUBIE_SECRET_KEY` is a known placeholder or shorter than 32 characters, or when `ZUBIE_CORS_ORIGINS` is empty.
- Token lifetime cut from 7 days to 8 hours.
- New `token_issuer` and `token_audience` settings.
- New settings that are **defined but not wired up yet**: `max_ws_connections`, `max_body_bytes`, `docs_enabled`, and the `show_docs` property.

**`core/security.py`**
- Tokens now carry `iss`, `aud` and `jti`, and decoding checks issuer and audience. Tokens issued before this change no longer validate, so users have to log in again.
- `verify_password(plain, None)` checks against a dummy bcrypt hash. Unknown emails and wrong passwords now take the same time, which closes the user-enumeration timing gap.

**`core/ratelimit.py`** (new file)
- A sliding-window, per-IP limiter built only on the standard library.
- It keeps state in process memory, so it only works with one uvicorn worker. Move it to Redis before scaling out.
- It keys on `request.client.host`. Behind a reverse proxy, run uvicorn with `--proxy-headers --forwarded-allow-ips=<proxy>` or every client will share one bucket.

**`api/deps.py`**
- New `user_from_token(token, session)` helper, meant to be reused by the WebSocket auth fix.
- New `require_role(minimum)` dependency using the order viewer < manager < admin. **It is not applied to any route yet.**

**`api/auth.py`**
- bcrypt hashing and verification run in a threadpool so they no longer block the event loop.
- Login is limited to 20 attempts per minute per IP and 8 per 5 minutes per account. The `/token` alias shares the same path.
- Register is limited to 5 per hour per IP.
- Every sign-up now gets its **own new Organization** with role `admin`. Before this, sign-ups joined the first organization (the demo fleet) as `manager`, which was a cross-tenant data exposure.
- Login success, login failure and register are logged on the `zubie.auth` logger.

**Behaviour changes the frontend and docs still need to absorb**
- A newly registered user lands on an **empty** dashboard. The README still says sign-ups join the demo org, and the views need proper empty states.
- A 429 response shows the English message "Too many requests, please try again later" even in the fa locale. `components/auth/login-view.tsx` only localises 401. Add a fa string and handle 429.

## 4. Audit findings (unverified) and their status

These came from the `red-auth-jwt` and `red-tenancy-idor` lenses. Re-verify each one against the code before relying on it.

| # | Severity | Finding | File | Status |
|---|---|---|---|---|
| 1 | critical | The unauthenticated WebSocket `/api/ws/telemetry` streams every tenant's live GPS and telemetry | `api/ws.py`, `services/telemetry.py` | **Open** |
| 2 | critical | Self-registration joins the existing demo tenant as manager | `api/auth.py` | Fixed |
| 3 | critical | A hard-coded default JWT secret lets anyone forge tokens | `core/config.py`, `docker-compose.yml` | Partial. Production now refuses weak secrets, but compose still falls back to `change-me-in-production` and never sets `ZUBIE_ENVIRONMENT=production`. |
| 4 | high | No endpoint checks roles, so a viewer can acknowledge alerts, delete geofences and complete maintenance | `api/fleet.py` | Partial. The dependency exists but is not applied. |
| 5 | high | BOLA: `/vehicles/{id}/diagnostics` is not scoped by organization | `api/fleet.py:103-114` | **Open** |
| 6 | medium | Login timing oracle, plus no rate limit or lockout | `api/auth.py` | Fixed. `/public/leads` is still unlimited. |
| 7 | medium | 7-day JWT with no `jti` and no revocation, so logout only clears the client | `core/security.py` | Partial. TTL is now 8 hours and `jti` is set, but there is no revocation list or token-version column. |
| 8 | medium | The token sits in localStorage, so any XSS steals it | `frontend/src/lib/api.ts` | **Open.** Best fix is an httpOnly SameSite cookie with CSRF protection. The minimum is a strict CSP. |
| 9 | low | OpenAPI `/docs`, `/redoc` and `/openapi.json` are public | `main.py` | Partial. `settings.show_docs` exists but `main.py` does not use it. |
| 10 | low | The password minimum is 6 characters | `schemas/__init__.py:31` | **Open.** Raise it to at least 10 and reject common passwords. |
| 11 | low | CORS falls back to `*` while `allow_credentials=True` | `main.py:43` | **Open.** Remove the `or ["*"]` fallback. |
| 12 | low | Public `/health` leaks the cross-tenant vehicle count | `main.py:52-54` | **Open.** Return `{"status":"ok"}` only. |

Recommended fixes for the open items:

- **#1 WebSocket.** Before `accept()`, read the token from the `Sec-WebSocket-Protocol` header (preferred) or a `?token=` query value. Resolve it with `deps.user_from_token`, close with code 1008 when it is invalid, and check the `Origin` header against the CORS list. Store each connection's `organization_id` in `ConnectionManager`. The simulator should keep an org-to-vehicle-ids index and send each org only its own vehicles. Serialise each org payload once per tick with `json.dumps` and `send_text`, instead of calling `send_json` once per client. Enforce `settings.max_ws_connections`. Update `frontend/src/lib/hooks.ts` `useTelemetry` to pass the token, and the landing-page hero, which uses the same socket while logged out, needs a separate public demo feed or a decoy stream.
- **#4 roles.** Add `Depends(require_role("manager"))` to the routes for alert acknowledge, geofence create and delete, and maintenance complete. The frontend should hide or disable those actions for viewers.
- **#5 diagnostics.** Join `Vehicle` and filter `Vehicle.organization_id == user.organization_id`, or load the vehicle with the org filter first and return 404 when it is missing.

## 5. Work not yet done

Each package owns a separate set of files so implementers can work in parallel.

1. **backend-fleet** (`api/fleet.py`, `api/analytics.py`, `api/public.py`, `schemas/__init__.py`, `models/entities.py`)
   - Fix #4, #5 and #10.
   - Bound every query parameter: `limit` 1 to 200, `days` 1 to 90.
   - Use `Literal` enums for kind, severity and status.
   - Add `Field` length limits on every string, and bounds on lat/lng (inside Iran) and `radius_m` (50 to 50,000).
   - Validate `LeadCreate`: phone pattern, `EmailStr | ""`, `fleet_size` 1 to 10,000. Rate-limit `/public/leads`.
   - Performance: push the status and search filters in `list_vehicles` into SQL. Add indexes on `organization_id` for every table, plus `trips(organization_id, started_at)`, `alerts(organization_id, occurred_at)` and `maintenance_tasks(organization_id, due_date)`. Replace the four full table loads in `analytics/overview` with aggregate queries. Add a `Cache-Control` header to `/public/plans`.
2. **backend-app-realtime** (`main.py`, `api/ws.py`, `services/telemetry.py`, `db/session.py`)
   - Fix #1, #9, #11 and #12.
   - Add security-header middleware: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY`, and HSTS when in production.
   - Add a request body size limit from `settings.max_body_bytes`.
   - Add GZip middleware.
   - Add request-id plus structured access and audit logging. Audit-log geofence create and delete, alert acknowledge and maintenance complete.
   - Configure `logging.basicConfig` so `zubie.auth` logs actually appear.
   - Make 500 responses generic.
   - SQLite: set `PRAGMA journal_mode=WAL` and `synchronous=NORMAL` on connect.
   - `_flush` should update only changed rows.
3. **infra** (`backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml`, `.env.example`, `requirements.txt`, `README.md`)
   - Set `ZUBIE_ENVIRONMENT=production` in compose.
   - Remove the secret and Postgres password fallbacks so compose uses `${VAR:?required}`.
   - Run the backend as a non-root user, use a multi-stage build without `build-essential` in the runtime image, and bind ports to 127.0.0.1 or put them behind a proxy.
   - Add a TLS or reverse-proxy note.
   - Dependencies: `python-jose 3.3.0` has CVE-2024-33663 and CVE-2024-33664, so move to `PyJWT` (already in the local uv cache as 2.13.0) or `joserfc`. Next.js 15.1.6 is affected by CVE-2025-29927, the middleware bypass. This app's middleware only does locale redirects, so impact is low, but upgrade to at least 15.2.3.
   - Update the README so new sign-ups get their own org and the security notes are current.
4. **frontend-security** (`next.config.ts`, `src/middleware.ts`, `public/sw.js`, `src/lib/api.ts`, `src/lib/auth.tsx`, `src/components/dashboard/views/reports-view.tsx`)
   - Add CSP, frame-ancestors, nosniff, Referrer-Policy and Permissions-Policy headers. Allow the map tile host and the API and WS origins.
   - `sw.js` caches authenticated `/api/` GET responses. Stop caching any request that carries `Authorization`, or clear caches on logout via `postMessage` and `caches.delete`. Also stop stale-while-revalidate on HTML, which can pair an old shell with new chunks after a deploy.
   - Logout must clear the SW data cache.
   - CSV export: prefix cells that start with `= + - @` or a tab with `'` to block formula injection.
   - Handle 401 globally by logging out and redirecting, and handle 429 with a localised message.
   - Remove the pre-filled demo password outside development.
5. **frontend-perf** (`src/lib/hooks.ts`, `components/dashboard/shell.tsx`, `components/map/*`, `components/charts/*`)
   - The shell calls `useTelemetry` only to show a "connected" dot, so every 2-second frame re-renders the whole dashboard. Move the dot into its own small component or a context.
   - Memoise markers and polylines, and update Leaflet markers imperatively rather than re-rendering them.
   - Use framer-motion's `LazyMotion` with `m` components.
   - Add `loading.tsx` per route.
6. **frontend-ux-apple** (`app/globals.css`, `components/ui/*`, the drawer, command palette and login motion, and the feedback states in `views/*`)
   - Apply the `/apple-design` guidance: press feedback on `:active`, critically damped springs (bounce 0, about 0.35 s) for the drawer, palette and sheets, popovers anchored to their trigger with `transform-origin`, symmetric enter and exit paths, and a translucent sidebar and top bar using `backdrop-filter` with a scroll-edge fade instead of 1px rules.
   - Support `prefers-reduced-transparency` and `prefers-contrast`.
   - Use negative tracking on display sizes.
   - Add loading, empty and error states, especially for the new empty org.
   - Confirm or offer undo for geofence delete.
7. **frontend-a11y-i18n** (`src/lib/dictionaries/fa.ts`, `en.ts`, and a11y attributes across views)
   - Focus trap and Escape for the palette and drawer, `aria-live` on the connection status and form errors, 44px touch targets, mirrored icons in RTL.
   - Check fa copy against the Persian UX vocabulary reference.
   - Add the 429 and empty-org strings.
8. **tests**
   - Add one small `backend/tests/test_security.py` using httpx `AsyncClient` and ASGI transport.
   - Cover: cross-org diagnostics returns 404, a viewer gets 403 on mutations, the WebSocket rejects requests without a token, register creates a new org, login is rate-limited, and production refuses the default secret.

Lenses that never ran and still need a pass: injection and validation, transport/CORS/WS/service worker, secrets and supply chain, DoS and abuse, frontend client XSS, blue-team logging and hardening, backend performance, frontend performance, Apple-design UX, and a11y/RTL/i18n. The prompts for all of them are in the first workflow script, listed in section 7.

## 6. Environment notes

- **Sandbox has no internet.** `pip install` fails on DNS. Running pip outside the sandbox was refused by the permission classifier, so you need a machine with network access or the user's approval.
- **`backend/.venv` is an empty fresh venv.** The old one was broken because its interpreter path no longer existed, so it was deleted and recreated. Rebuild it with:
  ```bash
  cd backend && .venv/bin/pip install -r requirements.txt
  ```
- **Backend is currently running in Docker**, not the venv. The container is `zubie-audit-api`, built from the existing image `zubie-iran-backend:latest`, which has the exact pinned versions. `backend/app` is mounted read-only with `--reload`, so code edits apply live. It serves `127.0.0.1:8010` and uses SQLite at `/tmp/zubie.db` inside the container, so data resets when the container is removed.
  ```bash
  docker logs -f zubie-audit-api      # watch reloads and errors
  docker rm -f zubie-audit-api        # stop it
  ```
- **Frontend** runs with `npm run dev` on `127.0.0.1:3010`. The first compile of a page takes 60 to 120 seconds, so use `curl --max-time 180`.
- Demo login is `demo@zubie.ir` with `zubie1234`. `manager@zubie.ir` uses the same password.
- `backend/zubie.db` was deleted. It is gitignored and reseeds on the next local boot.
- A phantom staged `main.py` at the repo root was removed from the git index. It did not exist on disk.
- `skills-lock.json` is untracked and was left alone.
- The project has no `graphify-out/`, so the graphify rule in CLAUDE.md does not apply yet.

## 7. Artifacts from this session

Session directory: `~/.claude/projects/-home-makhataei-Projects-Mine-Iran-Zubie/6f9cf4e4-e500-43b5-a826-0b86fe49a1cb/`

- `workflows/scripts/zubie-audit-wf_8f5bea10-cb6.js` is the full 13-lens audit with 2-verifier adversarial checks and synthesis. Its prompts are reusable.
- `workflows/scripts/zubie-audit-2-wf_654567b1-61c.js` is a smaller 5-lens review covering performance, UX, a11y and blue-team. It failed before any agent finished.
- `subagents/workflows/wf_8f5bea10-cb6/journal.jsonl` holds the raw findings from the two lenses that completed.
- Workflow resume only works inside the same session. A new session has to re-run the scripts from scratch.

## 8. Suggested first prompt for the next model

> Read HANDOFF.md at the repo root. Verify the open findings in section 4 against the code. Then implement work packages 1, 2 and 4 from section 5 first, because they include the critical WebSocket leak, then 3, 5, 6 and 7. Run the backend in the `zubie-audit-api` container described in section 6, and add the security tests from package 8. Load the `apple-design` skill before package 6. Keep Persian copy aligned with the Persian UX vocabulary reference. Do not commit until I review.
