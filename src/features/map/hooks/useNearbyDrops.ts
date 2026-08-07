import { useQuery } from '@tanstack/react-query';

import { MOODS, type Coordinate, type Mood, type Secret } from '../../../types';
import { apiSecretToSecret } from '../../../services/api/mappers';
import { getNearbyDrops } from '../api';

// Snap the origin to a ~33 m grid in the query key (same pattern as
// useFootRoute) so normal GPS jitter while standing still doesn't refetch the
// nearby drops and churn/flicker the map markers. The server radius (2 km) is
// far larger than the grid, so the result set is unaffected.
const GRID_DEG = 0.0003; // ≈ 33 m of latitude
const snap = (n: number) => Math.round(n / GRID_DEG);

/** What a nearby fetch returns: the visible drops, plus what the filter ate. */
export interface NearbyDrops {
  secrets: Secret[];
  hiddenByFilter: number;
}

export const EMPTY_NEARBY: NearbyDrops = { secrets: [], hiddenByFilter: 0 };

/**
 * The react-query key for a nearby fetch.
 *
 * Exported (and pure) so the two properties that matter can be tested without
 * a renderer:
 *
 * - the 33 m grid snap survives — jitter must not produce a new key;
 * - the mood part is order-independent and normalized, so toggling chips in a
 *   different order hits the same cache entry, and selecting all four is
 *   identical to selecting none (both mean "everything", and both must share
 *   one entry or the map refetches on a no-op).
 */
export function nearbyQueryKey(coord: Coordinate | null, moods: Mood[] = []) {
  const filtering = moods.length > 0 && moods.length < MOODS.length;
  return [
    'drops',
    'nearby',
    coord ? snap(coord.lat) : null,
    coord ? snap(coord.lng) : null,
    filtering ? [...moods].sort().join(',') : '',
  ] as const;
}

export function useNearbyDrops(coord: Coordinate | null, moods: Mood[] = []) {
  return useQuery<NearbyDrops>({
    queryKey: nearbyQueryKey(coord, moods),
    queryFn: () =>
      getNearbyDrops(coord!.lat, coord!.lng, 2000, moods).then(res => ({
        secrets: res.secrets.map(apiSecretToSecret),
        hiddenByFilter: res.hiddenByFilter,
      })),
    enabled: coord != null,
    staleTime: 30_000,
    // Keep the previous filter's pins on screen while the new filter loads, so
    // toggling a chip doesn't blank the map for a frame.
    placeholderData: prev => prev,
    // No time-based polling: refetch on screen focus and whenever the user
    // crosses into a new ~33 m grid cell (the query key changes). Standing
    // still reading a secret shouldn't churn the network or battery.
  });
}
