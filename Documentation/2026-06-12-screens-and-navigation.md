# Dropped — Screens & Navigation (design implementation)

_2026-06-12_

All 14 screens from the Claude Design handoff (`design-reference/`) are now
implemented as real React Native screens, plus the full navigation graph.
UI-only: no GPS, no backend, no map provider yet — mock copy comes straight
from the design. Implementation plan:
[.claude/plans/2026-06-12-design-screens-navigation.md](../.claude/plans/2026-06-12-design-screens-navigation.md).

## Design source

The handoff bundle's canvas ("Dropped Canvas") is defined by three files in
`design-reference/project/`:

- `dropped-screens.js` — `window.DROPPED_SECTIONS`: the HTML of all 14 phone
  screens (372×806 artboards)
- `dropped.css` — every visual spec (palette, type, shadows, keyframes)
- `dropped.js` — shared SVGs: the living map texture, the route map + route
  line, the status bar / wordmark decorators

Everything below was traced from those sources, not re-imagined.

## Screens → code

| # | Design screen | Component | Feature |
|---|---|---|---|
| 01 | Welcome — wall of secrets | `WelcomeScreen` | `features/onboarding` |
| 02 | How it works — three rules | `HowItWorksScreen` | `features/onboarding` |
| 03 | Location — stand here | `LocationScreen` | `features/onboarding` |
| 04 | Map — in range | `MapScreen` | `features/map` |
| 04a/b/c | Walking into range (3 beats) | `WalkSequenceScreen` (`beat` param: `approach · range · arrived`) | `features/map` |
| 05 | Walk closer — compass sheet | `SecretDetailScreen` | `features/nearby` |
| 06 | Opening — the seal bursts | `OpeningScreen` | `features/reveal` |
| 07 | The secret — unlocked card | `SecretScreen` | `features/reveal` |
| 08 | Composer — what happened here? | `ComposerScreen` | `features/drop` |
| 09 | It's here now — sealed! | `DroppedScreen` | `features/drop` |
| 10 | Your trail — scrapbook | `TrailScreen` | `features/trail` **(new feature folder)** |
| 11 | You — anonymous passport | `YouScreen` | `features/settings` |

`features/trail/` was added (same `screens/components/hooks/api/types`
shape as its siblings) because the design introduces a Trail tab that wasn't
one of the original six domains.

## Navigation (`src/app/navigation/`)

React Navigation v7, headerless native-stack throughout:

```
RootStack
├─ Welcome → HowItWorks → Location        onboarding, 01–03
├─ Main → MainTabs (custom paper TabBar)  Map · Trail · You
│    └─ MapTab → MapStack: MapHome → Walk (04 → 04a/b/c; tab bar persists)
├─ SecretDetail (05)   slide-from-bottom
├─ Opening (06) → Secret (07)   fade
└─ Composer (08) → Dropped (09) slide-from-bottom / fade
```

Wired flows:

- Welcome "Start exploring" → HowItWorks → "Got it" → Location → Main
  (`replace`, so back can't re-enter onboarding); the welcome wax stamp jumps
  straight to Composer.
- Map: sealed pin → SecretDetail; "Walk here to unlock" → Walk beats
  (tap the map to advance) → "Break the seal" → Opening → tap → Secret.
- Map FAB → Composer → "Drop here · forever" → Dropped → "Walk away" /
  "Drop another".
- Route param types live in `app/navigation/types.ts`
  (`RootStackParamList`, `MainTabParamList`, `MapStackParamList`, `WalkBeat`).

## Design-system additions

- **tokens/colors** — exact design palette (`paper #F1EBDE`, `paperDeep`,
  `paperCard`, `ink #211D17`, `inkSoft`, `inkFaint`, `line`, `lineSoft`,
  `accent #76957C`, `accentDeep #566E5B`, `accentTint`); old keys kept as
  deprecated aliases.
- **tokens/shadows** — the CSS box-shadow stacks as RN `boxShadow` strings
  (note/chip/card/sheet/seal/sealLarge/core). RN 0.85 + New Architecture
  supports CSS-like `boxShadow`, including multiple shadows and `inset`.
- **tokens/typography** — added `serifLightItalic` (Newsreader LightItalic).
- **icons/** — 18 stroke icons traced 1:1 from the design's inline SVGs.
- **components/** — `PaperScreen` (radial paper ground), `MapTexture`
  (living map; `dense`/`blur` variants, 64s drift), `WaxSeal` (radial-gradient
  seal, optional press + stamp-pulse), `Tape` (ribbed washi), `AppButton`
  (primary/ghost/outline), `FunKicker`/`FunTitle`/`HandUnderline`/`MetaFoot`,
  `EmotionTag`, `CloseX`, `Grabber`, `Postmark`, `Sheet`, `TabBar`, and the
  animation primitives `FadeUp` / `FloatBob` / `PulseRing`.

Feature-local composites stay inside each feature: SecretNote, Ticket,
SealBreakMini, RadiusStage (onboarding); MapPin, LocChip, RangeCard, RouteMap,
RouteLine, MapStatus, FindCard (map); Compass (nearby); SealBurst (reveal);
WriteCard, MoodChips (drop); Receipt, TrailCard (trail); Passport (settings).

## Animation approach

Everything runs on the **core Animated API** (no reanimated usage yet, so the
worklets babel plugin still isn't needed):

- ring pulses (`ringPulse`/`rangePulse`), float/bob of notes & pins, map
  drift, caret blink, compass sway, stamp pulse, seal-shake on arrival
- the 4.4s **seal burst** (06) is one looping master timeline whose keyframe
  fractions are lifted straight from the CSS: wobble → halves fling → note
  springs out → 8 shards + rays + glow → "snap!"
- walk beats animate position changes via `LayoutAnimation`; walk-overlay
  coordinates are percentages of the design's 346×780 space so they track the
  stretched route line on any device size

## Deliberate translations (HTML → native)

- The fake iPhone frame, Dynamic Island and 9:41 status bar are device
  chrome — the app uses the real OS status bar + safe-area insets.
- Sealed/blurred handwriting: RN can't blur glyphs, so transparent fill +
  soft same-color text-shadow reads as out-of-focus ink.
- Blurred map screens use SVG `FeGaussianBlur` (react-native-svg 15 filters).
- The paper-grain `feTurbulence` overlay has no RN equivalent — omitted.
- CSS radial gradients (seals, sheets, screen grounds) → SVG `RadialGradient`.
- `em` letter-spacings converted to dp (`em × fontSize`).

## App shell & tooling changes

- `src/app/App.tsx` is the real shell now: `AppProviders`
  (GestureHandlerRootView + SafeAreaProvider) → themed `NavigationContainer`
  → `RootNavigator`. Root `App.tsx` just re-exports it.
- `index.js` starts with `import 'react-native-gesture-handler';`.
- `jest.config.js` + `jest.setup.js`: transform React Navigation's ESM
  packages, gesture-handler/safe-area/screens mocks, fake timers (the looping
  ambient animations would otherwise hold the test process open).

## Still pending (unchanged)

- Map provider behind `services/maps` (the map is decorative SVG for now).
- Real geolocation + permissions (`AndroidManifest.xml` / `Info.plist`).
- Worklets babel plugin — only when reanimated is actually used.
- State (Zustand) / data (React Query) — screens carry mock design copy.
