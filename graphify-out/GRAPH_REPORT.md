# Graph Report - Iran-Zubie  (2026-10-22)

## Corpus Check
- 130 files · ~50,600 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 12 file(s) not represented in the graph (top: (none) 6, .example 3, .toml 1)

## Summary
- 715 nodes · 2257 edges · 35 communities (22 shown, 13 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Dashboard Route Pages
- Fleet API and Role Checks
- Settings and Config
- Service Worker and Fleet Map
- Auth Dependencies
- Frontend Dependencies
- Landing Page and Hero
- Models and Seed Data
- Auth Routes
- Analytics API
- Locale Layout and Fonts
- Login and Dashboard Shell
- TypeScript Config
- Next Security Headers
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 30

## God Nodes (most connected - your core abstractions)
1. `useLocale()` - 78 edges
2. `clsx()` - 59 edges
3. `react` - 42 edges
4. `formatNumber()` - 36 edges
5. `Skeleton()` - 30 edges
6. `formatDecimal()` - 27 edges
7. `OverviewView()` - 26 edges
8. `pick()` - 25 edges
9. `useApi()` - 25 edges
10. `lucide-react` - 24 edges

## Surprising Connections (you probably didn't know these)
- `lifespan()` --uses--> `Base`  [INFERRED]
  backend/app/main.py → backend/app/db/base.py
- `_authenticate()` --calls--> `client_ip()`  [EXTRACTED]
  backend/app/api/auth.py → backend/app/core/ratelimit.py
- `_authenticate()` --indirect_call--> `verify_password()`  [INFERRED]
  backend/app/api/auth.py → backend/app/core/security.py
- `register()` --calls--> `client_ip()`  [EXTRACTED]
  backend/app/api/auth.py → backend/app/core/ratelimit.py
- `register()` --indirect_call--> `hash_password()`  [INFERRED]
  backend/app/api/auth.py → backend/app/core/security.py

## Import Cycles
- None detected.

## Communities (35 total, 13 thin omitted)

### Community 0 - "Dashboard Route Pages"
Cohesion: 0.08
Nodes (94): Page(), Page(), Page(), Loading(), Page(), Page(), DashboardPage(), Page() (+86 more)

### Community 1 - "Fleet API and Role Checks"
Cohesion: 0.08
Nodes (30): require_role(), acknowledge_alert(), complete_maintenance(), create_geofence(), delete_geofence(), get_driver(), get_vehicle(), list_alerts() (+22 more)

### Community 2 - "Settings and Config"
Cohesion: 0.06
Nodes (20): get_settings(), Settings, bearer(), client(), demo(), login(), manager(), _reset_login_limits() (+12 more)

### Community 3 - "Service Worker and Fleet Map"
Cohesion: 0.07
Nodes (40): PRECACHE, put(), buildVehicleIcon(), FENCE_TOKENS, FitBounds(), FleetMap(), FleetMapProps, FlyTo() (+32 more)

### Community 4 - "Auth Dependencies"
Cohesion: 0.09
Nodes (7): current_user(), user_from_token(), telemetry_socket(), decode_access_token(), token_claims(), _sqlite_pragmas(), encode()

### Community 5 - "Frontend Dependencies"
Cohesion: 0.05
Nodes (38): dependencies, framer-motion, leaflet, lucide-react, next, react, react-dom, react-leaflet (+30 more)

### Community 6 - "Landing Page and Hero"
Cohesion: 0.14
Nodes (27): LandingPage(), DEMO_BOUNDS, Hero(), seedDemoFleet(), useDemoFleet(), Field(), LeadForm(), LeadFormCard() (+19 more)

### Community 7 - "Models and Seed Data"
Cohesion: 0.22
Nodes (18): Base, TimestampMixin, _badge(), _fa_number(), _make_plate(), _score_from_events(), seed_database(), _walk() (+10 more)

### Community 8 - "Auth Routes"
Cohesion: 0.15
Nodes (15): _authenticate(), _load(), login(), logout(), me(), register(), token(), create_access_token() (+7 more)

### Community 9 - "Analytics API"
Cohesion: 0.12
Nodes (14): alert_mix(), _delta(), maintenance_forecast(), overview(), score_distribution(), timeseries(), FleetOverview, SeriesPoint (+6 more)

### Community 10 - "Locale Layout and Fonts"
Cohesion: 0.18
Nodes (14): generateMetadata(), latin, LocaleLayout(), persian, viewport, getDictionary(), defaultLocale, dirOf() (+6 more)

### Community 11 - "Login and Dashboard Shell"
Cohesion: 0.24
Nodes (13): LoginPage(), DEMO, LoginView(), DashboardShell(), initials(), Aurora(), SiteHeader(), localeNames (+5 more)

### Community 12 - "TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 13 - "Next Security Headers"
Cohesion: 0.18
Nodes (12): apiOrigin, contentSecurityPolicy, nextConfig, securityHeaders, wsOrigin, AppLayout(), AuthGuard(), SiteFooter() (+4 more)

### Community 14 - "Community 14"
Cohesion: 0.19
Nodes (13): Providers(), ServiceWorkerRegistrar(), getToken(), setToken(), AuthContext, AuthProvider(), LocaleProvider(), systemTheme() (+5 more)

### Community 15 - "Community 15"
Cohesion: 0.23
Nodes (10): isActive(), NavItem, en, Dictionary, fa, Widen, dictionaries, Locale (+2 more)

### Community 16 - "Community 16"
Cohesion: 0.25
Nodes (6): b64(), forged_token(), main(), record(), run(), ws_probe()

### Community 17 - "Community 17"
Cohesion: 0.37
Nodes (9): CommandPalette(), Entry, navItems, ConfirmDialog(), fade, spring, useShift(), useFocusTrap() (+1 more)

### Community 19 - "Community 19"
Cohesion: 0.18
Nodes (4): create_lead(), plans(), get_session(), LeadCreate

### Community 20 - "Community 20"
Cohesion: 0.22
Nodes (4): client_ip(), rate_limit(), dependency(), RateLimiter

### Community 23 - "Community 23"
Cohesion: 0.20
Nodes (8): WS_URL, AsyncState, Feed, FeedContext, StatusContext, TelemetryMap, useTelemetryStatus(), TelemetryVehicle

### Community 24 - "Community 24"
Cohesion: 0.43
Nodes (6): Page(), InstallPromptEvent, Row(), SettingsView(), Toggle(), switchLocalePath()

## Knowledge Gaps
- **10 isolated node(s):** `react-dom`, `@fontsource-variable/inter`, `@fontsource-variable/vazirmatn`, `@tailwindcss/postcss`, `@types/leaflet` (+5 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 223 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Dashboard Route Pages` to `Service Worker and Fleet Map`, `Frontend Dependencies`, `Landing Page and Hero`, `Login and Dashboard Shell`, `Next Security Headers`, `Community 14`, `Community 15`, `Community 17`, `Community 23`, `Community 24`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **What connects `react-dom`, `@fontsource-variable/inter`, `@fontsource-variable/vazirmatn` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Dashboard Route Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.08256018790369936 - nodes in this community are weakly interconnected._
- **Why does `useLocale()` connect `Dashboard Route Pages` to `Service Worker and Fleet Map`, `Landing Page and Hero`, `Login and Dashboard Shell`, `Next Security Headers`, `Community 14`, `Community 15`, `Community 17`, `Community 24`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Should `Fleet API and Role Checks` be split into smaller, more focused modules?**
  _Cohesion score 0.08246753246753247 - nodes in this community are weakly interconnected._
- **Why does `next` connect `Next Security Headers` to `Dashboard Route Pages`, `Frontend Dependencies`, `Landing Page and Hero`, `Locale Layout and Fonts`, `Login and Dashboard Shell`, `Community 14`, `Community 17`, `Community 24`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Should `Settings and Config` be split into smaller, more focused modules?**
  _Cohesion score 0.057329462989840346 - nodes in this community are weakly interconnected._