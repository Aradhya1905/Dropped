# Dropped — Live location, address & permission sheet

_2026-06-14_

The map screens shipped UI-only with hardcoded copy ("Bedford & N 7th",
"78 m to go") and a tap-to-advance walk. This pass makes the **device's own
location real**: a GPS fix, a reverse-geocoded **address**, a themed
**permission bottom sheet**, and that data shown on the Map and Walk screens.
Pin positions and nearby `count` stay mock — they need a backend
([2026-06-13-remaining-work.md](2026-06-13-remaining-work.md) §2).

## What already existed (reused, not rebuilt)

- `react-native-geolocation-service@^5.3.1` — already in `package.json`.
- `services/location/index.ts` — already a **complete** wrapper, not a stub:
  `requestPermission()` (granted | denied | blocked), `getCurrent()`, `watch()`,
  `distanceTo()`, `isWithinDrop()`. Normalizes to `Coordinate {lat,lng}` and
  delegates distance math to `utils/geo`. **No edits needed.**
- `useMaplibreAdapter()` already exposed `flyTo` — the Map screen just wasn't
  calling it. `react-native-modal` already a dep.

## New

### Reverse geocoding — `services/maps/`

- **`reverseGeocode.ts`** — `getAddressFromCoords(coord)` → OpenStreetMap
  Nominatim (`/reverse`, `jsonv2`, `addressdetails`). Dependency-free (bare
  `fetch`), **no API key**. Returns `{ formatted, shortAddress, parts, coords }`;
  `shortAddress` is a compact "road, area, city" line for the loc chip. Custom
  `ReverseGeocodeError`; handles invalid coords, HTTP errors, timeout, and
  caller `AbortSignal`. User-Agent `Dropped/1.0 (com.dropped)` per Nominatim
  policy.
- **`useReverseGeocode(coord, opts)`** — React hook over the above:
  `{ address, loading, error, refetch }`. Debounces (default off; 800 ms in
  use), rounds coords to ~4 dp (~11 m) so jitter doesn't refetch, aborts stale
  requests on coord change / unmount.
- Both barrelled from `services/maps/index.ts`.

> Nominatim allows ~1 req/sec. The debounce + coord-rounding cover a single
> user in dev. For production scale, swap to a keyed/self-hosted geocoder.

### Location hook — `features/map/hooks/useDeviceLocation.ts`

The one hook a screen calls. Owns permission + a live position `watch()` +
address in one place, all through the `services/*` adapters (no SDK touched
directly — house rule). Returns
`{ status, coord, shortAddress, fixing, request, refresh }`:

- `request()` — asks permission; on `granted` starts the watch, returns the
  outcome so the caller can route `blocked` → Settings.
- `refresh()` — one-shot `getCurrent()` re-fix (e.g. recenter).
- Tears down the watch on unmount; never stacks two watches.

### Permission sheet — `features/map/components/LocationPermissionSheet.tsx`

Paper bottom sheet, **presentational** (logic stays with the caller). Built on
the design system's `Sheet` + `Grabber` + `AppButton` + `WaxSeal` in the
paper/ink/sage palette — no vendor sheet styling. Restates the
drop → walk → reveal promise: three benefit rows ("Find secrets around you" /
"Walk within 50 m to reveal" / "Anonymous by design"). Props `visible`, `busy`,
`blocked`, `onEnable`, `onClose`. When `blocked`, copy + CTA point at Settings.

## Wiring

- **Location screen (03)** — `LocationScreen.tsx`: "Allow while using the app"
  now fires the real `requestPermission()`. `granted` → warm GPS with
  `getCurrent()`, enter the app. `blocked` → show `LocationPermissionSheet`
  whose Enable opens `Linking.openSettings()`. `denied` → stay so they can
  retry or pick "Not now". Button shows "Asking…" while the OS dialog is up.
- **Map screen (04)** — `MapScreen.tsx`: calls `useDeviceLocation()`; loc chip
  shows the real `shortAddress` ("Locating…" until a fix), and the camera
  `flyTo`s the first real fix. Pins / range visuals unchanged (no backend
  drops). Guards a missing permission with a `refresh()` on mount.
- **Walk screen (04a/b/c)** — `WalkSequenceScreen.tsx`: status header `place`
  uses the real `shortAddress` (falls back to scripted copy). **Distance and
  beat transitions stay scripted (tap-to-advance)** — by decision, to avoid
  inventing a fake drop target before the backend exists.

## Native permission strings

- **Android** — `AndroidManifest.xml`: added `ACCESS_FINE_LOCATION` +
  `ACCESS_COARSE_LOCATION`. (Runtime request handled in JS.)
- **iOS** — `Info.plist`: filled the empty `NSLocationWhenInUseUsageDescription`.
  `pod install` still needed on a Mac; only the Android path is testable on the
  current Windows box.

## Verify

`yarn android` → onboarding → Location → "Allow" → OS dialog → grant → land on
Map with the **real street/area** in the loc chip and the camera centered on
you. Deny-with-never-ask-again → themed sheet → Enable opens Settings. Walk
screen header shows the real place; tap-to-advance beats still work. Airplane
mode → "Locating…" fallback, no crash.

Status at write time: `tsc --noEmit` clean; eslint 0 errors (only pre-existing
inline-style warnings on untouched lines). Not yet run on a device.

## Still open (unchanged from the roadmap)

Real nearby pins, live "you" dot from the watch, the loc-chip count, and
GPS-driven walk beats all wait on the **backend** (nearby query + drops). See
[2026-06-13-remaining-work.md](2026-06-13-remaining-work.md) §2 and §4.
