# Threat intelligence lifecycle for this project

A small, practical version of the six-phase cycle (direction, collection, processing, analysis, dissemination,
feedback), sized for a two-service web application.

## Direction: what we need to know

| ID | Question | Owner |
|---|---|---|
| PIR-1 | Does a newly published vulnerability affect a package we ship? | Tech lead |
| PIR-2 | Is any vulnerability in our stack being exploited in the wild? | Tech lead, blue team |
| PIR-3 | Are our credentials, tokens or demo passwords exposed? | Blue team |
| PIR-4 | Which attack patterns target multi-tenant telemetry and fleet platforms? | Red team |

## Collection

| Source | Feeds | How it is collected today |
|---|---|---|
| OSV and PyPI advisories | PIR-1 | `pip-audit` in CI, on every pull request and weekly |
| GitHub advisory database | PIR-1 | `npm audit`, Dependabot alerts and update pull requests |
| Trivy vulnerability database | PIR-1, PIR-2 | Image scans in CI, with an SBOM (CycloneDX) as an artifact |
| CISA Known Exploited Vulnerabilities catalog | PIR-2 | Backlog: check new advisories against the KEV list during triage |
| Gitleaks | PIR-3 | CI on full history |
| Application logs | PIR-3, PIR-4 | `zubie.auth` and `zubie.ws` events (see [`SECURITY_AUDIT.md`](SECURITY_AUDIT.md)) |

## Processing

CI deduplicates by package and advisory id, gates on severity (critical blocks the merge for the front end,
high and above for images), and keeps the machine-readable output as a build artifact.

## Analysis: triage rules

An advisory moves up when the vulnerable code is reachable, the component faces the internet, or it appears in
the KEV list. It moves down when it needs attacker control of build inputs or only affects tooling (`pip`, test-only
packages). The PostCSS advisories in Next.js were fixed with an `overrides` entry rather than accepted. Every downgrade is written in the accepted-risk table in `SECURITY_AUDIT.md`.

## Dissemination and response time

| Severity | Patch within | Where it is announced |
|---|---|---|
| Critical, or exploited in the wild | 48 hours | Pull request titled with the advisory id, release note |
| High | 7 days | Dependabot pull request |
| Medium | 30 days | Next planned upgrade |
| Low | Next dependency sweep | Accepted-risk table |

## Feedback

After each incident or false positive, update the allow-list (`.gitleaks.toml`), the accepted-risk table, or the
pen-test probes so the same issue is caught earlier next time. Review the PIRs each quarter.
