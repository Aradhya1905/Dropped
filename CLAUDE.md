# Dropped

Anonymous, no-login app. People pin secret confessions/stories to a real GPS
coordinate. Others can only **read** a secret after physically walking **within
50 m** of where it was dropped — then the app does a **reveal**.

> PostSecret × geocaching × Pokémon Go, minus the Pokémon.

Core loop: **drop → walk → reveal**. No accounts — users are identified by an
anonymous device id. Moderation is the hard problem, not engineering.

## Working conventions
- **Plans** — when producing an implementation plan, write it as a dated markdown
  file in `.claude/plans/` (e.g. `.claude/plans/2026-05-31-reveal-flow.md`).
- **Commit & sync** — use the `/sync` slash command. It stages, commits with a
  generated message, and pushes (asking first before any push to `main`).

## Stack
- Bare **React Native 0.85.3 / React 19** (not Expo), **TypeScript**. New Architecture on by default.
- Installed:
  - **Nav** — React Navigation v7 (native-stack + bottom-tabs) + peers `react-native-screens`, `react-native-gesture-handler` v3
  - **State/data** — Zustand, `@tanstack/react-query`, `axios` (HTTP, behind `services/api`)
  - **Storage** — `react-native-mmkv` v4 (Nitro Module; needs `react-native-nitro-modules`)
  - **Animation** — `react-native-reanimated` v4 + `react-native-worklets` (paired; reveal/near animations)
  - **Location** — `react-native-geolocation-service` (GPS watch, distance-to-drop)
  - **Camera/media** — `react-native-vision-camera` v5 + `react-native-nitro-image` (paired), `react-native-svg`
  - **UI** — `react-native-modal`, `@react-native-clipboard/clipboard`
  - **Map** — `@maplibre/maplibre-react-native` with Protomaps CDN tiles, custom paper/ink/sage style JSON (`services/maps/droppedStyle.ts`), adapter at `services/maps/maplibreAdapter.ts`
- Deferred: local notifications.

### Fonts
Four families in `assets/fonts/`, linked via `react-native-asset` (Android `assets/fonts/`, iOS `Info.plist`):
Newsreader (serif), Geist (sans), Geist Mono (mono), Caveat (hand). Each weight is a separate file.
**Reference them via `tokens.typography.fonts.*`** (e.g. `fonts.serif`, `fonts.sansMedium`) — not raw strings,
and **don't also set `fontWeight`**. iOS uses each font's PostScript name (e.g. `Newsreader24pt-Regular`),
Android uses the filename; the token's `Platform.select` handles the split. Newsreader uses the 24pt optical cut.
To add a weight later: drop the `.ttf` in `assets/fonts/`, re-run `npx react-native-asset`, add a token entry.

### Native setup
- ✅ Done: `index.js` imports `react-native-gesture-handler` first; root `App.tsx`
  hands off to `src/app/App.tsx` (providers + navigation).
- Still pending (do when the relevant feature lands):
  - `babel.config.js`: the **`react-native-worklets/plugin`** plugin (last in the
    list) — only once reanimated is actually used; all current screen animations
    run on the core Animated API, so it isn't needed yet.
  - Permissions: location (geolocation) + camera/mic (vision-camera) in
    `AndroidManifest.xml` / `Info.plist` — UI permission screens exist, but
    nothing requests OS permissions yet.
  - iOS: `pod install` after native deps change.

## Layout (`src/`)
- `app/` — shell: `providers/` (gesture root + safe area) and `navigation/`
  (RootNavigator, MainTabs with the custom paper TabBar, route param types)
- `design-system/` — UI kit: `tokens/` (colors, type, spacing, radii, shadows),
  `components/` (PaperScreen, MapTexture, WaxSeal, AppButton, Sheet, TabBar,
  FadeUp/FloatBob/PulseRing, …), `icons/` (18 stroke icons from the design)
- `features/` — one folder per domain (`onboarding map nearby drop reveal trail settings`);
  each has `screens/ components/ hooks/ api/ types.ts`. `trail/` was added for
  the design's Trail tab (found/saved/dropped scrapbook).
- `services/` — vendor integrations behind adapters (`api storage maps location notifications analytics`)
- `store/` — global Zustand stores
- `utils/` — `geo.ts` (haversine, isWithin), format, validators
- `types/` — `Coordinate`, `Drop`, `Secret`, `RevealState`, `REVEAL_RADIUS_M = 50`

Implemented: all 14 design screens (UI-only, mock copy from the design) + the
full navigation graph. `hooks/ api/ store/` and most `services/*` are still
barrels — no GPS, backend, state, or map provider yet. See
[Documentation/2026-06-12-screens-and-navigation.md](Documentation/2026-06-12-screens-and-navigation.md)
for the screen→code map and design-translation notes.

### Navigation map
```
RootStack: Welcome → HowItWorks → Location → Main
           Main = tabs (Map · Trail · You); MapTab nests MapHome → Walk (04a/b/c beats)
           + SecretDetail (05) · Opening (06) → Secret (07) · Composer (08) → Dropped (09)
```

## Conventions
- Features **never** import a vendor SDK directly — go through a `services/*` adapter.
  (React Navigation and react-native-svg count as app infrastructure, not vendor SDKs.)
- `design-reference/` is a read-only design export (HTML). Don't edit it. The 14
  screens live in `project/dropped-screens.js` (markup), `dropped.css` (visual
  spec) and `dropped.js` (shared SVGs) — treat those as the source of truth for
  pixel checks.
- Visual style: exact design palette via `tokens.colors` (paper/ink/sage), CSS
  shadows via `tokens.shadows` as `boxShadow` strings (New Arch), ambient
  animations on the core Animated API (no reanimated yet).
- Root `App.tsx` just re-exports `src/app/App.tsx` — edit the shell there.
- Full architecture notes: [Documentation/2026-05-31-architecture.md](Documentation/2026-05-31-architecture.md);
  screens & navigation: [Documentation/2026-06-12-screens-and-navigation.md](Documentation/2026-06-12-screens-and-navigation.md);
  remaining work / roadmap: [Documentation/2026-06-13-remaining-work.md](Documentation/2026-06-13-remaining-work.md).

## Package manager
Use **yarn** (not npm) for all installs. `yarn add <pkg>` / `yarn add -D <pkg>`.

## Commands
- `yarn start` — Metro dev server
- `yarn android` / `yarn ios` — build & run
- `yarn test` — Jest
- `yarn lint` — ESLint
