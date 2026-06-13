# Plan: MapLibre + Protomaps — Real Map Provider
**Date:** 2026-06-13

## Context

The app has a fully designed map UI (MapScreen + WalkSequenceScreen) that currently renders:
- A decorative animated SVG (`MapTexture`) as the map backdrop on MapScreen
- A static SVG street grid (`RouteMap`) as the walk sequence backdrop

Both need to be replaced with a real interactive map powered by **MapLibre GL** using **Protomaps** free vector tiles — styled to match the Dropped paper/ink/sage palette exactly. The `MapAdapter` interface is already defined; we just need to implement it.

**Goal:** Zero visual deviation from the design. The map tiles should look like they belong in the design — warm, desaturated, minimal POI clutter, sage river, paper-toned streets.

---

## What changes

### 1. Install packages

```
npm install @maplibre/maplibre-react-native
```

No Protomaps JS SDK needed — Protomaps delivers a `.pmtiles` file (or CDN tiles endpoint) that MapLibre reads natively via a style JSON.

> Note: `@maplibre/maplibre-react-native` requires native linking. On Android, autolinking handles it. iOS needs `pod install`.

### 2. Native setup

**Android** — no extra steps beyond autolinking.

**iOS** — run `pod install` after install. Also add `NSLocationWhenInUseUsageDescription` to `Info.plist` (already planned in remaining-work §5 — do it alongside this).

### 3. MapLibre style JSON (`src/services/maps/droppedStyle.ts`)

Create a Protomaps-compatible MapLibre style JSON that matches Dropped's palette:

| Map element | Color |
|---|---|
| Land / background | `#F1EBDE` (paper) |
| Water / river | `rgba(118,149,124,0.45)` (accent, semi-transparent) |
| Parks / grass | `rgba(118,149,124,0.18)` (accent-tint) |
| Roads (major) | `#E8E0D0` (paper-deep), 1px hairline |
| Roads (minor) | `rgba(33,29,23,0.06)` |
| Buildings | `rgba(33,29,23,0.05)` |
| Labels (place names) | `#6E665A` (ink-soft), Geist font |
| POI labels | hidden (too noisy for this app) |
| Transit lines | hidden |

Tile source: Protomaps CDN — `https://api.protomaps.com/tiles/v4/{z}/{x}/{y}.mvt?key=YOUR_KEY` (free tier, 100k tiles/mo). Key is an env var (`PROTOMAPS_API_KEY`), injected at build time via a `.env` + `react-native-config` (already listed as a potential dep, or use `__DEV__` guard with a bundled key for dev).

**Alternative (no key needed in dev):** Use the Protomaps public demo endpoint or bundle a small regional `.pmtiles` file for offline dev.

### 4. Implement `MaplibreAdapter` (`src/services/maps/maplibreAdapter.ts`)

Implement the `MapAdapter` interface using `@maplibre/maplibre-react-native`:

```typescript
export interface MapAdapter {
  flyTo(coordinate: Coordinate, zoom?: number): void;
  setMarkers(markers: MapMarker[]): void;
  getCenter(): Coordinate | null;
}
```

The adapter wraps a ref to the MapLibre `Camera` component. `flyTo` calls `camera.setCamera(...)`. `setMarkers` updates a React state slice that feeds `ShapeSource` + `SymbolLayer` for pins. `getCenter` reads from a stored coordinate updated via `onRegionDidChange`.

The adapter is a React hook (`useMaplibreAdapter`) that returns both the adapter object and a `MaplibreView` component to render.

### 5. Update `MapScreen` (`src/features/map/screens/MapScreen.tsx`)

Replace `<MapTexture dense />` with the real `<MaplibreView>` at `StyleSheet.absoluteFill` behind all overlays.

**Keep everything else exactly as-is:**
- Park blob + PARK label
- All 4 `<MapPin>` floats (they become real map markers eventually, but for now keep as RN views floating above the map — design-correct)
- Range stage (pulse rings, youDot, live pin)
- LocChip, Layers FAB, Drop FAB, RangeCard

The map is the background; all UI overlays remain RN views. This means zero visual regression on overlays.

**Center:** User's real GPS coordinate (from `services/location`). Zoom level ~15 (street level, matches design density). Falls back to a default coordinate if location not yet granted.

### 6. Update `WalkSequenceScreen` (`src/features/map/screens/WalkSequenceScreen.tsx`)

Replace `<RouteMap />` with `<MaplibreView style={StyleSheet.absoluteFill}>` at the same z-index. Camera locked to the secret's coordinate + user's position bounding box, non-interactive (no pan/zoom — user taps the screen to advance beats, not the map).

`<RouteLine />` stays — it's an SVG overlay traced over the map.

All `<Anchor>` positioned elements stay — they use percentage coordinates in the design's 346×780 space. These still need to be overlaid as RN views; the map is just the terrain beneath them.

### 7. Update `src/services/maps/index.ts`

Export `maplibreAdapter` as the active adapter (replacing the noop):

```typescript
import { maplibreAdapter } from './maplibreAdapter';
export const maps = maplibreAdapter;
```

Keep `noopAdapter` for tests.

### 8. Custom marker layer

For the locked pin markers (`MapMarker[]`), render via MapLibre `ShapeSource` + `SymbolLayer` using a small custom icon (the lock silhouette from the design, pre-rasterized to PNG via `react-native-svg` snapshot or a bundled asset). Alternatively, render them as RN views positioned by `MapView`'s `pointForCoordinate` API — simpler, consistent with the existing `MapPin` component, no asset pipeline needed.

**Decision:** Use RN view markers (not SymbolLayer) for now. Keeps `MapPin` component unchanged, avoids asset pipeline work, and matches the current "views floating above MapTexture" pattern exactly.

---

## Files to create / modify

| File | Action |
|---|---|
| `src/services/maps/droppedStyle.ts` | Create — MapLibre style JSON matching paper palette |
| `src/services/maps/maplibreAdapter.ts` | Create — `useMaplibreAdapter` hook + `MaplibreView` component |
| `src/services/maps/index.ts` | Update — export `maplibreAdapter` as active adapter |
| `src/features/map/screens/MapScreen.tsx` | Update — swap `<MapTexture dense>` for `<MaplibreView>` |
| `src/features/map/screens/WalkSequenceScreen.tsx` | Update — swap `<RouteMap>` for `<MaplibreView>` |
| `android/app/build.gradle` | Verify autolinking picked up (no manual edit expected) |
| `ios/Podfile` / run `pod install` | After npm install |

**Reuse existing:**
- `src/services/maps/types.ts` — `MapAdapter`, `MapMarker`, `secretToMarker` unchanged
- `src/services/maps/noopAdapter.ts` — kept for tests
- `src/features/map/components/MapPin.tsx` — rendered as RN view above map, unchanged
- `src/services/location/index.ts` — `getCurrent()` and `watch()` feed the map camera
- `src/design-system/tokens/colors.ts` — all palette values used in style JSON

---

## Protomaps API key

Protomaps free tier requires an API key (sign up at protomaps.com, free, no CC). Key goes in `.env` as `PROTOMAPS_API_KEY`. The style JSON references it. During plan execution, confirm whether to use:
- (A) Protomaps CDN with key (best quality, needs signup)
- (B) Stadia Maps free tier (no key for low traffic, multiple good styles)
- (C) Bundle a `.pmtiles` file for offline-first (no key, larger app size)

**Recommended: (A)** — free tier generous, best tile quality, simplest style customization.

---

## Verification

1. `npm run android` — map renders on MapScreen with paper-toned tiles
2. Overlays (pins, LocChip, FABs, RangeCard) sit correctly above the map
3. WalkSequenceScreen shows real map tiles beneath the SVG route line + anchored elements
4. `flyTo` moves camera when called
5. Tiles match palette — no blue water, no grey roads, no default OSM style leaking through
6. `npm test` — existing tests pass (noopAdapter still used in tests, no breakage)
7. `npm run lint` — no new errors
