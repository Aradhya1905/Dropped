# 16 — Background walk engine (prerequisite)

**Effort:** L · **Where:** client + native · **Status:** todo · **Blocks:** [02](02-warmth-haptics.md), [08](08-anniversary-echo.md), [13](13-settings-retention.md)
**Plan:** [2026-08-07-16-background-walk-engine.md](../.claude/plans/2026-08-07-16-background-walk-engine.md)

## Why this file exists

Three ideas in this folder are written as if the app already notices you walking
past something while it's in your pocket. It doesn't. Two facts, both verified
against the current tree:

- **`services/notifications` has zero call sites.** `notifeeAdapter.ts` exists
  and is tested, `@notifee/react-native` is installed, `POST_NOTIFICATIONS` is
  declared in `AndroidManifest.xml` — but nothing in `src/features` or `src/app`
  ever calls it. The "Walk-by notifications · Quiet hum" row on `YouScreen.tsx`
  persists a `NotificationMode` that no consumer reads. **There is no hum to
  gate yet.**
- **The GPS watch is foreground-only.** `watch()` in `services/location/index.ts`
  is started by `LocationProvider` inside the React tree. `AndroidManifest.xml`
  declares `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` but **not**
  `ACCESS_BACKGROUND_LOCATION`, and there's no foreground service. Close the app
  and the walk stops being observed.

So "walk-by notification", "anniversary echo", and "buzz in your pocket" are all
one missing piece, not three features.

## What

1. **Keep the watch alive when backgrounded** — Android: a foreground service
   with a persistent notification (`ACCESS_BACKGROUND_LOCATION`,
   `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, and the "Allow all the
   time" upgrade prompt, which Android forces into a second, separate dialog).
   iOS: `UIBackgroundModes: location`, `allowsBackgroundLocationUpdates`, and
   `NSLocationAlwaysAndWhenInUseUsageDescription`.
   `react-native-geolocation-service` supports this on both; the work is native
   config plus a lifecycle owner outside the React tree.
2. **One gate module** — a single place that decides whether a hum is allowed
   *right now*: movement, quiet hours, radius, mood subscription, echo opt-in.
   Every setting in [13](13-settings-retention.md) is read here and nowhere else.
   Nothing else in the app schedules a notification.
3. **A cheap first fire** — nearest unrevealed drop inside the notification
   radius, at most one per interval, through the existing notifee adapter.

## The cheaper path — do this first

Everything else in this folder works with the app open:
[01 fog of war](01-fog-of-war.md), [05 whisper](05-whisper-tier.md),
[12 lying compass](12-lying-compass.md), and the on-screen half of
[02 haptics](02-warmth-haptics.md). Ship those against the existing foreground
watch, and treat background as its own decision.

Scoped that way, the honest state of the dependent ideas is:

- **02 haptics** — works today while the walk screen is open. "Phone in your
  pocket, screen off" needs this file.
- **08 echo** — the endpoint and the Trail card work today. The *ambient* version
  (it finds you while walking past) needs this file.
- **13 settings** — quiet hours / radius / mood subscriptions are settings for a
  notification that has no producer. Build the producer, then the levers.

## Risks / notes

- **Store review.** Background location needs written justification on both
  Google Play and the App Store, and it's a common rejection. Budget for a
  round trip.
- **Privacy posture.** Background location in an anonymous confessions app is the
  scariest permission this product could ask for. Do not ship it before
  [14 home privacy zone + panic wipe](14-settings-trust.md) — the mitigations
  should land in the same release as the permission, not after it.
- **Battery.** One watch, raised cadence only while a target is near. Fog of war
  and warmth both ride the same watch; don't let each feature start its own.
- If the review or battery cost looks bad, the app is still complete without it.
  Foreground-only is a legitimate final answer here.
