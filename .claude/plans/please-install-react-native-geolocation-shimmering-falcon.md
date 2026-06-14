# Plan — Real location: GPS fix, OSM address, themed permission sheet

## Context
Dropped's map screens are UI-only with hardcoded copy ("Bedford & N 7th", "78 m to go")
and a scripted tap-to-advance walk. User wants **real** device location: a current-position
fix, a human-readable **address** (via OpenStreetMap, no API key), a **themed permission
bottom sheet**, and that data shown on `MapScreen` + `WalkSequenceScreen`.

Good news — half the plumbing already exists:
- `react-native-geolocation-service@^5.3.1` is **already in package.json**.
- `src/services/location/index.ts` is a **complete** wrapper (`requestPermission`,
  `getCurrent`, `watch`, `distanceTo`, `isWithinDrop`) — not a stub. No edits needed.
- `src/utils/geo.ts` (haversine, isWithin) and `src/types` (`Coordinate {lat,lng}`,
  `REVEAL_RADIUS_M = 50`) are in place.

What's missing: reverse-geocoding, a React hook tying permission+watch+address together,
the permission sheet, manifest/plist permission strings, and the actual screen wiring.

The MotoCar project (`C:\My_Projects\MotoCar`) has a proven Nominatim reverse-geocoder,
a `useReverseGeocode` hook, and a `LocationPermissionSheet` — port the **logic**, re-skin
to Dropped's paper/ink/sage design system.

User decisions (locked):
- **Walk screen**: keep the design's fixed visuals + tap-to-advance; only swap the
  hardcoded distance/place text for **real distance + real address**.
- **Permission trigger**: the **Location onboarding screen** (`LocationScreen.tsx`), whose
  "Allow while using the app" CTA is currently a no-op `navigation.replace('Main')`.

`react-native-geolocation-service` is already installed — **do not reinstall**. (Run
`yarn install` only if node_modules is stale.)

---

## 1. Reverse geocode — `src/services/maps/reverseGeocode.ts` (new)
Port MotoCar's `reverseGeocode.ts` almost verbatim (dependency-free, bare `fetch` to
Nominatim `https://nominatim.openstreetmap.org/reverse`). Changes for Dropped:
- `USER_AGENT = 'Dropped/1.0 (com.dropped)'` (Nominatim policy requires an identifying UA).
- Accept Dropped's `Coordinate {lat,lng}` shape (MotoCar used `{latitude,longitude}`) —
  map `lat→lat`, `lng→lon` in the query params. Keep returning
  `{ formatted, shortAddress, parts, coords }` and the `ReverseGeocodeError` class.
- Keep `buildShortAddress` → e.g. "Bedford Ave, Williamsburg, Brooklyn". This feeds LocChip.

## 2. Address hook — `src/services/maps/useReverseGeocode.ts` (new)
Port MotoCar's hook. Returns `{ address, loading, error, refetch }`, debounces, rounds
coords to ~4 dp, aborts stale requests. Input type = Dropped `Coordinate | null`.

Export both from `src/services/maps/index.ts`:
```ts
export { getAddressFromCoords, ReverseGeocodeError } from './reverseGeocode';
export type { ResolvedAddress, AddressParts } from './reverseGeocode';
export { useReverseGeocode } from './useReverseGeocode';
```

## 3. Location hook — `src/features/map/hooks/useDeviceLocation.ts` (new)
The "nice hook" the user asked for. One hook owns permission + position + address:
- State: `status: PermissionStatus | 'unknown'`, `coord: Coordinate | null`,
  `fixing: boolean`, plus `address/loading` via `useReverseGeocode(coord)`.
- `request()` → calls `services/location.requestPermission()`; on `granted` starts a
  `watch()` (or one-shot `getCurrent()`), on `blocked` exposes that so caller can offer
  Settings. On unmount, clear the watch.
- `refresh()` → one-shot `getCurrent()` for a manual re-fix.
- Returns `{ status, coord, address, shortAddress, fixing, request, refresh }`.
Reuses `services/location` + `useReverseGeocode` — no SDK touched directly (CLAUDE.md rule).
Barrel it from `src/features/map/hooks/index.ts`.

## 4. Permission sheet — `src/features/map/components/LocationPermissionSheet.tsx` (new)
Port MotoCar's `LocationPermissionSheet` **structure**, reskinned to Dropped:
- Bottom sheet via `react-native-modal` (already a dep) wrapping the existing
  **`Sheet` + `Grabber`** primitives from `design-system/components/chrome.tsx`.
- Buttons = Dropped **`AppButton`** (`primary` + `dot` for Enable, `ghost` for "Maybe later").
- Icons from `design-system/icons` (`PinIcon`, `LockIcon`, `WalkIcon`, `AnonLockIcon`).
- Colors/fonts from `tokens` (paper/ink/sage) — **no MotoCar saffron/danger**.
- Dropped copy, e.g.:
  - Title: "Turn on location to read what's near you"
  - Sub: "We only peek at where you're standing — just enough to break the seals within 50 m."
  - Benefit rows: "Find secrets dropped around you" / "Walk within 50 m to reveal" /
    "Anonymous by design — never leaves your device".
  - CTA: "Allow while using the app" / "Maybe later".
- Props: `visible`, `busy`, `onEnable`, `onClose` (presentational; logic stays in caller).

## 5. Wire LocationScreen — `src/features/onboarding/screens/LocationScreen.tsx` (edit)
Currently both buttons just `navigation.replace('Main')`. Change "Allow while using the app":
- onPress → `requestPermission()` (from `services/location`).
  - `granted` → fire-and-forget `getCurrent()` (warm the GPS), then `replace('Main')`.
  - `blocked` → show `LocationPermissionSheet` with a "blocked" note; its Enable opens
    `Linking.openSettings()`; "Maybe later" → `replace('Main')`.
  - `denied` → keep on screen / allow "Not now".
- "Not now" stays `replace('Main')`.
Add `busy` state to disable the button during the OS dialog.

## 6. Wire MapScreen — `src/features/map/screens/MapScreen.tsx` (edit)
- Call `useDeviceLocation()`; on mount, if `status` unknown, `refresh()` (permission was
  handled in onboarding, but guard for it).
- **LocChip**: replace hardcoded `place="Bedford & N 7th"` with `shortAddress` (fallback
  "Locating…" while `loading`/no fix). `count` stays mock until a backend exists.
- **Recenter map**: capture `adapter` from `useMaplibreAdapter()` and `flyTo(coord)` once a
  fix lands (the adapter already exposes `flyTo`; MapScreen currently ignores it).
- Keep the design's pins/range visuals unchanged (no real drops yet).

## 7. Wire WalkSequenceScreen — `src/features/map/screens/WalkSequenceScreen.tsx` (edit)
Per decision: keep fixed visuals + tap-to-advance. Only swap text:
- `useDeviceLocation()` for the current address.
- `MapStatus` `place` → real `shortAddress` (fallback to existing copy).
- The distance pill / `FindCard` "78 m away": if we have a real `coord` and a target, show
  `distanceTo(target, coord)` rounded to metres; otherwise fall back to the scripted text.
  (No backend target yet → derive a demo target near the user, or keep scripted distance and
  only make the **place label** real. Default: real place label, scripted distance, to avoid
  inventing fake targets.)

## 8. Native permission strings
- **Android** — `android/app/src/main/AndroidManifest.xml`: add
  `<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />`
  (and optional `ACCESS_COARSE_LOCATION`). (Runtime request already handled in JS.)
- **iOS** — `ios/Dropped/Info.plist`: add
  `NSLocationWhenInUseUsageDescription` = "Dropped uses your location to find secrets near
  you and measure when you're within 50 m to reveal them." (`pod install` after, on a Mac.)

---

## Files
**New**
- `src/services/maps/reverseGeocode.ts`
- `src/services/maps/useReverseGeocode.ts`
- `src/features/map/hooks/useDeviceLocation.ts`
- `src/features/map/components/LocationPermissionSheet.tsx`

**Edit**
- `src/services/maps/index.ts` (exports)
- `src/features/map/hooks/index.ts` (export hook)
- `src/features/onboarding/screens/LocationScreen.tsx` (real request + sheet)
- `src/features/map/screens/MapScreen.tsx` (LocChip address + recenter)
- `src/features/map/screens/WalkSequenceScreen.tsx` (real place label)
- `android/app/src/main/AndroidManifest.xml` (FINE_LOCATION)
- `ios/Dropped/Info.plist` (usage string)

**Reuse (no change)**
- `src/services/location/index.ts` — already complete
- `src/utils/geo.ts`, `src/types`, `Sheet`/`Grabber`/`AppButton`, `useMaplibreAdapter`

---

## Verification
1. `yarn lint` + `yarn tsc --noEmit` (or `yarn test`) — no type errors across new files.
2. `yarn android` on a device/emulator:
   - Onboarding → Location → tap "Allow while using the app" → OS location dialog appears.
   - Grant → land on Map; **LocChip shows the real street/area** (not "Bedford & N 7th").
   - Map recenters on the device position.
   - Deny-with-never-ask-again → themed `LocationPermissionSheet` appears; Enable →
     opens system Settings.
   - Open Walk sequence → status shows the real place label; tap-to-advance beats still work.
3. Toggle airplane mode → address shows graceful fallback ("Locating…"), no crash
   (`ReverseGeocodeError` swallowed).
4. Nominatim sanity: confirm one request per fix (debounced), UA = `Dropped/1.0 (com.dropped)`.

## Notes / risks
- Nominatim allows ~1 req/sec — the hook's debounce + coord-rounding covers this for a
  single user; fine for dev. For production scale, swap to a self-hosted/keyed geocoder later.
- iOS plist + `pod install` need a Mac; on this Windows box only the Android path is testable.
- No backend drops exist yet, so pin positions / nearby `count` stay mock — only the
  *device* location and address become real.
