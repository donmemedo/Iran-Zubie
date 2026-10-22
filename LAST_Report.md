# LAST_Report: Iran-Zubie red/blue-team hardening, performance and UX pass

Branch `security/redblue-hardening`. Everything below was verified by running it; what was not verified is listed under "Not done".

## Outcome

The app was audited, attacked and fixed. The worst problems (an open WebSocket leaking every tenant's GPS, a sign-up that joined the demo fleet, a guessable signing secret, missing role checks, a cross-tenant read) are closed and covered by tests. The backend, the frontend build and a real browser session all pass their checks. Two product gaps remain that matter before a first customer: nobody can add vehicles or invite teammates yet.

## What you asked for, and where it stands

| Ask | Status |
|---|---|
| Red-team and blue-team audit, pen test, fix everything | Done for everything found. Findings, fixes and residual risk: `docs/SECURITY_AUDIT.md`, `docs/ATTACK_TREE.md`, `docs/PENTEST_RESULTS.md` |
| Performance added to every security change | Done, with a table in `docs/SECURITY_AUDIT.md` |
| UI/UX with apple-design, Persian vocabulary guide | Partly. Motion, focus handling, reduced motion and transparency, empty and error states, role-aware actions and Persian copy were applied. The visual design itself was not redone. |
| Use `HANDOFF.md` | Done. It is filed as `docs/HANDOFF.md` and marked superseded. |
| Report of the complete FastAPI and Next.js implementation, with PO, tech lead, red, blue and QA input | `docs/IMPLEMENTATION_REPORT.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/ROLE_REVIEWS.md`, `docs/THREAT_INTEL.md` |
| README, compose file, backend and frontend folders | Present and updated |
| `LAST_Report.md` with memory | This file. There is no saved memory: the memory directory is empty. |
| New branch, push, PR | Done |
| PWA, APK, IPA | PWA works. APK and IPA were not built; the plan is in `docs/packaging.md`. |

## What happened, in order

1. **Earlier session (2026-10-02).** A 13-lens audit workflow ran out of usage after two lenses. Auth hardening was done and a `HANDOFF.md` written.
2. **This session.** The usage limit hit several times, and a weekly limit hit once, so work paused and resumed. A first fix workflow finished only the real-time package. I finished the rest directly and re-ran the UX work, which also died early, by hand.
3. **Stops.** Twice a response of mine was cut by a safety classifier and once a `/model` change happened (to Opus, later shown as Sonnet). I did not change the model myself, and I did not skip anything on safeguard grounds. Everything not done was lack of time or access, listed below.

## What was done

**Backend (FastAPI)**
- WebSocket needs a token and an allowed `Origin`, each organization gets only its own vehicles, with connection caps, expiry close and send timeouts.
- Own organization per sign-up, role checks on four write routes, diagnostics scoped by organization, unknown fields rejected, bounded and validated inputs.
- PyJWT with issuer, audience and `jti`; logout revokes; bcrypt with a 72-byte guard; per-IP and per-account rate limits; common passwords refused.
- Edge middleware: security headers, request id, 256 KB body cap, generic 500s, structured access, auth, audit and websocket logs; docs, `/health` and CORS locked down; `/health/ready` added.
- Production refuses weak secrets and wildcard CORS, and no longer plants the public demo accounts.
- Performance: per-organization single serialization, dirty-row bulk flush, SQL aggregates, composite indexes, SQLite WAL, selective gzip, thread-pooled hashing.
- Dependencies: 48 advisories cleared (PyJWT replaces python-jose, bcrypt direct, FastAPI 0.142.4, Starlette 1.7.0, python-multipart 0.0.32).

**Frontend (Next.js)**
- Next.js 15.5.27 and React 19.1.9; strict CSP and security headers; fonts bundled locally.
- One authenticated telemetry socket per dashboard with a separate status context; landing hero uses a local demo simulation instead of the private socket.
- Service worker no longer caches authenticated data, pages are network-first, logout clears caches; 401 ends the session everywhere; logout revokes the token.
- Safe CSV export, localized 429/401/409/422 messages, no demo password in production, role-aware actions, geofence delete confirmation, empty-fleet, loading and error states, focus traps, 44 px targets, reduced motion and transparency.

**Infrastructure and CI**: multi-stage non-root Dockerfiles, hardened compose with required secrets and loopback ports, env templates, GitHub Actions for tests, lint, types, Bandit, Semgrep, `pip-audit`, `npm audit`, Gitleaks and Trivy, Dependabot, SBOM.

**Knowledge graph**: `graphify-out/` (715 nodes, 2,257 edges, 35 communities, code only). Docs and icons were not semantically extracted.

**Ponytail review**: the diff was mostly lean. One dead helper was deleted. The remaining candidates are one-off helpers such as the async wrapper used by a single view; none are worth the churn.

## Evidence

| Check | Result |
|---|---|
| Backend tests | 39 pass, 83% coverage (floor in CI: 80%) |
| Lint and types | `ruff` clean, `mypy` clean |
| Bandit | 0 high, 0 medium, 9 low (accepted, explained in the audit) |
| Dependency audit | Nothing in `requirements.txt`; `pip` and test-only `certifi` flagged in the local venv. Frontend: 0 vulnerabilities (the two PostCSS advisories bundled by Next.js are fixed by an `overrides` entry in `package.json`) |
| Live pen test | 38 of 38 probes pass against a production-mode server |
| Browser run | 17 of 17 checks pass in Chrome on the production build: no CSP violations, no uncaught exceptions, login, socket, 6 pages, 390 px, empty organization, bad token. Screenshots in `docs/screenshots/` |
| Frontend build | `tsc` clean, `next build` succeeds for every route (first-load JS about 104 to 173 kB) |
| Compose | `docker compose config` valid |

## Not done

- **Docker was not run.** The daemon was not running, so the images, the read-only filesystems and the healthchecks are untested.
- **Semgrep did not finish** in the sandbox; it runs in CI. No ZAP scan, no load test, no accessibility scanner.
- **Not finished from the plan:** lazy-loaded animation library, memoized charts, per-view Apple-design polish beyond the shared pieces, an automated frontend test suite.
- **Product gaps (P0):** no way to add vehicles or devices, no teammate invitations, telemetry still simulated.
- **Open security items:** token in `localStorage`, in-process rate limit and revocation list (one worker only), account lock-out trade-off, inline-script CSP, no MFA or password reset. See `docs/SECURITY_AUDIT.md`.
- **Skills:** every skill you listed was loaded. The one exception in practice is the forked `/security-audit` run, which died on a usage limit at the start; its scope was covered by the other security skills and my own review.
- `skills-lock.json` was left untracked on purpose.

## What you need to do

1. Review and merge the pull request.
2. Your local `.env` still has the old placeholder secret. The compose stack now runs in production mode and will refuse it. Generate real values with `python -c "import secrets; print(secrets.token_urlsafe(48))"` and fill `POSTGRES_PASSWORD`, `ZUBIE_SECRET_KEY` and `ZUBIE_CORS_ORIGINS`.
3. Run `docker compose up --build` once and tell me if anything fails to start.
4. Decide whether vehicle registration and team invitations come next.
