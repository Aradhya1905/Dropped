# 13 — Settings: retention levers

**Effort:** M · **Where:** client only (see below) · **Status:** **built** —
backend complete (nothing to build), client complete; device QA owed ·
**Blocked by:** [16 background walk engine](16-background-walk-engine.md) — for
QA and for the levers to control anything that fires while the app is closed
**Plan:** [2026-08-07-13-settings-retention.md](../.claude/plans/2026-08-07-13-settings-retention.md)

> ## ✅ Client complete — 2026-08-07
>
> Every lever below is now a real control on the You screen, and — this is the
> part that mattered — the gate they feed shipped **with** them:
> `services/notifications/gate.ts` decides, `hum.ts` is the only function in the
> app that can reach the notification adapter, and it asks the gate first. The
> rule "one place that checks the gates, not a check per call site" was free to
> enforce because it was written before the first call site exists.
>
> | Lever | Default | Row |
> |---|---|---|
> | Quiet hum | `rare` | picker (off · rare · always) |
> | Only when I'm moving | **on** | toggle |
> | Quiet hours | 22:00–08:00 | picker (three windows · off) |
> | Tell me within | 500 m | picker (200 · 500 · 1 km) |
> | Moods worth waking for | all four | mood chips |
> | Anniversary echoes | **off** | toggle (already shipped with [08](08-anniversary-echo.md)) |
>
> Two departures from the plan: quiet hours are **presets rather than a time
> picker** (no date-picker dependency, and fewer taps between someone and "stop
> waking me up"), and **`always` carries a 10-minute floor** — a dense street
> holds a dozen drops inside 500 m, and ten pings in a minute is how a user
> learns to swipe this app away.
>
> Unlock radius stayed display-only, as required, and the section carries an
> honest line saying the hum only listens while the app is open until
> [16](16-background-walk-engine.md) lands. Device QA is owed and needs 16.

> ## ✅ Backend complete — 2026-08-07 · **zero code**
>
> This ticket's backend deliverable is a decision, not an endpoint, and the
> decision is **keep every one of these settings on the device**. Checked
> against the current API rather than assumed, lever by lever:
>
> | Lever | Needs the server? | Why not |
> |---|---|---|
> | Quiet hum (off/rare/always) | no | Cooldown is local state; the hum is a local notification. |
> | Only when I'm moving | no | Speed comes from the GPS watch, or `ACTIVITY_RECOGNITION` — already declared. |
> | Quiet hours | no | Wall-clock on the handset. Sending it up would mean storing a timezone, which the codebase avoids on purpose (see the reveal-condition note in `tables.md`). |
> | Notification radius (200 / 500 / 1000 m) | no | `GET /drops/nearby?radiusMeters=` already takes it, and `NEARBY_MAX_RADIUS_M` is 2000 — every option is inside the existing cap. |
> | Mood subscriptions | no | `GET /drops/nearby?mood=joy,wonder` shipped with [06](06-mood-filter.md). |
> | Echo reminders | no | `GET /drops/echoes` shipped with [08](08-anniversary-echo.md); the on/off gate is whether the client polls it. |
>
> So there is nothing to add. That is the finding, not a deferral: the only
> backend shape this ticket could take is a per-device preferences blob, and
> storing one would mean the server learning when you sleep, how far you'll
> walk, and which moods you can stand — six new per-device facts, in the app
> whose neighbouring ticket ([14](14-settings-trust.md)) is about *not* holding
> facts about people. Revisit only if push notifications ever replace local
> ones, and treat that as its own ticket with its own privacy argument.
>
> Everything else in this file is still open and still client work.

Today `features/settings/screens/YouScreen.tsx` has three rows and they are
strictly display-only: Map style, Unlock radius (fixed 50 m), Walk-by
notifications (hum/off). They render as `label`/`value` `Text` pairs — nothing on
that screen is tappable. These are the settings that actually change whether
someone still has the app in three months.

## Read this first: there is no hum yet

`services/notifications` exports a working notifee adapter and still has **zero
call sites** anywhere in `src/features` or `src/app`, and the GPS watch only runs
while the app is foregrounded. The levers and the gate now exist and are wired to
each other — `humNearbySecret` reads every one of them — but nothing calls
`humNearbySecret` yet, because the thing that would is
[16](16-background-walk-engine.md). Until it lands, the hum can only fire while
the app is open, and the You screen says so.

Order of operations: build the producer ([16](16-background-walk-engine.md)),
then these levers. Adding the settings first ships a screen full of switches that
do nothing.

## The one that matters most: "Only when I'm moving"

A walk-by notification that fires while you're sitting at your desk is the reason
people turn notifications off, and once notifications are off a walking app is
dead. Gate the hum on an actual movement signal:

- Speed threshold from the GPS fix (`services/location`), e.g. sustained
  > 0.7 m/s over ~60 s, or use the platform activity-recognition API behind a
  service adapter — `ACTIVITY_RECOGNITION` is **already declared** in
  `AndroidManifest.xml` for the step counter, so that route costs no new
  permission prompt.
- Default **on**. Most users will never find this setting, so the default has to
  be the good one.

## The rest

| Setting | Options | Notes |
|---|---|---|
| **Quiet hum** | off · rare · always | Extends the existing hum/off row. "Rare" = at most one ping every few hours. |
| **Quiet hours** | time range, default 22:00–08:00 | Non-negotiable for a location app that pings. |
| **Notification radius** | 200 m · 500 m · 1 km | Separate from the reveal radius, which stays 50 m product-wide. This is "how far away do you want to be told". |
| **Mood subscriptions** | multi-select of moods | Needs [06 mood filter](06-mood-filter.md). Lets someone stay subscribed to lighter content instead of muting everything. |
| **Echo reminders** | on/off | Gate for [08 anniversary echo](08-anniversary-echo.md). Opt-in, not opt-out. |

## Client work — ✅ done 2026-08-07

- ✅ `services/storage/keys.ts` + `services/storage` persist all five new levers,
  following the existing `getMapStyle` pattern. The pre-13 `'hum'` value maps
  onto `'always'` on read, so nobody's old switch is silently forgotten.
- ✅ Real controls on `YouScreen.tsx` — rows are `Pressable` and open an
  `OptionSheet` (new, generic; same paper shape as the map's `LayerSheet`).
  Unlock radius and map style stay untappable.
- ✅ One gate, written before the first call site: `notifications/gate.ts`
  decides and returns a *reason*; `notifications/hum.ts` is the only function
  that reaches the adapter. Nothing else may schedule a notification.

Still owed: **device QA**, which needs [16](16-background-walk-engine.md).

## Backend work

**None — settled 2026-08-07.** Verified lever by lever against the live API in
the box at the top of this file: every setting here is local state or a query
parameter that already exists. Fewer stored per-device facts is better for the
privacy posture, and the hum is a local notification driven by the local GPS
watch anyway. Revisit only if push replaces local notifications.

## Risks / notes

- Every setting added here is a setting someone can use to mute the app into
  uselessness. Defaults matter more than the options.
- Unlock radius should stay display-only — it's the product's one rule. Don't
  make it configurable just because it's rendered as a row.
