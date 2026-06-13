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
- **`services/location`** — wrap `react-native-geolocation-service`: permission
  request + status, foreground GPS watch, current coordinate stream, and a
  `distanceTo(drop)` helper built on `utils/geo.haversineMeters` / `isWithin`.
  This service powers the whole core loop.
- **`services/api`** — axios instance, base URL per env, device-id header,
  error normalization, retry/backoff.
- **`services/maps`** — pick the provider (deferred deliberately: MapLibre /
  Mapbox / Google), implement the `MapAdapter` interface, and swap the
  decorative `MapTexture` SVG for a real map on the Map screen (keep the SVG as
  the onboarding backdrop — it's a design element there).
- **`services/notifications`** — local notification when the GPS watch detects
  an undiscovered secret within ~200 m ("quiet hum" setting).
- **`services/analytics`** — pick a sink (even just a logger first).

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
  promises "it never leaves your device" for *your* location — only drops have
  coordinates, reveals send a one-shot position check.

## 3. State & data wiring (Zustand + React Query are installed, unused)

- `store/` — session store (device id, onboarding done), location store
  (current coord, permission status), reveal store (discovered/saved ids).
- React Query: `QueryClientProvider` in `app/providers`, then per-feature
  hooks in `features/*/hooks` + `features/*/api` (nearby secrets, secret
  detail, create drop, save/heart, trail lists). Replace every piece of mock
  copy in the screens with these.

## 4. Make each screen real (UI exists, logic doesn't)

| Screen | Remaining |
|---|---|
| Welcome (01) | Skip onboarding when the flag is set; route straight to Main. |
| How it works (02) | Nothing — static by design. |
| Location (03) | "Allow while using the app" must trigger the real OS prompt via `services/location`; handle denied/blocked states ("Not now" path + re-prompt from settings). |
| Map (04) | Real map provider, real pins from the nearby query (only near ones, per the rules), live "you" dot from GPS, working layers button, count in the loc chip, range card appears only when actually within 50 m. |
| Walk (04a/b/c) | Drive beats from live GPS distance instead of taps; live distance pill + step count; footsteps from the actual walked path; out-of-range → in-range → arrived transitions from `isWithin`. |
| Walk closer (05) | Real distance/ETA, compass needle from magnetometer heading toward the drop, save action persisting to storage/API. |
| Opening (06) | Trigger only after a server-verified reveal; play once (not looped) then auto-advance; haptic on the snap. |
| Secret (07) | Real secret payload, increment "stood here", working save + heart mutations, the "read once · reseal or fade" rule. |
| Composer (08) | Replace the static text + fake caret with a real `TextInput` (keep the ruled-paper styling), char counter, mood persisted, drop pinned to the current GPS coordinate, submit mutation + optimistic Dropped screen. |
| Dropped (09) | Show the actual created drop; "Walk away" / "Drop another" already wired. |
| Trail (10) | Real found/saved/dropped lists from storage/API; tabs actually filter; real stats (steps needs a pedometer/health source — or drop the stat). |
| You (11) | Real device id from storage; settings rows become actual controls (map style, radius is fixed 50 m product-wide — display only?, notification mode); add report/erasure contact + privacy policy link. |

## 5. Native/platform setup still pending

- **Permissions** — `ACCESS_FINE_LOCATION` (+ `ACCESS_COARSE_LOCATION`) in
  `AndroidManifest.xml`; `NSLocationWhenInUseUsageDescription` in `Info.plist`.
  Camera/mic (vision-camera) only if/when a media feature ships — the house
  rules say "No photos. Just words.", so possibly remove vision-camera instead.
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
  + UGC make both stores strict about this).

## Suggested sequence

1. Storage + device id + onboarding flag (small, unblocks identity).
2. Location service + real permission flow on screen 03.
3. Backend MVP (drops + nearby + reveal) and API/Query wiring.
4. Map provider on screen 04; GPS-driven walk sequence.
5. Composer with real input → drop → trail lists.
6. Moderation pipeline before any public release.
7. Notifications, polish, e2e, release plumbing.
