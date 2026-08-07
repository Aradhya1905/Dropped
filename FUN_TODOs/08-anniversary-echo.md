# 08 — Anniversary echo

**Effort:** M · **Where:** backend + client · **Status:** **built** (in-app half;
device QA owed. The ambient "finds you mid-walk" half still waits on [16](16-background-walk-engine.md).)
**Plan:** [2026-08-07-08-anniversary-echo.md](../.claude/plans/2026-08-07-08-anniversary-echo.md)

## What

When you pass near a place where you dropped or revealed something a year ago (or
six months, or any round interval), the app tells you quietly: *"A year ago you
stood here."* Tapping opens what you left or found.

## Why

The strongest re-engagement hook available, and it costs almost nothing because
the data already exists — `drops.created_at`, `reveals.created_at`, and a GiST
index on `drops.geog`.

Unlike a notification that begs you to come back, this one only fires when you
are *already* out walking past a place that means something to you. That's the
difference between a nudge and a memory. It also makes the app better the longer
you've had it, which is the retention property you actually want.

## Backend work

- `GET /drops/echoes?lat&lng&radiusMeters` — for the calling device, return drops
  where:
  - the device has a `reveals` or authored row, **and**
  - `created_at` falls in a window around N months/years ago (start with: 1 year
    ± 3 days, 6 months ± 3 days), **and**
  - `ST_DWithin(geog, point, radius)`.
- Reuses the existing GiST index; add a `created_at` index if the plan needs it.
- Cap results and rate-limit — the client will poll this from a location watch.

## Client work

- Poll sparingly. Once per significant location change, not per fix — reuse the
  `services/location` watch and only call when the device has moved > ~250 m
  since the last check. Cache the result per day in MMKV so a walk around the
  block doesn't hammer the endpoint.
- Deliver through `services/notifications` (notifee adapter already exists, but
  nothing calls it yet — see [16](16-background-walk-engine.md)), and gate it on
  the notification settings from [13](13-settings-retention.md) — this must obey
  quiet hours and the walk-only rule like everything else.
- **Ship the in-app half first**: an echo card on `TrailScreen.tsx`, plus a check
  when the Map tab gains focus. That needs only the endpoint and the existing
  foreground watch. The ambient "it finds you mid-walk" version is the part that
  waits on [16](16-background-walk-engine.md).

## Risks / notes

- **Emotional risk is real.** This is a confessions app; an anniversary reminder
  of something painful is not automatically welcome. Make it opt-in, phrase it
  gently, and let a user mute echoes for a specific drop.
- Don't fire echoes for drops the user reported or that were later hidden.
