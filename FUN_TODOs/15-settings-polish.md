# 15 — Settings: polish & accessibility

**Effort:** S · **Where:** client only · **Status:** todo
**Plan:** [2026-08-07-15-settings-polish.md](../.claude/plans/2026-08-07-15-settings-polish.md)

Small rows, no backend, mostly a day's work each. Several are already implied by
the design or listed under "Polish" in the remaining-work doc.

| Setting | Notes |
|---|---|
| **Reduced motion** | The design already has a `no-motion` concept. The app runs several always-on ambient loops (`design-system/components/anim.tsx` — `FloatBob`, `PulseRing`, `FadeUp`, plus the `Compass` sway fallback); this switch should stop them, not just slow them. Also a performance win — pair with pausing loops off-screen via `useIsFocused` (`YouScreen.tsx` already uses that hook, so the pattern is there). |
| **Haptics off** | Half done by [02 warmth haptics](02-warmth-haptics.md): the flag persists (`settings.haptics`, default on) and `services/haptics.setHapticsEnabled()` persists + applies in one call. All that's missing is the You-screen row that calls it. |
| **Accurate compass** | Accessibility escape hatch for [12 lying compass](12-lying-compass.md). |
| **Text size** | Respect OS Dynamic Type. The four custom families in `tokens.typography.fonts` need checking at large sizes — the paper layouts are tight. |
| **High contrast** | The paper/ink/sage palette is low-contrast by design; needs an alternate token set, not per-component overrides. |
| **Night map style** | Partly done: `STYLE_OPTIONS` in `services/maps/maplibreAdapter.tsx` already ships `dark` and `grayscale`, and the choice persists (`getMapStyle`). What's missing is (a) a *paper-toned* dark cut of the custom `droppedStyle.ts` — today's `dark` is stock Protomaps v5 and doesn't match the design — and (b) auto-switch at sunset. |
| **Battery mode** | GPS cadence low/normal on the `services/location` watch. Matters because fog of war and warmth both ride the watch. |
| **Export trail as postcard** | Render the Trail scrapbook / [10 constellation](10-city-constellation.md) to an image for the share sheet. Places and dates only — **never secret bodies**. |

## Also worth doing while in here

- Accessibility labels on the icon-only buttons (there are 18 stroke icons in
  `design-system/icons`, several used as bare tap targets).
- Android hardware back-button audit across the walk/reveal flow.
- Loading / empty / error states on every query — `useNearbyDrops`,
  `useTrailFound`, etc. currently assume the happy path.

## Risks / notes

- Reduced motion is the one with real teeth: the reveal sequence (screens 06→07)
  is animation-heavy, and it needs a non-animated path that still delivers the
  secret, not a degraded one that skips the payoff.
