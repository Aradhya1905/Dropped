# 13 — Settings: retention levers

**Effort:** M · **Where:** client + small backend · **Status:** todo ·
**Blocked by:** [16 background walk engine](16-background-walk-engine.md)
**Plan:** [2026-08-07-13-settings-retention.md](../.claude/plans/2026-08-07-13-settings-retention.md)

Today `features/settings/screens/YouScreen.tsx` has three rows and they are
strictly display-only: Map style, Unlock radius (fixed 50 m), Walk-by
notifications (hum/off). They render as `label`/`value` `Text` pairs — nothing on
that screen is tappable. These are the settings that actually change whether
someone still has the app in three months.

## Read this first: there is no hum yet

`services/notifications` exports a working notifee adapter and has **zero call
sites** anywhere in `src/features` or `src/app`. `getNotificationMode()` persists
a value no consumer reads, and the GPS watch only runs while the app is
foregrounded. So every row below is a lever on a machine that isn't built.

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

## Client work

- `services/storage/keys.ts` + `services/storage` for persistence — the pattern
  is already there (`getMapStyle`, `getNotificationMode`).
- Real controls on `YouScreen.tsx`. Right now the rows render as static
  label/value pairs; they need to become actual toggles/pickers in a `Sheet`.
- All of it must be read by `services/notifications` (notifee adapter exists)
  before any local notification is scheduled — one place that checks the gates,
  not a check per call site. Since there are no call sites today, this is easy to
  get right: write the gate *before* the first one exists.

## Backend work

Minimal, only if push (rather than local) notifications ever land: a per-device
preferences blob, or just keep everything client-side. Recommendation: keep it
client-side. Fewer stored per-device facts is better for the privacy posture, and
the hum is a local notification driven by the local GPS watch anyway.

## Risks / notes

- Every setting added here is a setting someone can use to mute the app into
  uselessness. Defaults matter more than the options.
- Unlock radius should stay display-only — it's the product's one rule. Don't
  make it configurable just because it's rendered as a row.
