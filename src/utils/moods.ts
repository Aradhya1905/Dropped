import { MOODS, type Mood, type Secret } from '../types';

/** True when every mood is chosen, i.e. the filter does nothing. */
export const isAllMoods = (moods: readonly Mood[]) =>
  MOODS.every(m => moods.includes(m));

/**
 * The drops the map should show for the chosen moods.
 *
 * Trail stops are always kept: the server only sends a stop once this device
 * has earned it, and hiding one mid-trail would break the line and the
 * "next stop" card.
 */
export function filterByMood(drops: Secret[], moods: readonly Mood[]): Secret[] {
  if (isAllMoods(moods)) return drops;
  return drops.filter(d => d.chain != null || moods.includes(d.mood));
}
