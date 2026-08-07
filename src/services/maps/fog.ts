/**
 * Fog of war geometry — turns the set of walked grid cells (see `utils/geo`
 * `cellIdFor`) into a single GeoJSON polygon: the world, with the cells the
 * user has physically walked punched out as holes. MapLibre renders that
 * natively, so there is no RN overlay and no blend mode involved.
 *
 * Pure module: no MapLibre, no storage, no React — all of it is unit testable.
 * See FUN_TODOs/01-fog-of-war.md.
 */
import { FOG_CELL_DEG } from '../../utils/geo';
import { FOG_CELL_CAP } from '../storage/keys';

/** A west/south/east/north box in degrees. */
export interface FogRect {
  west: number;
  south: number;
  east: number;
  north: number;
}

/** Viewport box used to clip which cells are worth drawing. */
export type FogView = FogRect;

/**
 * Hard ceiling on holes handed to the renderer. Viewport clipping normally
 * keeps this far lower; the cap is the backstop for a zoomed-out view of a
 * very long trail.
 */
export const FOG_MAX_RECTS = 3000;

/**
 * How much of "your city" one full fog map represents. Tied to the storage cap
 * so the stat reads 100% exactly when the walked set is full: 20k cells × 100 m²
 * ≈ 2 km² of ground, which is a realistic amount of a city to walk on foot.
 */
export const CITY_CELL_TARGET = FOG_CELL_CAP;

/** Grow a viewport box by `factor` of its own span on each side. */
export function padView(view: FogView, factor: number): FogView {
  const dLat = (view.north - view.south) * factor;
  const dLng = (view.east - view.west) * factor;
  return {
    west: view.west - dLng,
    south: view.south - dLat,
    east: view.east + dLng,
    north: view.north + dLat,
  };
}

interface Run {
  start: number;
  end: number; // inclusive
}

/**
 * Merge walked cells into as few non-overlapping rectangles as possible:
 * consecutive cells in a row collapse into one run, and consecutive rows with
 * an identical run pattern collapse into one block.
 *
 * Non-overlapping matters — these become interior rings of one polygon, and
 * overlapping holes are not valid GeoJSON (the triangulator is free to render
 * garbage). Seams between the resulting neighbours are handled at paint time
 * with `fill-antialias: false`, not by fattening the rectangles.
 */
export function cellsToRects(
  cells: Iterable<string>,
  view: FogView | null,
  maxRects: number = FOG_MAX_RECTS,
): FogRect[] {
  // 1. Bucket cell ids into rows, dropping anything outside the viewport.
  const rows = new Map<number, number[]>();
  for (const id of cells) {
    const sep = id.indexOf(':');
    if (sep < 0) continue;
    const latIdx = Number(id.slice(0, sep));
    const lngIdx = Number(id.slice(sep + 1));
    if (!Number.isFinite(latIdx) || !Number.isFinite(lngIdx)) continue;

    if (view) {
      const south = latIdx * FOG_CELL_DEG;
      const west = lngIdx * FOG_CELL_DEG;
      if (
        south + FOG_CELL_DEG < view.south ||
        south > view.north ||
        west + FOG_CELL_DEG < view.west ||
        west > view.east
      ) {
        continue;
      }
    }

    const row = rows.get(latIdx);
    if (row) row.push(lngIdx);
    else rows.set(latIdx, [lngIdx]);
  }
  if (rows.size === 0) return [];

  // 2. Collapse each row's cells into runs of consecutive columns.
  const runsByRow = new Map<number, Run[]>();
  for (const [latIdx, cols] of rows) {
    cols.sort((x, y) => x - y);
    const runs: Run[] = [];
    let current: Run = { start: cols[0], end: cols[0] };
    for (let i = 1; i < cols.length; i++) {
      const col = cols[i];
      if (col === current.end) continue; // duplicate
      if (col === current.end + 1) current.end = col;
      else {
        runs.push(current);
        current = { start: col, end: col };
      }
    }
    runs.push(current);
    runsByRow.set(latIdx, runs);
  }

  // 3. Collapse vertically: rows that are adjacent AND have the same run
  //    pattern become one taller block (a walk straight up a street).
  const latIndexes = [...runsByRow.keys()].sort((x, y) => x - y);
  const rects: FogRect[] = [];
  let blockStart = latIndexes[0];
  let blockRuns = runsByRow.get(blockStart)!;
  let blockSig = signature(blockRuns);

  const emit = (startLat: number, endLat: number, runs: Run[]) => {
    for (const run of runs) {
      rects.push({
        west: run.start * FOG_CELL_DEG,
        east: (run.end + 1) * FOG_CELL_DEG,
        south: startLat * FOG_CELL_DEG,
        north: (endLat + 1) * FOG_CELL_DEG,
      });
    }
  };

  for (let i = 1; i < latIndexes.length; i++) {
    const latIdx = latIndexes[i];
    const runs = runsByRow.get(latIdx)!;
    const sig = signature(runs);
    if (latIdx === latIndexes[i - 1] + 1 && sig === blockSig) continue;
    emit(blockStart, latIndexes[i - 1], blockRuns);
    blockStart = latIdx;
    blockRuns = runs;
    blockSig = sig;
  }
  emit(blockStart, latIndexes[latIndexes.length - 1], blockRuns);

  return rects.length > maxRects ? rects.slice(0, maxRects) : rects;
}

function signature(runs: Run[]): string {
  let out = '';
  for (const r of runs) out += `${r.start}-${r.end},`;
  return out;
}

// --- GeoJSON -----------------------------------------------------------------

type Ring = [number, number][];

/**
 * The whole world as the polygon's exterior ring, counter-clockwise per the
 * GeoJSON right-hand rule. ±85° rather than ±90° because that's the limit of
 * the Web Mercator projection the tiles use.
 */
const WORLD_RING: Ring = [
  [-180, -85],
  [180, -85],
  [180, 85],
  [-180, 85],
  [-180, -85],
];

/** A rectangle wound clockwise — the winding an interior ring (hole) wants. */
function holeRing(r: FogRect): Ring {
  return [
    [r.west, r.south],
    [r.west, r.north],
    [r.east, r.north],
    [r.east, r.south],
    [r.west, r.south],
  ];
}

export interface FogFeature {
  type: 'Feature';
  properties: Record<string, never>;
  geometry: { type: 'Polygon'; coordinates: Ring[] };
}

/** The world minus the walked rectangles, ready for a GeoJSON source. */
export function fogFeature(rects: FogRect[]): FogFeature {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [WORLD_RING, ...rects.map(holeRing)],
    },
  };
}

/**
 * Share of "your city" the user has cleared, 0–100. Deliberately generous at
 * the low end — the first walk should move the number off zero.
 */
export function coveragePercent(
  cellCount: number,
  target: number = CITY_CELL_TARGET,
): number {
  if (target <= 0) return 0;
  return Math.min(100, (cellCount / target) * 100);
}

/** `coveragePercent` formatted the way the Trail header shows it. */
export function formatCoverage(cellCount: number): string {
  const pct = coveragePercent(cellCount);
  if (pct === 0) return '0%';
  if (pct < 0.1) return '<0.1%';
  return `${pct.toFixed(pct < 10 ? 1 : 0)}%`;
}
