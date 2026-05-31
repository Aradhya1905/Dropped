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
- Deferred: a **map provider** (added last, behind `services/maps`); local notifications.

### Fonts
Four families in `assets/fonts/`, linked via `react-native-asset` (Android `assets/fonts/`, iOS `Info.plist`):
Newsreader (serif), Geist (sans), Geist Mono (mono), Caveat (hand). Each weight is a separate file.
**Reference them via `tokens.typography.fonts.*`** (e.g. `fonts.serif`, `fonts.sansMedium`) — not raw strings,
and **don't also set `fontWeight`**. iOS uses each font's PostScript name (e.g. `Newsreader24pt-Regular`),
Android uses the filename; the token's `Platform.select` handles the split. Newsreader uses the 24pt optical cut.
To add a weight later: drop the `.ttf` in `assets/fonts/`, re-run `npx react-native-asset`, add a token entry.

### Native setup still pending (do when wiring features, not yet)
- `index.js`: add `import 'react-native-gesture-handler';` as the **first** line.
- `babel.config.js`: add the **`react-native-worklets/plugin`** plugin (last in the list) — reanimated 4 uses worklets' plugin, not the old `react-native-reanimated/plugin`.
- Permissions: location (geolocation) + camera/mic (vision-camera) in `AndroidManifest.xml` / `Info.plist`.
- iOS: `pod install` after native deps change.

## Layout (`src/`)
- `app/` — shell: providers + navigation
- `design-system/` — UI kit: `tokens/` (colors, type, spacing, radii), components, icons
- `features/` — one folder per domain (`onboarding map nearby drop reveal settings`);
  each has `screens/ components/ hooks/ api/ types.ts`
- `services/` — vendor integrations behind adapters (`api storage maps location notifications analytics`)
- `store/` — global Zustand stores
- `utils/` — `geo.ts` (haversine, isWithin), format, validators
- `types/` — `Coordinate`, `Drop`, `Secret`, `RevealState`, `REVEAL_RADIUS_M = 50`

Most of the tree is compile-clean barrels/READMEs. Real logic so far:
`types/index.ts`, `utils/geo.ts`, `design-system/tokens/*`, `services/maps/` adapter stub.

## Conventions
- Features **never** import a vendor SDK directly — go through a `services/*` adapter.
- `design-reference/` is a read-only design export (HTML). Don't edit it.
- Root `App.tsx` stays the RN template until `src/app/App.tsx` is wired in.
- Full architecture notes: [Documentation/2026-05-31-architecture.md](Documentation/2026-05-31-architecture.md).

## Commands
- `npm start` — Metro dev server
- `npm run android` / `npm run ios` — build & run
- `npm test` — Jest
- `npm run lint` — ESLint
