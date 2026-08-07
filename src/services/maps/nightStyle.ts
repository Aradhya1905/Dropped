/**
 * nightStyle — turning the persisted map-style *choice* into the style the map
 * actually renders.
 *
 * The distinction the whole file exists for: **`auto` is a mode, not a style.**
 * It is persisted as `auto` and resolved to a concrete cut at render time, so a
 * later manual pick simply replaces the mode and wins forever after. Resolving
 * at write time — persisting `droppedNight` the moment the sun goes down —
 * would silently convert someone's standing preference into a one-off choice
 * they never made, and they'd wake up to a dark map with no way to tell why.
 */
import type { Coordinate } from '../../types';
import { isNight } from '../../utils/sun';
import type { MapStyle } from '../storage';

/** A style the map can actually be handed — every `MapStyle` except the mode. */
export type ResolvedMapStyle = Exclude<MapStyle, 'auto'>;

export const AUTO_DAY_STYLE: ResolvedMapStyle = 'dropped';
export const AUTO_NIGHT_STYLE: ResolvedMapStyle = 'droppedNight';

/**
 * How often an `auto` map re-asks the sun. Sunset is not an event the app can
 * subscribe to, so it is polled; ten minutes is far finer than the eye can
 * catch a gradual change and costs one trigonometric evaluation.
 */
export const AUTO_RECHECK_MS = 10 * 60 * 1000;

/**
 * Resolve the persisted choice against the sun at `coord`.
 *
 * With no location fix we return the **day** style rather than guessing. A
 * wrongly-bright map is a cosmetic annoyance; a wrongly-dark one looks like the
 * tiles failed to load, and the first thing anyone does about that is decide
 * the app is broken.
 */
export function resolveMapStyle(
  choice: MapStyle,
  coord: Coordinate | null | undefined,
  at: number = Date.now(),
): ResolvedMapStyle {
  if (choice !== 'auto') {
    return choice;
  }
  if (!coord) {
    return AUTO_DAY_STYLE;
  }
  return isNight(coord, at) ? AUTO_NIGHT_STYLE : AUTO_DAY_STYLE;
}
