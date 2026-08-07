# 15 — Settings: polish & accessibility

**Effort:** S · **Where:** client only · **Status:** **built** (device QA owed)
**Plan:** [2026-08-07-15-settings-polish.md](../.claude/plans/2026-08-07-15-settings-polish.md)
**Branch:** `feat/15-settings-polish`, cut from `feature/funToDos` (not `main` —
this sits on top of 02/09/10/12)

Small rows, no backend, mostly a day's work each. Several are already implied by
the design or listed under "Polish" in the remaining-work doc.

| Setting | Notes | Built |
|---|---|---|
| **Reduced motion** | The design already has a `no-motion` concept. The app runs several always-on ambient loops (`design-system/components/anim.tsx` — `FloatBob`, `PulseRing`, `FadeUp`, plus the `Compass` sway fallback); this switch should stop them, not just slow them. Also a performance win — pair with pausing loops off-screen via `useIsFocused` (`YouScreen.tsx` already uses that hook, so the pattern is there). | ✅ `tokens/motion.ts` + all 11 loop sites |
| **Haptics off** | Half done by [02 warmth haptics](02-warmth-haptics.md): the flag persists (`settings.haptics`, default on) and `services/haptics.setHapticsEnabled()` persists + applies in one call. All that's missing is the You-screen row that calls it. | ✅ row added |
| **Accurate compass** | Accessibility escape hatch for [12 lying compass](12-lying-compass.md). | ✅ shipped with 12 |
| **Text size** | Respect OS Dynamic Type. The four custom families in `tokens.typography.fonts` need checking at large sizes — the paper layouts are tight. | ✅ partial — see below |
| **High contrast** | The paper/ink/sage palette is low-contrast by design; needs an alternate token set, not per-component overrides. | ✅ `tokens/colors.ts` |
| **Night map style** | Partly done: `STYLE_OPTIONS` in `services/maps/maplibreAdapter.tsx` already ships `dark` and `grayscale`, and the choice persists (`getMapStyle`). What's missing is (a) a *paper-toned* dark cut of the custom `droppedStyle.ts` — today's `dark` is stock Protomaps v5 and doesn't match the design — and (b) auto-switch at sunset. | ✅ `droppedNight` + `auto` |
| **Battery mode** | GPS cadence low/normal on the `services/location` watch. Matters because fog of war and warmth both ride the watch. | ✅ `watchOptions()` |
| **Export trail as postcard** | Render the Trail scrapbook / [10 constellation](10-city-constellation.md) to an image for the share sheet. Places and dates only — **never secret bodies**. | ✅ `TrailPostcard` |

## Also worth doing while in here

- ✅ Accessibility labels on the icon-only buttons (there are 18 stroke icons in
  `design-system/icons`, several used as bare tap targets).
- ✅ Android hardware back-button audit across the walk/reveal flow.
- ✅ Loading / empty / error states on every query — `useNearbyDrops`,
  `useTrailFound`, etc. currently assume the happy path.

## Risks / notes

- Reduced motion is the one with real teeth: the reveal sequence (screens 06→07)
  is animation-heavy, and it needs a non-animated path that still delivers the
  secret, not a degraded one that skips the payoff.

## How it was built

### Reduced motion actually stops

`design-system/tokens/motion.ts` is the whole contract:

- `useReducedMotion()` — **the OS setting OR the in-app toggle**. The OR means
  the app switch can only ever add stillness, never remove it, so a phone
  already asking for reduced motion gets it without anyone opening these
  settings. `isReducedMotion()` is the synchronous form for animation code that
  runs inside an effect and can't await.
- `useLoopsActive()` — motion allowed **and** the screen focused **and** the app
  foregrounded. Pausing and stopping are kept distinct: a paused loop resumes,
  a reduced-motion loop never starts and its value snaps to rest.
- `useScreenFocused()` is deliberately not `useIsFocused` — that throws outside
  a navigator, and these primitives also render from sheets and tests. No
  navigator means "assume visible".

Every stopped animation renders a **chosen** resting frame, never frame zero:

| Component | Rests at | Why that frame |
|---|---|---|
| `FadeUp` | arrived — opacity 1, no offset | |
| `FloatBob` | base rotation, no drift | the hand-pinned tilt is layout, not motion |
| `PulseRing` | one still ring at full radius | the radius is the information |
| `SealBurst` | timeline `t = 0.82` | seal broken, halves flung, note out, "snap!" up, shards already landed. **Freezing at 0 would show an unbroken seal — the opposite of what screen 06 says.** |
| `SealBreakMini` | cracked open (`t = 1`) | the drawing exists to say "arriving breaks the seal" |
| `MapTexture` | mid-drift | centred, so a stopped background isn't visibly offset |
| `UserDot` | one static ring | "you, with uncertainty around you" |
| `RouteLine` | flowing dash removed | the dotted trace already draws the route |
| `Compass` | snaps to the true bearing | the bearing is information, the sweep is decoration |

`SecretScreen` (07) needed no change — it was already static, so the payoff
survives intact. Fixed en route: `UserDot`'s loop was started without a
teardown and leaked on every unmount.

### High contrast, and why it applies on next launch

`tokens/colors.ts` now exports `paperColors`, `highContrastColors` (identical
keys, enforced by `colors.test.ts`) and `colors`, which **resolves once at
import**. Nearly every style in the app comes from a module-scope
`StyleSheet.create` that reads these values exactly once, so a set swapped later
repaints nothing — and a half-repainted app is worse than either. Resolving at
import reaches every screen including ones nobody converted; the cost is that
the row says "takes effect next time you open the app", which it does.
`activeColors()` gives the live value for anything that needs it.

Text size uses the same mechanism, and is **partial by design**: OS Dynamic Type
already scales every `<Text>` for free (that's the accessibility half, and it is
complete). The in-app boost on top only reaches sizes taken from `textStyles` /
`fontSize`; screens with a literal `fontSize: 16` follow the OS only. Converting
those literals is ordinary follow-up, not a correctness gap.
`cappedTextProps` caps runaway scaling where a layout can't reflow — it never
sets `allowFontScaling={false}`.

### Night map

`droppedStyle.ts` grew a `StylePalette` and a `NIGHT` set: warm near-black
ground, sage that sinks rather than turns blue, roads still the lighter figure.
It is not Protomaps' stock `dark`, which is a good map of a different app.

`services/maps/nightStyle.ts` holds the rule that matters: **`auto` is a mode,
not a style.** It persists as `auto` and resolves at render, so a later manual
pick simply wins. Resolving before writing would convert a standing preference
into a one-off choice the user never made. No fix → day style, because a
wrongly-dark map looks like the tiles failed to load.

`utils/sun.ts` is new — 09 put sun times on the server, so there was nothing to
reuse. It decides nothing gated: it exists for this one cosmetic, offline job.
`isNight` reads solar altitude rather than sunrise/sunset so it stays correct
inside the polar circles. Validated against published London solstice times to
within 5 minutes.

### Back-button audit

Two real bugs, both found by walking the flow rather than by reading it:

1. **Opening (06), backed out mid-reveal.** The in-flight `reveal()` resolved
   and called `navigation.replace('Secret')` — which acts on whatever is on top
   *now*, so it swapped the walk the user had deliberately returned to. Now
   guarded on focus. The reveal already succeeded server-side, so the drop is
   unsealed for good and costs them nothing to open later. Same guard on the
   403 alerts, which otherwise fired as a jump-scare on another screen.
2. **Composer (08).** Android back silently discarded a written confession.
   `usePreventRemove` now confirms — only when there is text to lose.

Everything else was already correct: Composer→Dropped and Opening→Secret both
use `replace`, so back never replays a reveal or returns to a spent composer.

### Query states

`design-system/components/QueryState.tsx`, used by Trail, Constellation and the
city points; Map and You get inline banners because their content must keep
rendering offline. The rule it exists to enforce: **a failed query must never
look like an empty one.** In this app that difference is the whole promise —
one says "nothing happened here", the other says "we couldn't ask".

### Deviations from the plan

- **Postcard export lives on the Trail screen, not in settings.** The plan put
  a row on You; the control belongs next to the thing it exports. The card
  (`TrailPostcard`) is pure SVG rendered off-screen so `toDataURL` captures
  exactly what was drawn and nothing off-card can leak in. Places, counts and
  dates only, with that promise printed on the card itself.
- **The You-screen rows are one component**
  (`features/settings/components/AccessibilitySettings.tsx`), inserted as a
  single line. Tickets 13 and 14 are rewriting `YouScreen` around a shared
  `SettingRow` at the same time; this keeps the merge to one line. When they
  land, re-express these rows in whatever row primitive wins — the behaviour is
  the part worth keeping.
- **No full map-style picker on You.** The row is "Map follows the sun"
  (on → `auto`, off → `dropped`); the other four cuts stay in the map's Layers
  sheet, where you can see the result of choosing one.

### Tests

24 suites / 259 passing (was 231). New: `tokens/motion.test.tsx` (asserts the
*rendered resting value*, never the duration — a `duration === 0` test would
pass on a broken implementation), `tokens/colors.test.ts` (key equality, plus a
check that the high-contrast set actually differs), `maps/nightStyle.test.ts`
(sun validation, the `auto` cases, manual-wins, no-fix fallback, both polar
extremes). Extended: storage defaults/round-trips/unknown-value fallbacks, and
the battery-mode watch cadence.

### Device QA still owed

The whole of the plan's Device QA list. The ones that can only be judged on
hardware: reduce-motion through a full 06→07 reveal; OS text size at maximum
across all 14 screens (the plan is right that this is where "S" becomes "M" —
the tight paper layouts will surface real debt); high contrast on a real panel;
TalkBack through walk/reveal; `auto` map style across an actual sunset; battery
mode on a 10-minute walk; and every tab with the network killed.
