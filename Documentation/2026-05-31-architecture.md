# Dropped — Architecture

_2026-05-31_

## What it is
Anonymous, no-login app. People pin secret confessions/stories to a real GPS
coordinate. Others can only read a secret after physically walking **within
50 m** of where it was dropped — then the app does a **reveal**.

> PostSecret × geocaching × Pokémon Go, minus the Pokémon.
> Design voice: serif wordmark "Dropped", mono tagline "SECRETS, WHERE THEY HAPPENED", warm-paper + moss palette.

Core loop: **drop → walk → reveal**.

## Stack
- **Bare React Native 0.85.3 / React 19** (not Expo).
- TypeScript, path-based `src/` layout.
- Deferred (installed per-feature, not yet): Zustand (state), React Query (data), local notifications.
- **Map** — `@maplibre/maplibre-react-native` + Protomaps CDN vector tiles (2026-06-13).
  See [Map provider](#map-provider-maplibre--protomaps) below.

## Folder map
```
src/
  app/            app shell — providers + navigation
  design-system/  "Dropped" UI kit: tokens · components · icons
  features/       one folder per domain section (drop→walk→reveal loop)
    onboarding/   intro slides + location/notification permission priming
    map/          city map with hidden secret pins
    nearby/       list/compass of secrets near you ("getting warmer" distance)
    drop/         compose a secret + pin it to a location
    reveal/       the within-50 m unlock + reveal animation
    settings/     about, anon prefs, permission re-prompt
  services/       cross-cutting integrations behind adapters
    api/          HTTP client + interceptors
    storage/      MMKV/AsyncStorage (anon device id, seen-secrets cache)
    maps/         MapAdapter interface + MapLibre/Protomaps implementation (droppedStyle.ts, maplibreAdapter.tsx)
    location/     GPS watch + distance-to-drop + within-50 m logic
    notifications/ local push when near an undiscovered secret
    analytics/
  store/          global Zustand stores (anon session, activeDrop, discovered)
  utils/          geo (haversine/isWithin), format, validators
  types/          shared domain types: Coordinate, Drop, Secret, RevealState
```
Each `features/*` contains `screens/ · components/ · hooks/ · api/ · types.ts`.

## Remap from the reference (ride-hail) project
| Reference | Dropped | Why |
|---|---|---|
| `auth/` | removed | anonymous, no login |
| `request/ matching/ payment/` | `drop/ map/ nearby/ reveal/` | the drop→walk→reveal loop |
| `services/payments otp` | `services/location notifications` | GPS + proximity are the product |
| `i18n/` | omitted (add later) | not needed yet |
| `maps/` (Mappls) | `maps/` agnostic stub | provider chosen later |

## Seeded (real, not placeholder)
- `design-system/tokens/*` — colors (`ink #211D18`, `moss #566E5B`), type, spacing, radii.
- `types/index.ts` — `Coordinate`, `Drop`, `Secret`, `RevealState`, `REVEAL_RADIUS_M = 50`.
- `utils/geo.ts` — `haversineMeters`, `isWithin` (50 m default).
- `services/maps/` — `MapAdapter` interface + `noopAdapter` + live MapLibre adapter (see below).

Everything else is a compile-clean barrel + README so the tree self-documents.

## Map provider — MapLibre + Protomaps

_Added 2026-06-13._

**Why this stack:** MapLibre GL is the open-source fork of Mapbox GL; same render engine, zero cost. Protomaps delivers OpenStreetMap-derived vector tiles via CDN (free tier: 100k tiles/month, no credit card). Combined they produce Mapbox-quality maps at $0.

**Files:**

| File | Role |
|---|---|
| `services/maps/droppedStyle.ts` | MapLibre style JSON. Paper `#F1EBDE` ground, sage `rgba(118,149,124,…)` water + parks, `#E8E0D0` roads, `inkSoft` street labels. POI + transit layers hidden. |
| `services/maps/maplibreAdapter.tsx` | `useMaplibreAdapter()` hook. Returns `MaplibreView` (the `<Map>` component ready to drop in) and a `MapAdapter` object (`flyTo`, `setMarkers`, `getCenter`). Center tracked synchronously via `onRegionDidChange`. |
| `services/maps/noopAdapter.ts` | Kept for unit tests — no native bridge needed. |

**How screens use it:**

```tsx
const { MaplibreView } = useMaplibreAdapter();
// render <MaplibreView /> at StyleSheet.absoluteFill as the lowest layer;
// all RN overlay components (pins, cards, FABs) sit above it unchanged.
```

`MapScreen` replaces `<MapTexture dense />`. `WalkSequenceScreen` replaces `<RouteMap />`.
`MapTexture` SVG is **kept** on onboarding screens — it's a design element, not a map.

**API key:** `PROTOMAPS_API_KEY` const in `maplibreAdapter.tsx` (line ~29). Sign up free at protomaps.com. Replace with `Config.PROTOMAPS_API_KEY` once `react-native-config` is added.

**Jest:** `@maplibre/maplibre-react-native` is mocked in `jest.setup.js` (no native bridge in tests). Added to `transformIgnorePatterns` in `jest.config.js` so TypeScript source is transpiled by Babel.

## Conventions
- Features never import a vendor SDK directly — go through a `services/*` adapter.
- `design-reference/` holds the read-only design export (HTML). Don't edit it.
- Root `App.tsx` stays the template until `src/app/App.tsx` (providers + nav) is wired.
