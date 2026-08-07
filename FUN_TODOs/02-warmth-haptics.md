# 02 — Warmth haptics on approach

**Effort:** S · **Where:** client only · **Status:** todo
**Plan:** [2026-08-07-02-warmth-haptics.md](../.claude/plans/2026-08-07-02-warmth-haptics.md)

## What

Hot/cold feedback as you close on a drop. Haptic pulse rate and the on-screen
`PulseRing` speed both scale with distance to the target:

| Distance | Feel |
|---|---|
| > 200 m | nothing |
| 200–100 m | slow, faint thump every few seconds |
| 100–50 m | quickening |
| < 50 m (reveal radius) | a single hard "snap" on the reveal |

## Why

The walk is the product. Right now the walk beats in
`features/map/screens/WalkSequenceScreen.tsx` are driven by a real foot route
(`useFootRoute`) but the *feel* is visual only. Warmth turns the last 200 m into
a game you can play with the phone in your pocket — which is also the safest way
to use a walking app.

## Client work

- **Distance source** — already available: `utils/geo.ts` (`haversine`,
  `isWithin`) plus the live fix from `services/location`.
- **Haptics** — no haptics dependency yet. Add
  `react-native-haptic-feedback` (or use the Vibration API for a first pass) and
  put it behind a `services/haptics` adapter — features never import a vendor SDK
  directly per the repo conventions.
- **Pulse** — `design-system/components/anim.tsx` already exports `PulseRing`.
  Drive its period from distance rather than a constant.
- **Throttle** — recompute the band on each GPS fix, but only re-trigger the
  haptic on band change or on a fixed interval. Never buzz per fix.
- **Reveal snap** — one strong haptic when the server confirms the reveal
  (`features/reveal/hooks/useReveal.ts`), not when the client thinks it's close.
  Client-side optimism here would let a spoofed feel precede a rejected reveal.

## Backend work

None.

## Risks / notes

- Must respect the reduced-motion / haptics-off setting from
  [15](15-settings-polish.md).
- **Scope honestly: this is a screen-on feature today.** The watch in
  `LocationProvider` only runs while the app is foregrounded, so "phone in your
  pocket" needs [16](16-background-walk-engine.md). The version that works right
  now — warmth while the walk screen is open — is still worth shipping on its
  own, and is the S-effort part. Don't let the pocket version pull the whole
  background stack into this ticket.
- Battery: piggyback on the existing watch cadence; don't raise GPS frequency
  just for haptics.
