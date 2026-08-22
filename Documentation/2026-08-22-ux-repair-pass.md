# UX repair pass — shared location, real data, honest failure states

_2026-08-22_

All 14 screens were built and the backend wired, but the app behaved like a set of
screens rather than one flow. This pass changed **behaviour only** — no visual redesign,
no new components, no performance work. New states reuse existing design-system pieces
(`MapLoader`, `LocationPermissionSheet`, `LocChip`, `MetaFoot`, `Alert`).

Plan: [`.claude/plans/can-we-like-improve-greedy-rossum.md`](../.claude/plans/can-we-like-improve-greedy-rossum.md)

## The two root causes

**1. Shared state that wasn't shared.** `useDeviceLocation` was a per-caller hook: every
screen got its own permission state, its own GPS watch and its own Nominatim lookup. Only
`MapScreen` and `ComposerScreen` warmed their instance, so every other caller sat at
`coord === null` forever.

**2. `dropsStore` had no writer for list data.** Only reveal/create wrote to it, but
`SecretDetail`, `Walk`, `Opening`, `Secret` and `Dropped` all read from it.

Together they broke the core loop on a real device: tapping a map pin opened a detail
sheet reading "Unknown place" with distance `—`; the Walk screen never left the
"approach" beat; the seal on `Opening` was `disabled` permanently; "Not now" at
onboarding left the Map tab on an endless loader.

## What changed

### Shared location (`src/store/locationStore.ts`, new)

One Zustand store owns `status · coord · live · shortAddress · city · fixing · lastFixAt`,
one `watch()` for the whole app, one debounced reverse-geocode (~11 m key, so standing
still doesn't re-fetch).

- `useDeviceLocation` (`src/features/map/hooks/`) is now a thin reader; its result shape
  is unchanged apart from added `live` / `lastFixAt`, so no call site had to move.
- `bootstrapLocation()` runs once from `src/app/App.tsx` and uses the new
  `checkPermission()` in `services/location` — it reads the standing permission
  **without prompting**, so someone who chose "Not now" isn't re-asked on every launch.
- The last fix is persisted (`location.last`) and rehydrated at boot, so a cold start
  renders a map immediately. `live: false` marks a remembered position, and screens say
  so ("last seen in", "from your last known spot") instead of presenting it as current.
- Onboarding's `LocationScreen` now grants through the store, so the app-wide watch
  starts at the moment of grant.

### Real data reaches the detail screens

`dropsStore.hydrateDrops(secrets)` merges server lists into the store; nearby and all
three trail queries call it. The merge keeps a revealed `body` and a `sealed: false` from
being clobbered by a later sealed list payload.

### No dead ends

| Situation | Before | Now |
| --- | --- | --- |
| Fix pending | loader | loader (unchanged) |
| No fix after 15 s | loader forever | "still looking for you… tap to try again", retries |
| Permission denied / blocked | loader forever | `LocationPermissionSheet`, with the Settings path when blocked |
| Reveal, no fix yet | tap disabled | tap chases a fix, then reveals |
| Reveal fails non-403 | silent | typed alert per case (403 / network / timeout / 404 / other) |

### Composer keeps what you wrote

Draft autosaves to MMKV (`drop.draft`, 7-day expiry), restores on mount, clears on a
successful drop. Leaving with text asks first — via `beforeRemove`, so the close button,
the Android back button and the swipe-back gesture all go through one confirm. 500-char
cap with an `n/500` counter, and the button reads "Finding your spot…" rather than just
dimming.

### Actions are answered

- Haptics (`src/services/haptics/`, RN `Vibration`, no new dependency): seal break,
  crossing the 50 m line, drop committed, toggles, failures. Honours
  `getHapticsEnabled()` (default on; no settings UI yet).
- `useSave` / `useHeart` roll back optimistically **and** say what failed; `useReport`
  finally acknowledges a report (it was completely silent).
- Every mutation invalidates `['drops']` / `['trail']` / `['device']`, so a fresh drop
  appears on the map at once instead of after the 60 s poll.

### Fixed data / copy bugs

- `_yearsAgo` was copy-pasted in three screens and called **anything under a year "just
  now"**. Replaced by `relativeTime` in `src/utils/format.ts` (+ `droppedAgo`,
  `formatDistance`), unit-tested.
- `SecretDetail` showed a hardcoded `ache` mood and its "Save to come back later" button
  only closed the sheet. `DroppedScreen` likewise showed `sealed · ache` for every mood.
- Nearby query keyed on raw lat/lng — a new cache entry (and an empty loading state,
  pins blinking out) on every GPS tick. Now rounded to ~110 m with `keepPreviousData`.
- Trail fetched 20 items but rendered `total`, so the rest was unreachable: added
  scroll-to-load-more, pull-to-refresh, per-tab empty copy and a tap-to-retry error.
- `QueryClient` had no defaults: added `staleTime`, network-only retry with backoff, and
  `focusManager` wired to `AppState` (returning from background re-fixes location).

### Accessibility

Labels/roles on map pins, the drop seal FAB, `AppButton`, Trail tabs, TabBar, save/heart;
wider `hitSlop` on `CloseX` and `LocChip`; "hold the card to report it" hint on the
Secret screen (report was long-press-only with no affordance).

## Files

New: `src/store/locationStore.ts` (+ test), `src/services/haptics/index.ts`,
`src/utils/format.ts` (+ test).

Changed (38 files, +790/−252): `src/app/App.tsx`, `src/app/providers/AppProviders.tsx`,
`src/store/dropsStore.ts`, `src/services/location/index.ts` (adds `checkPermission`),
`src/services/storage/{index,keys}.ts` (last coord, draft, haptics flag),
map/drop/reveal/nearby/trail screens and hooks, `WriteCard`, `MapLoader`, `MapPin`,
`LocChip`, `WaxSeal`, `AppButton`, `chrome.tsx`, `TabBar`, `CLAUDE.md`.

## Verification status

**Automated — all green.** `npx tsc --noEmit` clean · `yarn lint` 0 errors (9 pre-existing
warnings) · `yarn test` 8/8 suites, 32 tests.

Three test fixes were part of this work, all failing on `main` beforehand:

- `src/services/location/index.test.ts` — mock position had no `accuracy`, so the
  accuracy floor (added later than the test) silently dropped it.
- `__tests__/App.test.tsx` — couldn't parse `react-native-geolocation-service`,
  `react-native-compass-heading`, `react-native-config`, `react-native-modal`,
  `react-native-animatable`. Mocks added to `jest.setup.js`, two entries added to
  `transformIgnorePatterns` in `jest.config.js`.
- `jest.setup.js` MMKV stand-in gained `remove()`.

New tests: `src/utils/format.test.ts` (relative time, incl. the "just now" regression),
`src/store/locationStore.test.ts` (single watch, persisted seed, live vs remembered fix,
grant/deny transitions, refresh failure keeps last coord, silent bootstrap).

**On-device E2E — started, then stopped at the user's request. Steps 1–2 of 9 only.**

Environment that was set up and confirmed working (reuse it):

- Device `001206481004686` (Nothing Phone, A015). Always pass `adb -s`.
- Build: `ANDROID_SERIAL=001206481004686 ./android/gradlew.bat -p android app:installDebug -PreactNativeArchitectures=arm64-v8a`.
  `npx react-native run-android` is unusable non-interactively — it stalls on a
  "Use port 8087 instead?" prompt.
- Metro runs on host **8086**, but the device asks for **8081**. All three reverses are
  needed: `adb -s … reverse tcp:8081 tcp:8086` (plus 8085 and 8086).
- First bundle load after a force-stop takes ~25 s.
- Mock location: `com.lexa.fakegps` is installed and already selected as the system
  mock-location app.
- Confirmed live at 10:43: map rendered, chip read "YOU'RE IN Ganigarahalli, Karnataka · 2".

The full 9-step script lives at
`%LOCALAPPDATA%\Temp\claude\C--My-Projects-Dropped\123887e8-…\scratchpad\agy-e2e-prompt.md`
— reproduced below so it survives the scratchpad.

| # | Scenario | What it proves | Status |
| --- | --- | --- | --- |
| 1 | Cold start with location granted | map appears, never an endless pulse | screenshot taken, unread |
| 2 | No fix at all | loader switches to "still looking for you…" + retry | screenshot taken, unread |
| 3 | Permission revoked | permission sheet, not a dead loader | **not run** |
| 4 | Drop a secret | `n/500` counter, chosen mood on the Dropped card, pin appears at once | **not run** |
| 5 | Draft survives force-stop; leave-confirm | draft restore + 3-way confirm | **not run** |
| 6 | Walk FAR → NEAR | real distance/place/mood, working Save, live seal tap, reveal | **not run** |
| 7 | Airplane mode | pins stay, "offline · last known", drop fails without losing text | **not run** |
| 8 | Trail tab | pull-to-refresh, per-tab empty copy, saved/dropped items land | **not run** |
| 9 | Relative time | fresh reads "just now", old reads "3mo ago" | **not run** |

Coordinates to use: read the phone's own fix
(`adb -s … shell dumpsys location | grep -m1 "last location"`) as **BASE**; **FAR** =
`BASE_LAT + 0.0034` (≈378 m, out of range); **NEAR** = `BASE_LAT + 0.00022` (≈24 m,
inside the 50 m radius). Allow ~15 s after each change — the location service ignores
fixes coarser than 100 m for the first 12 s of a watch.

### Device state left behind

Step 2 runs `pm clear com.dropped`, and it did run: **app data is wiped, onboarding will
show again, and `ACCESS_FINE_LOCATION` is revoked**. Re-grant with
`adb -s 001206481004686 shell pm grant com.dropped android.permission.ACCESS_FINE_LOCATION`
or just walk the onboarding screens.

### Stray files from the test agent

Untracked and safe to delete: `.e2e-screens/` (3 screenshots), `location_dump.txt`,
`mock_location.ps1`, `windows.txt`.
