# 01 — Fog of war map

**Effort:** M · **Where:** client only · **Status:** built (device QA owed)
**Plan:** [2026-08-07-01-fog-of-war.md](../.claude/plans/2026-08-07-01-fog-of-war.md)

## What

The map starts dimmed/desaturated everywhere. As the user walks, their GPS path
paints a permanent cleared "ink trail" into the map. Places you've never walked
stay fogged.

## Why

Highest fun-per-effort idea on the list, and it costs nothing server-side:

- Gives a reason to walk down a street you've never walked — the map is the
  reward, not the secret.
- Compounds. Every session makes the artifact better, which is exactly the
  retention shape you want from a walking app.
- It literally names the Trail tab. Right now "Trail" is a scrapbook list; this
  makes it a map you drew with your feet.

## Client work

- **Storage** — persist the walked path in MMKV via `services/storage`. Don't
  store raw fixes: snap to a grid (e.g. ~10 m cells, or geohash precision 8) and
  store a `Set` of visited cell ids. Bounded, cheap to diff, cheap to render.
  Add a key in `services/storage/keys.ts` **and a typed getter/setter pair in
  `services/storage/index.ts`** — that module exposes explicit accessors
  (`getMapStyle`, `getStepState`, …), features never touch MMKV directly.
- **Capture** — hook into the existing GPS watch (`services/location`,
  `LocationContext.tsx`). Add cells on each fix above an accuracy threshold;
  ignore fixes with bad accuracy so the trail doesn't smear. Note `watch()`
  applies an accuracy floor only during cold-start acquisition and streams every
  fix after that, so the filter has to live in the capture layer, not be assumed
  from the watch.
- **Foreground-only, and say so.** The watch lives in the React tree, so the map
  paints only while the app is open. That's fine — a walk with the app open is
  the product — but the "% uncovered" copy shouldn't imply passive tracking.
  Ambient capture is [16](16-background-walk-engine.md).
- **Render** — MapLibre already backs `MapScreen` and `WalkSequenceScreen` via
  `services/maps/maplibreAdapter.tsx`. Two options:
  1. A dark paper-toned fill layer over the whole viewport with the visited
     cells punched out as a GeoJSON source (`fill` + a `fill` hole polygon or a
     second layer with blend). Prefer this — it's a MapLibre source update, not
     an RN overlay.
  2. A cheaper first pass: an RN SVG overlay of visited cells above the map,
     using `react-native-svg` which is already a dependency.
- **Style** — keep it in the paper/ink/sage palette. Fog should read as
  *unopened paper*, not as a video-game black. Coordinate with
  `services/maps/droppedStyle.ts`.
- **Trail tab** — show the fog map as the header of `TrailScreen.tsx`, with a
  "% of your city uncovered" style stat.

## Backend work

None. Optionally later: sync cells so the trail survives a device wipe — but the
privacy posture argues for keeping the walked path *on device only*, and the
design copy already promises the user's own location never leaves the device.
Keep it local.

## Risks / notes

- Rendering cost on a long-lived trail. Cap by only rendering cells within the
  current viewport, and consider a coarser cell size at low zoom.
- Interacts with [14 — home privacy zone](14-settings-trust.md): cells inside a
  privacy zone must never be recorded.
- Battery: reuse the existing watch, don't start a second one.
