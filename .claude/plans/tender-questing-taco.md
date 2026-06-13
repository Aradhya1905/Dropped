# Services layer — fill the empty adapter barrels

_2026-06-13_

## Context

All `src/services/*` adapters are empty `export {}` barrels except `maps/`
(which already has `MapAdapter` interface + `noopAdapter`). Features can't wire
real GPS, storage, or HTTP until these exist. Per the remaining-work doc §1 and
the suggested build order, this pass builds the services layer **bottom-up**:
storage → location → api → notifications → maps (maps **last**, pending a
provider decision the user wants to confirm separately).

Deps already installed: `react-native-mmkv` v4, `react-native-geolocation-service`,
`axios`. No local-notification package is installed yet, so notifications ships
as interface + noop (like maps was). Backend doesn't exist — per user decision,
**api = real axios instance only, no mock**; endpoints stay unwired until the
server lands.

Rule from CLAUDE.md: features never import a vendor SDK directly — only these
adapters do. Reuse existing `utils/geo` (`haversineMeters`, `isWithin`) and
`types` (`Coordinate`, `Drop`, `Secret`, `REVEAL_RADIUS_M`).

## Build order & scope

### 1. `services/storage` — MMKV wrapper (do first; unblocks identity)
File: `src/services/storage/index.ts` (+ optional `keys.ts`).

- Single `MMKV` instance (vendor SDK isolated here).
- Typed key constants: `deviceId`, `onboardingComplete`, `savedSecretIds`,
  `seenSecretIds`, settings (`mapStyle`, `notificationMode`).
- API surface:
  - `getDeviceId(): string` — lazy-generate (UUID-ish from
    `Math.random`+time, no new dep) and persist on first call. The app's only
    identity.
  - `getOnboardingComplete()/setOnboardingComplete(bool)`.
  - saved/seen secret id sets: `getSavedIds`, `addSavedId`, `removeSavedId`,
    `getSeenIds`, `addSeenId` (store as JSON string arrays).
  - settings getters/setters with typed defaults.
- Small generic `getJSON<T>/setJSON` helpers internally; do not leak the MMKV
  instance through exports.

### 2. `services/location` — GPS + distance (powers the core loop)
File: `src/services/location/index.ts`.

Wrap `react-native-geolocation-service`:
- `requestPermission(): Promise<PermissionStatus>` — `'granted' | 'denied' |
  'blocked'`; Android uses `PermissionsAndroid.request(ACCESS_FINE_LOCATION)`,
  iOS uses `Geolocation.requestAuthorization('whenInUse')`. Normalize both to
  one enum.
- `getCurrent(): Promise<Coordinate>` — one-shot `getCurrentPosition`.
- `watch(cb: (c: Coordinate) => void): () => void` — `watchPosition`; returns an
  unsubscribe that calls `clearWatch`. Map RN `{coords:{latitude,longitude}}` →
  our `Coordinate {lat,lng}` at the boundary.
- `distanceTo(drop: Coordinate, from: Coordinate): number` and
  `isWithinDrop(drop, from, m?)` — thin re-exports over
  `utils/geo.haversineMeters` / `isWithin` (don't reimplement).
- Note in code comment: OS-manifest permission strings (§5) still pending; this
  service only *requests*, it can't add the manifest entries.

### 3. `services/api` — axios instance (real, no mock)
File: `src/services/api/index.ts` (+ `client.ts` if it grows).

- One configured `axios` instance: `baseURL` from an env/config constant
  (placeholder `DROPPED_API_URL`, documented as TODO until backend exists).
- Request interceptor injects `X-Device-Id` header from
  `services/storage.getDeviceId()`.
- Response interceptor: normalize errors to a small `ApiError {status, code,
  message}` shape; surface network vs server distinctly.
- Simple retry/backoff on idempotent GETs (retry count + exponential delay; no
  new dep — hand-rolled in the interceptor or a tiny wrapper).
- Export the instance + `ApiError` type. **No endpoint functions, no mock data**
  — those land with the backend in §2/§3 of the roadmap.

### 4. `services/notifications` — interface + noop (no package yet)
Files: `src/services/notifications/types.ts`, `noopAdapter.ts`, `index.ts`
(mirror the `maps/` shape exactly).

- `NotificationAdapter` interface: `requestPermission()`,
  `notifyNearbySecret(opts)`, `cancelAll()`.
- `noopAdapter` impl that no-ops, so callers compile/run now.
- Comment documenting the real impl is deferred until a local-notification
  package (e.g. `notifee` / `react-native-push-notification`) is chosen —
  parallels how `maps` waited on a provider.

### 5. `services/maps` — LAST, pending provider confirmation
- Interface + `noopAdapter` already exist; leave as-is this pass.
- **Do not implement** until the user confirms provider (MapLibre / Mapbox /
  Google). Flagged here only to mark sequence.

## Out of scope (separate passes, per roadmap)

- Zustand stores + React Query wiring (§3), making screens real (§4), backend
  (§2), native manifest permission strings + babel worklets plugin (§5).
- No new npm dependencies in this pass (device id is hand-rolled; notifications
  stays noop).

## Verification

- `npm run lint` and `npx tsc --noEmit` (or the project's typecheck) — must pass;
  these are pure TS modules with no UI.
- Targeted unit tests (Jest, alongside existing geo tests):
  - storage: `getDeviceId` is stable across calls / persists; saved-id
    add/remove round-trips. (Mock `react-native-mmkv`.)
  - location: RN coord → `Coordinate` mapping; `isWithinDrop` delegates to geo;
    permission normalization. (Mock `react-native-geolocation-service` +
    `PermissionsAndroid`.)
  - api: device-id header attached; error normalized to `ApiError`. (Mock axios
    adapter.)
- No device build needed — services are headless. Real GPS/permission behavior
  gets exercised later when screen 03 + the walk screens wire in (§4).
