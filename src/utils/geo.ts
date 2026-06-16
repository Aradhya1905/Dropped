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
