# Role reviews: product owner, tech lead, red team, blue team, QA

Each review lists what holds up, what to change, and where it stands today. "Done" means it is in this
branch and tested; "Backlog" means it is written down but not built.

## Product owner

**Who pays and who uses.** The buyer is the fleet owner; the daily users are dispatchers and drivers.
The role model (admin, manager, viewer) fits that: admins and managers act, viewers watch.

| Suggestion | Status |
|---|---|
| A new sign-up must not see another company's fleet | Done. Each sign-up gets its own organization. |
| A new account must not look broken | Done. Empty fleet states on overview, vehicles, drivers and map. |
| **A new customer cannot add vehicles, drivers or devices.** There is no create endpoint for them, so a fresh organization stays empty. | **Backlog, P0.** Vehicle and device registration, driver CRUD. Until then the product can only be demonstrated with the seeded demo organization. |
| **An admin cannot invite teammates.** Sign-up no longer joins an existing fleet, and nothing replaces it. | **Backlog, P0.** Invitation by email, with a role chosen by the admin. |
| Real telemetry | Backlog, P1. The feed is a simulator; the MQTT or HTTP ingest and device authentication are the MVP boundary. |
| Password reset and email verification | Backlog, P1. |
| Pricing and pilot-request form | Works; the form is rate limited. Leads are stored but no screen shows them, so someone must read the database until a back-office view exists. |
| Mobile apps | Backlog, P2. PWA is installable today; APK and IPA plan is in [`packaging.md`](packaging.md). |

Success measures to instrument first: sign-up to first vehicle added, weekly active managers, alerts acknowledged within an hour.

## Tech lead

**Shape.** A modular monolith: FastAPI with async SQLAlchemy, a Next.js App Router front end, an in-process telemetry
simulator. Reasonable for an MVP; the limits are explicit.

| Suggestion | Status |
|---|---|
| Keep one API worker until counters move out of process | Done and documented (compose, Dockerfile, README). |
| Move rate limits, token revocation and socket fan-out to Redis | Backlog, P1. Needed before a second worker. |
| Replace `create_all` at startup with Alembic migrations | Backlog, P1. |
| Push filters and aggregates into SQL, add composite indexes | Done. |
| One telemetry socket per dashboard, split status from feed | Done. |
| Generate the TypeScript API types from OpenAPI instead of maintaining `types.ts` by hand | Backlog, P2. |
| Add frontend tests (component and end-to-end) | Backlog, P1. Only the backend has tests today. |
| Metrics endpoint (Prometheus) and tracing | Backlog, P2. Logs are structured with request ids. |
| Move the simulator out of the API process once real ingest exists | Backlog, P1. |

Code-graph note: the knowledge graph in `graphify-out/` shows the most connected frontend nodes are the locale
hook, the class-name helper and the formatting helpers, so changes there have the widest blast radius.

## Red team

Summary of the attack: [`ATTACK_TREE.md`](ATTACK_TREE.md). Live results: [`PENTEST_RESULTS.md`](PENTEST_RESULTS.md), 38 of 38 probes pass.

| Observation | Status |
|---|---|
| The socket leak was the worst finding and is closed in four ways (token, origin, per-organization stream, caps) | Done |
| Token in `localStorage` is the largest remaining prize for an XSS | Mitigated by CSP and a short lifetime, open in principle. Backlog, P1: cookie session with CSRF protection. |
| Account lock-out: 8 failed logins in 5 minutes block that account for its real owner too | Open trade-off. Key the limiter by account and IP, or add step-up verification. |
| Distributed floods ignore per-IP limits | Open. Needs an edge limiter or WAF. |
| Restarting the API forgets revoked tokens | Open until revocation moves to Redis. |
| Lead form accepts any text | Accepted. It is stored, never rendered. Encode on output when a back-office view is added. |

## Blue team

| Control | Status |
|---|---|
| Structured access, auth, audit, websocket and error logs with request ids | Done |
| Generic 500 responses, traceback only in the log | Done |
| Security headers on API and web, HSTS in production | Done |
| Secrets: refuse weak keys in production, `.env` ignored, Gitleaks in CI | Done |
| Container: non-root, no extra capabilities, read-only root filesystem, resource limits, loopback ports | Done in the files; **not run here** because the Docker daemon was unavailable |
| Dependency and image scanning on every pull request and weekly | Done (workflow added; first run happens on GitHub) |
| Log shipping, retention, alert rules | Backlog, P1. Suggested alerts are in [`SECURITY_AUDIT.md`](SECURITY_AUDIT.md). |
| DAST (OWASP ZAP baseline) against staging | Backlog, P1 |
| Backups and restore test for Postgres | Backlog, P1 |

## QA hints

Automated today: 18 backend tests (tenancy, roles, socket authentication, rate limits, hardening, validation),
38 live probes, a CSV sanitiser check, and a type check plus production build of the front end.

Not automated, and worth a manual pass before a release:

| Area | Check |
|---|---|
| Roles by route | For admin, manager and viewer, open every dashboard page; writes are hidden for viewers; a forced write returns the localized "no permission" message |
| Empty organization | Register a new account; every page shows the empty fleet state, not blank charts or errors |
| Session expiry | Leave the dashboard open past the token lifetime; the socket closes, the next request returns 401, and the user lands on the login page |
| Logout | After logout the old token is refused and the offline page cache is gone |
| Rate limit messages | Fail login repeatedly in Persian and English; the 429 message is localized and no English server text appears |
| Password rules | Register with 9 characters, then a common password; the hint is shown, the server message is not |
| CSV | Export a report; open it in a spreadsheet; no cell executes |
| Geofence delete | Confirmation appears; Escape cancels; focus returns to the trigger |
| Keyboard and screen reader | Tab through the drawer, command palette and dialogs; focus stays inside and Escape closes; the connection status is announced |
| Motion and transparency | Turn on reduced motion, reduced transparency and high contrast in the OS; chrome becomes solid and animations become fades |
| RTL | Arrows and chevrons point the reading direction in Persian; numbers and time axes stay left to right |
| Light and dark | Every page, the map tiles and the charts in both themes; switch while a page is open |
| Responsive | 390 px, 768 px and desktop; no horizontal scroll; touch targets at least 44 px |
| Offline | Load the installed PWA, go offline; pages fall back to the cached copy, data does not appear stale |
| Load | 200 concurrent sockets and the analytics overview under load; none done yet |

Known gap in QA coverage: no browser-driven test ran in this session, so layout, motion and accessibility were
verified by type check and build only.
