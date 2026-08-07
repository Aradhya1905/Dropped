/**
 * privacyZones — the circles this app is not allowed to look inside.
 *
 * A zone is a coordinate and a radius. Inside one, the app records no
 * fog-of-war cell, asks the server no location-keyed question, and refuses to
 * place a drop. Pure functions only: the storage of the zones lives in
 * `services/storage` and the *enforcement* lives at each capture site, which is
 * the whole point — filtering on display while still recording the cells would
 * be a lie, and an invisible one.
 *
 * Zones never leave the device. Nothing here serializes one to the network, and
 * nothing should.
 */
import type { Coordinate } from '../../types';
import { haversineMeters } from '../../utils/geo';

export interface PrivacyZone {
  id: string;
  centre: Coordinate;
  radiusM: number;
  /** What the user calls it — "Home", "Work". Local, and only ever local. */
  label?: string;
}

/**
 * ~150 m: big enough to swallow a building and the pavement outside it, small
 * enough that setting one over your flat doesn't blank half a neighbourhood.
 */
export const DEFAULT_ZONE_RADIUS_M = 150;

/** Radii offered in the picker. */
export const ZONE_RADIUS_OPTIONS = [100, 150, 250, 400] as const;

/**
 * Home, work, school — the three places a person is regularly and predictably
 * found. More than that and the map stops being a map; fewer and the feature
 * doesn't cover the case it exists for.
 */
export const MAX_PRIVACY_ZONES = 3;

/** Suggested names, offered in order as zones are added. */
export const ZONE_LABEL_SUGGESTIONS = ['Home', 'Work', 'School'] as const;

/**
 * Whether a coordinate falls inside any zone.
 *
 * **The boundary counts as inside** (`<=`). Every caller of this is deciding
 * whether to record or transmit something, so the tie has to fail closed — and
 * `ComposerScreen`'s drop refusal uses the same call, so "can I drop here?" and
 * "is this recorded?" can never disagree at the edge.
 *
 * An empty list is always outside. Haversine is periodic in longitude, so a
 * zone sitting on the antimeridian works without special-casing.
 */
export function isInsideAnyZone(c: Coordinate, zones: PrivacyZone[]): boolean {
  return zones.some(z => haversineMeters(c, z.centre) <= z.radiusM);
}

/** The zone a coordinate is inside, for naming it in a refusal. */
export function zoneAt(c: Coordinate, zones: PrivacyZone[]): PrivacyZone | null {
  return zones.find(z => haversineMeters(c, z.centre) <= z.radiusM) ?? null;
}

/** The next unused suggested label, or undefined once they're all taken. */
export function nextZoneLabel(zones: PrivacyZone[]): string | undefined {
  const taken = new Set(zones.map(z => z.label));
  return ZONE_LABEL_SUGGESTIONS.find(label => !taken.has(label));
}
