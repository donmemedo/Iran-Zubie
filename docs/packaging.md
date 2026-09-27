# Packaging: PWA → APK → IPA

## 1. PWA — already shipped

The web build is installable as-is:

- `frontend/public/manifest.webmanifest` — name, RTL/`fa-IR` defaults, theme
  colours, maskable icon, and three shortcuts (live map, alerts, drivers).
- `frontend/public/sw.js` — stale-while-revalidate for the app shell,
  network-first with a fallback cache for API GETs, and no caching of mutations
  or the telemetry socket.
- `frontend/src/components/service-worker.tsx` registers it in production only,
  so dev hot-reload is never served from cache.
- `/app/settings` surfaces a native install button via `beforeinstallprompt`.

Verify with Lighthouse → Installable, or DevTools → Application → Manifest.

## 2. Android APK / AAB

Two routes. Capacitor is the better one here because the app benefits from
native background location and push later.

### Capacitor (recommended)

```bash
cd frontend
npm i -D @capacitor/cli && npm i @capacitor/core @capacitor/android
npx cap init "Zubie Iran" ir.zubie.fleet --web-dir=out
```

The app currently renders server-side. For a packaged build, point Capacitor at
the hosted origin instead of bundling the pages — set `server.url` in
`capacitor.config.ts` to the production API host and keep `cleartext: false`:

```ts
const config: CapacitorConfig = {
  appId: "ir.zubie.fleet",
  appName: "Zubie Iran",
  webDir: "out",
  server: { url: "https://app.zubieiran.ir", androidScheme: "https" },
};
```

Then:

```bash
npx cap add android
npx cap sync android
npx cap open android         # build the signed AAB/APK in Android Studio
```

Signing: generate an upload keystore, put it in `android/keystore.jks`, and
reference it from `android/app/build.gradle` via a gitignored
`keystore.properties`.

### Trusted Web Activity (faster, thinner)

`npx @bubblewrap/cli init --manifest https://app.zubieiran.ir/manifest.webmanifest`
produces a TWA that wraps the PWA with no native code. It needs a
`/.well-known/assetlinks.json` on the domain to hide the browser chrome. Good
enough if native background location is not required.

## 3. iOS IPA

```bash
cd frontend
npm i @capacitor/ios
npx cap add ios
npx cap sync ios
npx cap open ios             # archive and export in Xcode
```

Required before submission:

- An Apple Developer account and a distribution certificate + provisioning
  profile.
- `NSLocationWhenInUseUsageDescription` (and `...AlwaysAndWhenInUse` if
  background tracking ships) in `Info.plist`, with Persian strings in
  `fa.lproj/InfoPlist.strings`.
- App Transport Security: the API must be HTTPS. No cleartext exception.
- Apple rejects apps that are only a website wrapper, so ship at least one
  native capability — push notifications for critical alerts is the natural
  first one.

## 4. Shared next steps

| Item | Why |
|---|---|
| Push notifications (FCM + APNs) | Critical engine and towing alerts need to reach a phone that is not open |
| Background geolocation | Needed only if the *phone* becomes a tracker; the OBD key does not need it |
| Deep links | `zubie://vehicle/12` → `/fa/app/vehicles/12` |
| Crash + analytics | Sentry or an in-country equivalent, given the data-residency note in the business plan |
| Store listings | Persian screenshots, and Cafe Bazaar / Myket alongside Play for the Iranian market |
