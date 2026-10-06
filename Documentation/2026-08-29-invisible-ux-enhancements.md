# Invisible UX enhancements — better app, same screens

_2026-08-29_

**The constraint this list was built under:** almost no UI changes. The seven
feature branches from the 2026-08-07 idea batch (whisper tier, mood filter,
share-a-spot, time gates, wax-seal collection, settings feature rows, background
walk engine) all changed what the app *is*, and were discarded for exactly that
reason. Everything below changes how the app *feels* — reliability, feedback,
speed, honesty — while the 14 screens stay visually as they are. Where an item
needs any visible change at all, it is flagged, and it is never more than making
an existing element live or adjusting a line of copy.

Every claim below was verified against the code on `main` (a6cb6a9) today. This
is a survey, not a plan — nothing here is built.

---

## Priority map

| # | Enhancement | Lift | Effort | UI delta |
|---|---|---|---|---|
| 1 | Walk-beat hysteresis at the 50 m / 150 m lines | High | Tiny | none |
| 2 | GPS outlier rejection + carrying `accuracy` through | High | Small | none |
| 3 | In-range haptic on the Map screen | High | Tiny | none |
| 4 | Offline cache persistence (React Query → MMKV) | High | Medium | none |
| 5 | Real online/offline awareness (NetInfo → onlineManager) | High | Small | none |
| 6 | Wire the "quiet hum" notification (foreground-only) | High | Medium | one row becomes tappable |
| 7 | Reverse-geocode cache in MMKV | Medium | Tiny | none |
| 8 | Pause the GPS watch while backgrounded | Medium | Tiny | none |
| 9 | Navigation state restore after process death | Medium | Small | none |
| 10 | Remove dead heavyweight dependencies | Medium | Small | none |
| 11 | Haptic texture upgrade (system haptics, not the vibrator) | Medium | Small | none |
| 12 | Respect the OS reduce-motion setting | Low–Med | Small | none (by definition) |
| 13 | Make the three settings rows live | Medium | Small | rows become tappable |
| 14 | Core-loop breadcrumbs in Crashlytics | Indirect | Tiny | none |
| 15 | Finish the 9-step on-device E2E script | Indirect | Half a day | none |

Suggested order if these get picked up: **1 + 3 + 2** (one sitting, the walk
stops glitching), then **4 + 5** (the app stops feeling network-shaped), then
**6 + 13** together (the hum needs its toggle anyway).

---

## A. The walk — the core loop's feel

### 1. Beat hysteresis on the Walk screen

`WalkSequenceScreen.tsx:161-165` derives the beat from a plain threshold
compare on every GPS fix:

```ts
distM <= 50  → 'arrived'
distM <= 150 → 'range'
```

GPS in an urban spot jitters ±10–25 m while standing still. Someone standing at
~48 m therefore flaps `arrived ↔ range` every few seconds, and each flap:

- re-fires a haptic (`WalkSequenceScreen.tsx:184-190` buzzes on every
  *transition*, and flapping is all transitions),
- swaps the bottom `FindCard` between "you made it" and "you crossed the line",
- re-runs `fitBounds` (`:172-179` refits the camera on every beat change), so
  the map visibly lurches.

Fix: enter a beat at its threshold, leave it only ~10 m past it (e.g. arrive at
≤ 50, drop back only at > 62). Two constants and one comparison rewrite; the
single highest feel-per-line item on this list. Same treatment at the 150 m
line.

### 2. GPS outlier rejection, and stop discarding `accuracy`

Two related gaps in `services/location/index.ts`:

- The accuracy floor is *cold-start only* by design (`watch()`, `:124-135`).
  After the first fix, every fix streams through — including the occasional
  300 m+ multipath spike, which teleports the dot, makes the distance label
  lie ("34 m" → "310 m" → "41 m"), and can flap beats straight through
  hysteresis.
- `toCoordinate` (`:43-46`) throws away `p.coords.accuracy`, so no downstream
  code *can* be accuracy-aware.

Fix: keep `accuracy` on the coordinate (additive change — `Coordinate` gains an
optional field, no call site breaks), then gate stream fixes with a plausibility
check: reject a fix implying > ~12 m/s of movement unless a second fix confirms
it. Optionally smooth the *displayed* distance with a light EMA so the label
counts down instead of twitching — the raw value still drives the beats.

With accuracy available, one copy-level honesty win follows almost for free:
when `distM ≤ 50` but the fix is coarse (accuracy > ~30 m), the server may still
403 with "you're 71 m away" — the client promised "you're standing on it" and
the server called it a lie. Padding the client-side arrived check by the fix's
accuracy makes the promise trustworthy. (The server check stays authoritative;
this only stops the client over-claiming.)

### 3. The Map screen's silent range moment

The Walk screen buzzes when you cross the 50 m line (`crossedIntoRange()`), but
most range-crossings won't happen there — they happen wandering with the Map
tab open, where `nearestInRange` (`MapScreen.tsx:150`) silently docks the
`RangeCard`. Phone in hand at waist height, eyes on the street: the moment is
missed.

Fix: track the previous `nearestInRange?.id` in a ref; on `null → drop`
transition, fire the existing `crossedIntoRange()` haptic. Four lines, no new
UI, and the app's one magic moment stops depending on which screen is open.

---

## B. Network — make it stop feeling like a client

### 4. Persist the React Query cache to MMKV

Today the cache is memory-only (`app/queryClient.ts`). Cold start with no
signal — precisely the state a walking app is often opened in — renders an
empty map ("nothing sealed near", which is a lie), an empty Trail, and a
`SecretDetail` that can't find its drop. The only thing that survives restart
is the last coordinate.

Fix: `@tanstack/react-query-persist-client` with a ~30-line MMKV persister
(synchronous, already the storage layer). Pins, trail lists, stats, and
revealed bodies then paint instantly from disk and revalidate in the
background. `staleTime`/`gcTime` are already sensibly set; give the persister a
`maxAge` of a few days.

One real trap to handle: detail/Walk/Opening screens read from `dropsStore`,
which is only populated inside `queryFn`s via `hydrateDrops`
(`useNearbyDrops.ts:24-29`). Restored queries **don't re-run their `queryFn`**,
so a restored cache would show pins whose detail screens are empty. On restore,
walk the restored `['drops', …]` / `['trail', …]` entries and call
`hydrateDrops` with their data before the UI mounts.

### 5. Wire `onlineManager` to NetInfo

`refetchOnReconnect: true` is set (`queryClient.ts:25`) but is currently inert:
on React Native, React Query's `onlineManager` reports "online" forever unless
it's wired to `@react-native-community/netinfo`. So after a failed load, the
app doesn't recover when data comes back — it waits for a screen focus or a
33 m grid-cell change.

Fix: add NetInfo (small, standard dep), wire `onlineManager.setEventListener`
next to the existing `focusManager` wiring in `AppProviders.tsx`. Bonuses that
fall out of it:

- The `LocChip`'s "offline · last known" kicker (`MapScreen.tsx:171-177`) can
  key on actual connectivity instead of inferring it from a failed query.
- Mutations (heart/save/report) pause while offline instead of instantly
  failing and rolling back — they fire the moment the connection returns.

### 6. The "quiet hum" is fully built and completely unwired

The most finished dead feature in the codebase:

- `notifeeAdapter` exists, is tested, creates its LOW-importance channel, and
  dedupes by secret id (`services/notifications/notifeeAdapter.ts`) — and has
  **zero callers** outside its own barrel.
- `POST_NOTIFICATIONS` is already in the manifest.
- The `notificationMode` setting (`'off' | 'hum'`) exists in storage with a
  You-screen row displaying it — but no control can ever change it, and
  `requestPermission()` is never called by anyone.

The discarded branch 16 (background walk engine) is *not* required for a
worthwhile version. A **foreground-only hum** needs no new permission class and
no service: subscribe to `locationStore` (module-level, like the pedometer
service), and when a *sealed, unseen* drop first comes within ~200 m while the
app is open, fire one `notifyNearbySecret` plus a soft haptic. Throttle per
drop id in MMKV (once per drop per day) so a commute never spams. It covers the
real case — phone in pocket, screen recently on, app foregrounded under the
lock screen — and the notification is waiting when the screen wakes.

UI delta: the existing "Walk-by notifications" row must become tappable to
toggle off/hum and request permission (see item 13). Everything else is
invisible. True background sensing stays out of scope with branch 16.

---

## C. Lifecycle — invisible until it saves you

### 7. Cache reverse-geocode results

`locationStore` debounces Nominatim lookups on an ~11 m key but holds results
only in memory. Every session re-resolves the same handful of home-area cells:
the loc chip reads "Locating…" on every launch even though the answer hasn't
changed since yesterday, and each lookup is a network round-trip against a
rate-limited free API.

Fix: MMKV map keyed by the existing `addressKey` (4-decimal grid), value
`{shortAddress, city, resolvedAt}`, TTL of ~30 days, capped at a few hundred
entries. Labels become instant on launch and offline; Nominatim gets hit a
fraction as often (their usage policy will thank you).

### 8. Stop the GPS watch while backgrounded

`App.tsx` stops the watch only on unmount; `AppProviders` already refreshes on
foreground. Backgrounding leaves the watch registered — Android throttles it,
but it still holds the location client and drains more than zero. For an app
whose whole premise is being out on a long walk, battery *is* UX.

Fix: in the existing `AppState` listener, `stopWatching()` on background,
`ensureWatching()` on active (the `refresh()` already there covers the gap
until the first watch fix). A further step if ever wanted: widen
`distanceFilter` when the nearest known drop is > 1 km away and tighten it
inside 200 m — the walk needs 5 m granularity, the commute doesn't.

### 9. Survive Android process death mid-walk

Backgrounding the app for a few minutes (camera, chat) can kill the process.
On return, the stack rebuilds from `Splash`: whatever screen you were on —
including a Walk in progress — is gone. The composer draft survives (MMKV);
your *place in the app* doesn't.

Fix: React Navigation state persistence — `onStateChange` → MMKV,
`initialState` on boot, discarded when older than ~30 minutes so a next-day
launch still starts fresh at the map. Pure plumbing in `app/App.tsx`; no screen
changes.

### 10. Remove the dead heavyweight dependencies

Two native packages contradict the product and cost every launch:

- `react-native-vision-camera` v5 + `react-native-nitro-image` — nothing
  imports them, and the house rules literally say "No photos. Just words."
- `react-native-reanimated` v4 + `react-native-worklets` — zero imports; the
  babel plugin was deliberately never added; all animations run on core
  `Animated`.

Each ships native code that initializes at startup and adds MBs to the APK.
Removing them buys cold-start time and install size — the least glamorous UX
lever and one of the most honest. (Keep `react-native-nitro-modules`: MMKV v4
needs it. If reanimated-powered reveal animations are still a someday-wish,
re-adding it later is one install; paying for it on every launch now isn't.)

---

## D. Texture — the last few percent

### 11. Real haptics instead of the vibrator motor

`services/haptics` is well-shaped (named moments, single adapter) but built on
RN's `Vibration`, i.e. the legacy full-amplitude motor API. On modern Androids
that reads as *buzzy* rather than *crisp*, and on iOS every pattern collapses
to one dull thud. `react-native-haptic-feedback` maps the same moments onto
system haptic primitives (tick/click/impact — the vocabulary the OS itself
uses). The adapter means every call site stays untouched; only
`services/haptics/index.ts` changes. The seal-break and the 50 m crossing are
the two moments that deserve this most.

### 12. Respect the OS reduce-motion setting

No `AccessibilityInfo` usage exists anywhere in `src/`. The ambient loops —
bobbing map pins, `PulseRing`, `SealBurst`, the arrived-pin shake — run
unconditionally. The design export even has a `no-motion` concept that was
never carried over. A `useReducedMotion()` hook (subscribe to
`AccessibilityInfo.isReduceMotionEnabled`) checked inside the design-system
animation components quiets the whole app for users who asked the OS for calm,
and changes nothing for anyone else.

### 13. Make the three settings rows live — the one deliberate UI touch

`YouScreen.tsx:40-52`: all three rows render values but respond to nothing.

- **Map style** — the setter already exists (LayerSheet on the Map tab);
  tapping the row should open the same picker.
- **Walk-by notifications** — must become a toggle for item 6 to be usable at
  all; it currently displays a setting that can never be changed.
- **Haptics** — `getHapticsEnabled()` is honoured by every buzz already, but no
  control reaches it: a user who hates vibration has no off switch. Add the row
  (same visual row pattern, one more entry).

Visually these are the same cards in the same list — they just stop being
scenery.

---

## E. Not features — but they protect the feel

### 14. Core-loop breadcrumbs

`services/analytics` only tags the device id onto Crashlytics. Five
`crashlytics().log()` breadcrumbs — drop created, walk opened, beat
transitions, reveal ok, reveal 403 with distance — turn the next "the reveal
didn't fire for me" report from a shrug into a diagnosis. Invisible, and it
directly funds every future UX fix.

### 15. Run the rest of the E2E script

`2026-08-22-ux-repair-pass.md` left a 9-step on-device script with steps 3–9
never executed (permission revoked, drop, draft survival, FAR→NEAR walk,
airplane mode, trail, relative time). The mock-GPS harness
(`mock_location.ps1` + fakegps) makes it a desk job. Several items above
(1, 2, 3, 5) would want steps 6 and 7 re-run afterwards anyway.

---

## Considered and excluded

To keep this list aligned with the "don't change the app" constraint:

- **Everything on the discarded branches** — whisper tier, mood
  filter/tinted pins, share-a-spot deep links, time gates, wax-seal
  collection, settings feature rows, background walk engine. Already tried;
  changed the app's character.
- **Sound design** (a soft crack on the seal, a hum tone) — genuinely
  effective, but it adds a sensory channel the app doesn't have today, which
  is a bigger character change than any pixel.
- **Compass on the Walk screen, accuracy ring on the user dot, pin
  clustering** — all visible additions, out of scope here.
- **Anything needing background location** — that's branch 16's territory,
  and its own decision.
