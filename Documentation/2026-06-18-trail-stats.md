# Trail stats — real steps · cities · streak · dropped

_2026-06-18_

The Trail receipt header used to show four hardcoded numbers. They are now real,
per-device values:

| Cell    | Source                                                                 |
| ------- | ---------------------------------------------------------------------- |
| steps   | On-device step-counter sensor, counted live & accumulated locally      |
| cities  | `GET /devices/me/stats` → `citiesVisited` (distinct city dropped/found) |
| streak  | `GET /devices/me/stats` → `streakDays` (consecutive reveal-or-drop days)|
| dropped | `GET /devices/me/stats` → `droppedTotal`                                |

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

## Steps (client-only, fun stat)

Steps are a light "good to have" stat, **not** a health integration — so we skipped
HealthKit / Health Connect (privacy policy, the Health Connect provider-app
dependency, and a forced `minSdk 26` bump were too much weight for a fun number).

Instead we read the device's **step-counter sensor** directly — Android
`TYPE_STEP_COUNTER`, iOS Core Motion `CMPedometer` — via
`@dongminyu/react-native-step-counter` (a TurboModule; New Arch is already on).
Counting runs **while the app is in the foreground** (started from the app shell,
gated by AppState) and accrues live deltas into the current month's local bucket
in MMKV (`steps.state`). The Trail receipt reads that total. Steps taken while the
app is closed are simply not counted — fine for a fun stat. Everything degrades to
`null` → the receipt shows `—` when the sensor is missing or motion access is denied.

- Adapter: [src/services/pedometer/index.ts](../src/services/pedometer/index.ts)
  (`requestPermission` / `startCounting` / `stopCounting` / `initStepCounting` /
  `isAvailable` / `getStepsThisMonth`), behind the `services/*` boundary.
- Persistence: `getStepState` / `setStepState` in
  [src/services/storage/index.ts](../src/services/storage/index.ts).
- Hook: [src/features/trail/hooks/useMonthlySteps.ts](../src/features/trail/hooks/useMonthlySteps.ts)
  (reads the total, refreshes on Trail focus).
- App wiring: `initStepCounting()` in [src/app/App.tsx](../src/app/App.tsx).

_Future (optional):_ to make the count survive reinstalls / show across devices,
accumulate an unsynced delta and `POST` it on app open — the server holds the
authoritative monthly total. Deferred; no endpoint yet.

### Native setup required for steps (rebuild needed)

Dep: `@dongminyu/react-native-step-counter`.

- **Android** — `AndroidManifest.xml` declares `ACTIVITY_RECOGNITION`
  (runtime-requested on Android 10+). Works on the project's `minSdk 24`; no
  Health Connect app needed.
- **iOS** — `Info.plist` has `NSMotionUsageDescription`; Core Motion prompts on
  first use. Run `pod install` after the dep change.

### Verify on device

Open the app → grant the motion / activity permission → walk → open Trail and the
`steps` cell shows a real monthly number that grows as you walk (deny → `—`). Drop a
secret and confirm `city` is sent (check the DB row). Cities / streak / dropped /
found populate from the stats endpoint.
