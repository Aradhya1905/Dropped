# 12 — Lying compass

**Effort:** S · **Where:** client only · **Status:** todo
**Plan:** [2026-08-07-12-lying-compass.md](../.claude/plans/2026-08-07-12-lying-compass.md)

## What

The needle on the walk-closer screen is only honest up close:

| Distance | Needle |
|---|---|
| > 300 m | drifts, points vaguely, sometimes wrong |
| 300–100 m | narrows to roughly the right direction |
| < 100 m | locks on, steady |

## Why

A perfectly accurate arrow turns the walk into following a GPS route — which the
foot route already does better. A needle that only firms up as you close makes
the last stretch a search instead of a commute, and it fits the app's fiction:
you're feeling for something, not navigating to it.

Also makes the drop's exact spot slightly ambiguous, which is good — you look
around at the actual bench instead of staring at the phone.

## Client work

- `services/location/useCompassHeading.ts` already exists — the heading source is
  done. This is a presentation change on top of it.
- The edit site is `features/nearby/components/Compass.tsx`, wired from
  `SecretDetailScreen.tsx` (screen 05) as `<Compass rotation={needleRotation} />`.
  It already animates the needle on core `Animated` with a shortest-arc tween,
  and it already has an ambient-sway branch for `rotation == null`. **Extend that
  sway into the wobble**, don't add a parallel animation — two `Animated.Value`s
  fighting over one transform is how this gets janky.
- Add wobble as a deterministic function of `(dropId, coarse time)` rather than
  random per frame: it should feel like an unreliable instrument, not like a
  glitch. Seeding on the drop id also means it doesn't jitter differently every
  render.
- Amplitude interpolated from distance (`utils/geo.ts` haversine), smoothed so
  the needle eases rather than snaps between bands.
- Pairs with [02 warmth haptics](02-warmth-haptics.md) and
  [05 whisper tier](05-whisper-tier.md) — all three should change state at the
  same distance thresholds so the bands feel like one system.

## Backend work

None.

## Risks / notes

- Accessibility: someone who genuinely cannot search visually shouldn't be locked
  out. Offer an "accurate compass" toggle in settings alongside the other
  accessibility options in [15](15-settings-polish.md).
- Don't lie about *distance* at the same time — one unreliable signal is playful,
  two is just broken.
