# 2026-06-12 — Implement all design screens + navigation

Source: `design-reference/` (Claude Design handoff, "Dropped Canvas"). The canvas
holds **14 phone screens** defined by `dropped-screens.js` (markup) +
`dropped.css` (all visual specs) + `dropped.js` (shared SVGs: living map,
route map, route line). Scope per user: **screens + navigation only**, pixel-true
to the design; no maps provider, no backend, no business logic.

## Screens → features

| Design screen | RN screen | Feature |
|---|---|---|
| 01 Welcome — fun | `WelcomeScreen` | onboarding |
| 02 How it works — fun | `HowItWorksScreen` | onboarding |
| 03 Location — fun | `LocationScreen` | onboarding |
| 04 Map — fun | `MapScreen` | map |
| 04a/b/c approaching / in range / reached | `WalkSequenceScreen` (one screen, `beat` param: `approach · range · arrived`) | map |
| 05 Walk closer — fun | `SecretDetailScreen` | nearby |
| 06 Opening — fun | `OpeningScreen` | reveal |
| 07 The secret — fun | `SecretScreen` | reveal |
| 08 Composer — fun | `ComposerScreen` | drop |
| 09 It's here now — fun | `DroppedScreen` | drop |
| 10 Your trail — fun | `TrailScreen` | **trail (new feature folder)** — the design adds a Trail tab that wasn't in the original six domains |
| 11 You — fun | `YouScreen` | settings |

## Navigation (React Navigation v7, already installed)

```
RootStack (native-stack, headerless)
├─ Onboarding → OnboardingStack: Welcome → HowItWorks → Location
├─ Main → MainTabs (custom TabBar: Map · Trail · You, per design tabbar)
│   ├─ MapTab → MapStack: MapHome → Walk (04a/b/c beats)
│   ├─ TrailTab → TrailScreen
│   └─ YouTab → YouScreen
├─ SecretDetail (05) — full-screen over map
├─ Opening (06) → Secret (07)
├─ Composer (08) → Dropped (09)
```

Flows: Welcome → HowItWorks → Location → Main. Map range-card → Opening →
Secret. Map pin → SecretDetail. FABs → Composer → Dropped → back to Map /
Drop another. Walk beats advance by tapping; `Break the seal` → Opening.

## Design-system additions

- **tokens/colors** — exact design palette: `paper #F1EBDE · paperDeep #E8E0D0 ·
  paperCard #F7F2E8 · ink #211D17 · inkSoft #6E655A · inkFaint #A79D8D ·
  line rgba(33,29,23,.14) · lineSoft rgba(33,29,23,.07) · accent #76957C ·
  accentDeep #566E5B · accentTint rgba(118,149,124,.14)` (legacy keys kept).
- **tokens/typography** — add `serifLightItalic` (Newsreader LightItalic is bundled).
- **tokens/shadows** — shared `boxShadow` strings (RN 0.85 new-arch supports
  CSS-like box shadows incl. inset) mirroring the CSS shadow stacks.
- **icons/** — small stroke icon set drawn from the design's inline SVGs
  (pin, brand pinmark, lock, layers, arrow, close, heart, bookmark, send,
  walk, tab icons…). All `react-native-svg`.
- **components/** — `PaperScreen` (radial paper gradient stage),
  `MapTexture` (living-map SVG; `dense`/`blur` variants + drift),
  `WaxSeal`, `Tape`, `AppButton` (primary/ghost/outline), `FunKicker`,
  `FunTitle` (+ hand-drawn underline), `EmotionTag`, `CloseX`, `Grabber`,
  `MetaFoot`, `Postmark`, `PulseRings`, `FloatBob`, `FadeUp` (entrance),
  `Sheet` (rounded-top sheet w/ radial gradient), `TabBar`.

Feature-local components stay in `features/*/components` (SecretNote, Ticket,
SealBreak, RouteMap, FindCard, Compass, SealBurst, SecretCard, WriteCard,
MoodChips, Receipt, TrailCard, Passport…).

## Fidelity notes / deliberate translations

- The HTML draws a fake iPhone frame, Dynamic Island and 9:41 status bar —
  that's device chrome; the real app uses the OS status bar + safe-area insets.
- Animations recreated with the core `Animated` API (no babel change needed):
  ring pulses, float/bob, caret blink, compass sway, map drift, seal wobble +
  burst + shards + "snap!", fade-up entrances. Reanimated stays unused for now.
- Blurred-map screens (05–07, 09–11): `FeGaussianBlur` via react-native-svg
  filters on the map texture.
- Paper-grain noise (`feTurbulence`) is not reproducible in RN — omitted.
- `mask-image` scroll fades (10, 11) → gradient overlay fades.
- CSS radial gradients (wax seals, sheets, screen bg) → SVG `RadialGradient`.
- `em` letter-spacings converted to dp (em × fontSize).
- Wired during this work (allowed by CLAUDE.md "do when wiring features"):
  `import 'react-native-gesture-handler'` first in `index.js`, root `App.tsx`
  re-exports `src/app/App.tsx`. Worklets babel plugin **not** added (no
  reanimated usage yet). No permissions needed (no real GPS yet).
