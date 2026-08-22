import { useQuery } from '@tanstack/react-query';

import type { Coordinate } from '../../../types';
import type { ApiFootRoute } from '../../../services/api';
import { getFootRoute } from '../api';

/**
 * The walking route from the user → a drop, fetched from the backend proxy
 * (which tries ORS, then Mapbox, then returns `available: false`).
 *
 * The origin is snapped to a ~30 m grid in the query key so normal GPS jitter
 * doesn't refire the request — it only refetches once you've actually moved a
 * block. The backend caches per ~11 m, so this is cheap on top of that.
 */
const GRID_DEG = 0.0003; // ≈ 33 m of latitude
const snap = (n: number) => Math.round(n / GRID_DEG);

export function useFootRoute(origin: Coordinate | null, target: Coordinate | null) {
  return useQuery<ApiFootRoute>({
    queryKey: [
      'route',
      'foot',
      origin ? snap(origin.lat) : null,
      origin ? snap(origin.lng) : null,
      target?.lat,
      target?.lng,
    ],
    queryFn: () => getFootRoute(origin!, target!),
    enabled: origin != null && target != null,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
  });
}
