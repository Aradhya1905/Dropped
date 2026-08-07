import type { Coordinate } from '../types';
import { REVEAL_RADIUS_M } from '../types';

const EARTH_RADIUS_M = 6_371_000;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Great-circle distance between two coordinates, in meters (haversine).
 * Heart of the app: drives "how far to the secret" and the reveal unlock.
 */
export function haversineMeters(a: Coordinate, b: Coordinate): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/**
 * Initial bearing from `from` → `to`, in degrees (0–360, 0 = north, clockwise).
 * Used to point the compass needle at a drop.
 */
export function bearingTo(from: Coordinate, to: Coordinate): number {
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** True when `a` is within `meters` of `b` (default = the 50 m reveal radius). */
export function isWithin(
  a: Coordinate,
  b: Coordinate,
  meters: number = REVEAL_RADIUS_M,
): boolean {
  return haversineMeters(a, b) <= meters;
}

/**
 * A closed ring of `steps` coordinates approximating a circle of `radiusM`
 * around `center` — for drawing the 50 m unlock zone as a real geographic
 * polygon on the map. Uses an equirectangular offset (fine at these radii).
 */
export function circlePolygon(
  center: Coordinate,
  radiusM: number,
  steps = 64,
): Coordinate[] {
  const dLat = (radiusM / EARTH_RADIUS_M) * (180 / Math.PI);
  const dLng = dLat / Math.cos(toRad(center.lat));
  const ring: Coordinate[] = [];
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;
    ring.push({
      lat: center.lat + dLat * Math.sin(theta),
      lng: center.lng + dLng * Math.cos(theta),
    });
  }
  return ring;
}

// --- fog-of-war grid ---------------------------------------------------------

/**
 * Fog cell edge, in degrees. 0.00009° of latitude ≈ 10 m — fine enough that a
 * cleared path reads as a street, coarse enough that a long walk stays a few
 * thousand cells.
 */
export const FOG_CELL_DEG = 0.00009;

/**
 * The grid is a **fixed degree grid on both axes**, so cells are not square
 * away from the equator: a cell's east-west extent shrinks by cos(lat) (~2.6%
 * at Bengaluru's 12.97°, much more at high latitude). That's deliberate.
 * Correcting per-latitude would make a cell id depend on where you were when
 * you computed it, so a long north-south walk would re-tile itself — visibly
 * worse than a slightly oblong cell.
 */
export function cellIdFor(c: Coordinate): string {
  const latIdx = Math.floor(c.lat / FOG_CELL_DEG);
  const lngIdx = Math.floor(c.lng / FOG_CELL_DEG);
  return `${latIdx}:${lngIdx}`;
}

/**
 * Inverse of {@link cellIdFor}: the cell's south-west and north-east corners,
 * for drawing it as a rectangle. Returns `null` for a malformed id.
 */
export function cellBounds(id: string): [Coordinate, Coordinate] | null {
  const [latRaw, lngRaw] = id.split(':');
  const latIdx = Number(latRaw);
  const lngIdx = Number(lngRaw);
  if (!Number.isFinite(latIdx) || !Number.isFinite(lngIdx)) return null;
  return [
    { lat: latIdx * FOG_CELL_DEG, lng: lngIdx * FOG_CELL_DEG },
    { lat: (latIdx + 1) * FOG_CELL_DEG, lng: (lngIdx + 1) * FOG_CELL_DEG },
  ];
}

/**
 * Resample a polyline so points sit roughly `everyMeters` apart along it —
 * used to space footstep marks evenly down the walking route regardless of how
 * densely the provider returned the geometry. Always keeps the first vertex.
 */
export function samplePointsAlongLine(
  line: Coordinate[],
  everyMeters: number,
): Coordinate[] {
  if (line.length === 0) return [];
  const out: Coordinate[] = [line[0]];
  let carried = 0;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1];
    const b = line[i];
    const seg = haversineMeters(a, b);
    if (seg === 0) continue;
    let dist = carried;
    while (dist + everyMeters <= seg) {
      dist += everyMeters;
      const t = dist / seg;
      out.push({ lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t });
    }
    carried = seg - dist;
  }
  return out;
}

/** A sampled step along a route: its coordinate and the travel heading there. */
export interface PathStep {
  coord: Coordinate;
  headingDeg: number;
}

/**
 * Like {@link samplePointsAlongLine}, but tags each point with the segment
 * bearing (so a footstep mark can be rotated to follow the path) and SKIPS the
 * start vertex — so no step lands directly under the user's own location dot.
 * `headingDeg` is 0–360 (0 = north, clockwise); usable as a screen rotation
 * while the map is north-up.
 */
export function samplePathSteps(
  line: Coordinate[],
  everyMeters: number,
): PathStep[] {
  if (line.length < 2) return [];
  const out: PathStep[] = [];
  let carried = 0;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1];
    const b = line[i];
    const seg = haversineMeters(a, b);
    if (seg === 0) continue;
    const headingDeg = bearingTo(a, b);
    let dist = carried;
    while (dist + everyMeters <= seg) {
      dist += everyMeters;
      const t = dist / seg;
      out.push({
        coord: { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t },
        headingDeg,
      });
    }
    carried = seg - dist;
  }
  return out;
}
