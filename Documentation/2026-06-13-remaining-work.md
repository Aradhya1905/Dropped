# Dropped — Remaining work to a complete app

_2026-06-13_

Where things stand: all 14 design screens + navigation are done
([2026-06-12-screens-and-navigation.md](2026-06-12-screens-and-navigation.md)),
but they are **UI shells with mock copy** — no GPS, no backend, no state, no
real map. This is the gap list from here to a shippable app, roughly in build
order. Architecture context: [2026-05-31-architecture.md](2026-05-31-architecture.md).

## 1. Services layer (adapters are empty barrels today)

- **`services/storage`** — MMKV wrapper. First real need: generate + persist the
  **anonymous device id** (the app's only identity), onboarding-complete flag,
  saved/seen-secrets cache, settings (map style, radius, notification mode).
- **`services/location`** ✅ **Done (2026-06-14)** — wraps
  `react-native-geolocation-service`: `requestPermission()`
  (granted/denied/blocked), `getCurrent()`, `watch()`, plus `distanceTo` /
  `isWithinDrop` over `utils/geo`. Reverse-geocoding added in `services/maps`
  (Nominatim, no key) + a `useDeviceLocation()` hook in `features/map/hooks`
  that ties permission + watch + address together. See
  [2026-06-14-location-and-address.md](2026-06-14-location-and-address.md).
- **`services/api`** — axios instance, base URL per env, device-id header,
  error normalization, retry/backoff.
- **`services/maps`** ✅ **Done (2026-06-13)** — MapLibre GL +
  Protomaps CDN tiles. `useMaplibreAdapter()` hook returns `MaplibreView`
  (drop-in background component) and a `MapAdapter` (flyTo / setMarkers /
  getCenter). Style JSON at `services/maps/droppedStyle.ts` matches the
  paper/ink/sage palette exactly (paper ground, sage water/parks, muted roads,
  no POI labels). `MapScreen` and `WalkSequenceScreen` both use `MaplibreView`
  as their map background; all RN overlay components (pins, cards, FABs, route
  line) are unchanged above it. `MapTexture` SVG kept on onboarding screens
  as a design element. **Remaining:** add `PROTOMAPS_API_KEY` (free signup at
  protomaps.com), add `ACCESS_FINE_LOCATION` / `NSLocationWhenInUseUsageDescription`
  permissions (§5), then wire live GPS → camera center + real pins from nearby
  query (§4 Map row).
- **`services/notifications`** — local notification when the GPS watch detects
  an undiscovered secret within ~200 m ("quiet hum" setting).

## 2. Backend (doesn't exist yet — biggest missing piece)

- API: create drop (text ≤ ~280 chars, mood, coordinate), **geo query** for
  secrets near a point (PostGIS / geohash), reveal endpoint (server-side 50 m
  verification so clients can't spoof), counters (reveals, "stood here",
  hearts), save/heart endpoints keyed by device id.
- Anonymous identity: device-id registration, rate limiting (drops per
  device/day), abuse throttles.
- **Moderation pipeline — the hard problem per the brief**: text filtering on
  ingest (profanity/PII/threats), a report flow, human review queue,
  "cruelty gets erased" enforcement, shadow-removal. Needs its own design doc
  before the composer goes live.
- Privacy posture: store coordinates fuzzed/snapped if possible; the design
  promises "it never leaves your device" for _your_ location — only drops have
  coordinates, reveals send a one-shot position check.

## 3. State & data wiring (Zustand + React Query are installed, unused)

- `store/` — session store (device id, onboarding done), location store
  (current coord, permission status), reveal store (discovered/saved ids).
- React Query: `QueryClientProvider` in `app/providers`, then per-feature
  hooks in `features/*/hooks` + `features/*/api` (nearby secrets, secret
  detail, create drop, save/heart, trail lists). Replace every piece of mock
  copy in the screens with these.

## 4. Make each screen real (UI exists, logic doesn't)

| Screen            | Remaining                                                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Welcome (01)      | Skip onboarding when the flag is set; route straight to Main.                                                                                                                                                      |
| How it works (02) | Nothing — static by design.                                                                                                                                                                                        |
| Location (03)     | ✅ **Done (2026-06-14)** — "Allow" fires the real OS prompt via `services/location`; granted warms GPS + enters app, blocked shows the themed `LocationPermissionSheet` → Settings, denied stays for retry / "Not now".                                                      |
| Map (04)          | ✅ Real map provider (MapLibre + Protomaps) + ✅ **live location (2026-06-14)**: loc chip shows the real reverse-geocoded address, camera centers on the first GPS fix. Remaining: real pins from nearby query, live "you" dot, loc-chip count, range card only when actually within 50 m — all need the backend. |
| Walk (04a/b/c)    | ✅ **Real place label (2026-06-14)** in the status header. **Still scripted (tap-to-advance):** distance pill + step count + beat transitions — these wait on a real drop target (backend). Then drive beats from live GPS distance via `isWithin`, footsteps from the walked path.                         |
| Walk closer (05)  | Real distance/ETA, compass needle from magnetometer heading toward the drop, save action persisting to storage/API.                                                                                                |
| Opening (06)      | Trigger only after a server-verified reveal; play once (not looped) then auto-advance; haptic on the snap.                                                                                                         |
| Secret (07)       | Real secret payload, increment "stood here", working save + heart mutations, the "read once · reseal or fade" rule.                                                                                                |
| Composer (08)     | Replace the static text + fake caret with a real `TextInput` (keep the ruled-paper styling), char counter, mood persisted, drop pinned to the current GPS coordinate, submit mutation + optimistic Dropped screen. |
| Dropped (09)      | Show the actual created drop; "Walk away" / "Drop another" already wired.                                                                                                                                          |
| Trail (10)        | Real found/saved/dropped lists from storage/API; tabs actually filter; real stats (steps needs a pedometer/health source — or drop the stat).                                                                      |
| You (11)          | Real device id from storage; settings rows become actual controls (map style, radius is fixed 50 m product-wide — display only?, notification mode); add report/erasure contact + privacy policy link.             |

## 5. Native/platform setup still pending

- **Permissions** — ✅ **Location done (2026-06-14)**: `ACCESS_FINE_LOCATION` +
  `ACCESS_COARSE_LOCATION` in `AndroidManifest.xml`;
  `NSLocationWhenInUseUsageDescription` filled in `Info.plist` (iOS needs
  `pod install` on a Mac to verify). Camera/mic (vision-camera) only if/when a
  media feature ships — the house rules say "No photos. Just words.", so
  possibly remove vision-camera instead.
- **Worklets babel plugin** — add `react-native-worklets/plugin` only when
  something actually uses reanimated (current animations are core Animated).
- **iOS** — `pod install`, first device build, verify fonts' PostScript names
  resolve, safe-area/Dynamic Island check on the walk screens.
- **Housekeeping** — `package.json` `installDebugApkAndStart` still references
  `com.motocar` (stale; app id is `com.dropped`); app icon + splash screen;
  app display name review.

## 6. Quality & release

- **Tests** — geo utils edge cases exist; add component tests per screen
  (render + navigation actions), reveal-radius logic tests, and an e2e happy
  path (Maestro/Detox): onboard → see pin → walk (mock GPS) → reveal → drop.
- **Polish** — loading/empty/error states for every query, offline behavior,
  reduced-motion setting (design has a `no-motion` concept), accessibility
  labels on the icon-only buttons, Android back-button audit, deep links to a
  drop (share "walk here" links?).
- **Performance** — audit the always-on Animated loops (pause off-screen via
  `useIsFocused`), memoize SVG-heavy components, profile the Map screen.
- **Release** — signing configs, CI (typecheck + lint + jest on PR), versioned
  release builds, store listings; privacy policy + data-safety forms (location
  - UGC make both stores strict about this).

## Suggested sequence

1. Storage + device id + onboarding flag (small, unblocks identity).
2. ✅ Location service + real permission flow on screen 03 — done (2026-06-14);
   reverse-geocoded address shown on Map + Walk.
3. Backend MVP (drops + nearby + reveal) and API/Query wiring.
4. ✅ Map provider (MapLibre + Protomaps) on screen 04 — done. Next: GPS-driven walk sequence + real nearby pins.
5. Composer with real input → drop → trail lists.
6. Moderation pipeline before any public release.
7. Notifications, polish, e2e, release plumbing.
