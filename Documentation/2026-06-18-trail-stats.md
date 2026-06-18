# Trail stats — real steps · cities · streak · dropped

_2026-06-18_

The Trail receipt header used to show four hardcoded numbers. They are now real,
per-device values:

| Cell    | Source                                                                  |
| ------- | ----------------------------------------------------------------------- |
| steps   | `GET /devices/me/steps` → `steps` (counted on-device, synced day-wise)  |
| cities  | `GET /devices/me/stats` → `citiesVisited` (distinct city dropped/found)  |
| streak  | `GET /devices/me/stats` → `streakDays` (consecutive reveal-or-drop days) |
| dropped | `GET /devices/me/stats` → `droppedTotal` (all-time)                      |

The heading "You've walked through N secrets this month" now uses
`foundThisMonth` (month-scoped) instead of the all-time found total.

## Backend

- New additive column `drops.city` (migration `drizzle/0001_drop_city.sql`,
  already applied to the dev DB). Sent on `POST /drops` (optional), reverse-geocoded
  client-side from the drop coordinate.
- New endpoint `GET /devices/me/stats` → `DeviceStats`
  (`droppedTotal/droppedThisMonth/foundTotal/foundThisMonth/citiesVisited/streakDays`).
  Repo `deviceRepo.stats`, service `deviceService.stats` (+ `computeStreak`, unit-tested
  in `tests/streak.spec.ts`).
- **Deploy note:** the dev DB is migrated, but the running API at
  `droppeddev.duckdns.org` must be redeployed with this code before the app sees the
  endpoint / accepts the `city` field.

## Steps (fun stat — on-device count, backend-aggregated)

Steps are a light "good to have" stat, **not** a health integration — so we skipped
HealthKit / Health Connect (privacy policy, the Health Connect provider-app
dependency, and a forced `minSdk 26` bump were too much weight for a fun number).

We read the device's **step-counter sensor** directly — Android `TYPE_STEP_COUNTER`,
iOS Core Motion `CMPedometer` — via `@dongminyu/react-native-step-counter` (a
TurboModule; New Arch is already on). Counting runs **while the app is in the
foreground** (started from the app shell, gated by AppState) and buffers live deltas
in MMKV keyed by **local calendar day** (`steps.state.pending`). On Trail focus / app
foreground / background we **sync** the day-tagged deltas to the backend and clear
the buffer. The receipt then shows whatever number `GET /devices/me/steps` returns.

**The displayed total is owned by the backend, and so is its scope.** Steps are
stored date-wise in `device_steps(device_id, day, steps)`, and `step.service.STEP_SCOPE`
(`'day' | 'month' | 'lifetime'`, default **lifetime**) decides what the single GET
endpoint aggregates. Changing it is a one-line backend edit — no client change.

- Backend table/migration: `device_steps` (`drizzle/0002_device_steps.sql`),
  repo `step.repo` (`addDays` upsert / `total` by scope), service `step.service`
  (`STEP_SCOPE`), routes `GET`/`POST /devices/me/steps`.
- Client adapter: [src/services/pedometer/index.ts](../src/services/pedometer/index.ts)
  (`requestPermission` / `startCounting` / `stopCounting` / `flushSteps` /
  `initStepCounting` / `isAvailable`), behind the `services/*` boundary.
- API: `fetchDeviceSteps` / `postDeviceSteps` in
  [src/services/api/index.ts](../src/services/api/index.ts).
- Persistence: per-day unsynced buffer via `getStepState` / `setStepState` in
  [src/services/storage/index.ts](../src/services/storage/index.ts).
- Hook: [src/features/trail/hooks/useSteps.ts](../src/features/trail/hooks/useSteps.ts)
  (query + flush/refetch on Trail focus).
- App wiring: `initStepCounting()` in [src/app/App.tsx](../src/app/App.tsx).

Because the total lives server-side, it survives reinstalls. Steps taken while the
app is closed are not counted — fine for a fun stat.

### Native setup required for steps (rebuild needed)

Dep: `@dongminyu/react-native-step-counter`.

- **Android** — `AndroidManifest.xml` declares `ACTIVITY_RECOGNITION`
  (runtime-requested on Android 10+). Works on the project's `minSdk 24`; no
  Health Connect app needed.
- **iOS** — `Info.plist` has `NSMotionUsageDescription`; Core Motion prompts on
  first use. Run `pod install` after the dep change.

### Verify on device

Open the app → grant the motion / activity permission → walk → open Trail; the
pending day-deltas POST, the query refetches, and the `steps` cell shows the backend
number that grows as you walk and across sessions/days. Reinstall (clears MMKV) and
confirm the total still loads from the backend. Drop a secret and confirm `city` is
sent. Cities / streak / dropped / found populate from the stats endpoint.
