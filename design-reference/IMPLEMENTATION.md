# Dropped — Design → React Native Implementation Notes

This file records how the **Dropped V1** HTML/CSS design reference was recreated
natively in the React Native app under [`/src`](../src). The design files in
`Dropped V1/` (`dropped.css`, `dropped-screens.js`, `dropped-decorate.js`) are the
authoritative source; this is the map from those to the shipped code.

> The `Dropped Canvas.html` file in the reference is the design **review tool**
> (a pan/zoom artboard viewer), not product. It was **not** rebuilt. Its role —
> letting you flip through every screen — is filled in-app by the swipeable
> **Deck** ([`src/Deck.tsx`](../src/Deck.tsx)).

## How to run
```sh
npm install
npm start            # Metro
npm run android      # or: npm run ios
```
The app opens into the Deck: swipe (or use prev/next) through all 14 artboards.
A **motion** toggle in the top bar drives the global reduced-motion flag (the RN
equivalent of the CSS `body.no-motion` switch).

## Design system (consumed from `dropped.css`)
| CSS source | Code |
|---|---|
| `:root` color tokens | [`src/theme/colors.ts`](../src/theme/colors.ts) |
| type roles / families | [`src/theme/typography.ts`](../src/theme/typography.ts) |
| radii, 372×806 frame, hit targets | [`src/theme/metrics.ts`](../src/theme/metrics.ts) |
| card / seal / sheet box-shadows | [`src/theme/shadows.ts`](../src/theme/shadows.ts) |
| `body.no-motion` switch | [`src/theme/motion.ts`](../src/theme/motion.ts) |

## Shared primitives ([`src/components`](../src/components))
`.screen` gradient → `PaperBackground` · phone surface + island + status bar →
`PhoneFrame` / `StatusBar` · `.btn*` → `Button` · `.kicker` / `.fun-kicker` →
`Kicker` / `HandKicker` · `.funhead` → `FunHead` · wax seal → `WaxSeal` ·
`.emotion-tag` → `EmotionTag` · `.tape` → `WashiTape` · pulsing rings
(`ringPulse`/`rangePulse`) → `RingPulse` · floating notes/pins (`floatA/bob`) →
`Float` · `.tabbar` → `TabBar` · `.postmark` → `Postmark` · the seal-break
choreography (`.bigseal`/`.break-stage`) → `SealBreak`. All inline glyph SVGs and
the placeholder maps from `dropped-decorate.js` (`MAP_SVG`, `ROUTEMAP`,
`ROUTELINE`, `STATUS`) → `svg.tsx`, `MapBackground`, `RouteMap`.

## Screen map (`window.DROPPED_SECTIONS` → components in [`src/screens`](../src/screens))
| # | Design id | Component |
|---|---|---|
| 01 | `01-welcome-fun` | `WelcomeScreen` |
| 02 | `02-how-it-works-fun` | `HowItWorksScreen` |
| 03 | `03-location-fun` | `LocationScreen` |
| 04 | `04-map-fun` | `MapScreen` |
| 05 | `05-walk-closer-fun` | `WalkCloserScreen` |
| 06+07 | `06-opening-fun` + `07-the-secret-fun` | `OpeningSecretScreen` (combined) |
| 08 | `08-composer-fun` | `ComposerScreen` |
| 09 | `09-it-s-here-now-fun` | `DroppedConfirmScreen` |
| 10 | `10-your-trail-fun` | `TrailScreen` |
| 11 | `11-you-fun` | `YouScreen` |
| 04a/b/c | `04a/b/c-map-*` | `HuntScreen` (one component, `beat` prop) |

## Deviations from the reference (and why)
- **Seal break is in-place, not a screen change.** Screens 06 → 07 are one
  component: the cracking wax cross-fades into the confession card in place
  (`SealBreak` → fade), the way a real app reveals content. Tap the seal or
  "break it open"; the ✕ reseals.
- **Hunt trio is one component.** 04a/04b/04c differ only by state, mirroring the
  CSS per-beat overrides (`.s4map.appr/.rng/.here`) — collapsed to a `beat` prop.
- **Maps are placeholders.** Ported verbatim from `dropped-decorate.js` as SVG.
  README calls these stand-ins; swap for a real provider (Mapbox/Apple) styled
  sage-on-paper. The seam is `MapBackground` / `RouteMap`.
- **Paper grain dropped.** The `body::before` multiply fractal-noise overlay has
  no cheap RN equivalent; the radial gradient alone carries the warmth.
- **Some ambient loops simplified.** `mapdrift` pan and the compass settle are
  rendered static (low value, costly); ring pulses, float/bob, caret blink and
  the seal break are animated via `Animated` and respect reduced-motion.
- **Fonts.** Newsreader / Geist / Geist Mono / Caveat are referenced by family in
  `typography.ts` and wired via `react-native.config.js`; until the `.ttf`s are
  dropped into `assets/fonts/` and `npx react-native-asset` is run, RN falls back
  to platform serif/sans/mono. This is the one remaining step for pixel-faithful
  type.

## Not built (per scope)
- The pan/zoom design canvas (`Dropped Canvas.html` / `dropped-canvas-app.jsx`).
- Real GPS / backend. State is mock/static; the in-range → break-seal flow is
  demoable without location.
