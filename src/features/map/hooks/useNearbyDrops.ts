import { useQuery } from '@tanstack/react-query';

import type { Coordinate, Secret } from '../../../types';
import { apiSecretToSecret } from '../../../services/api/mappers';
import { getNearbyDrops } from '../api';

// Snap the origin to a ~33 m grid in the query key (same pattern as
// useFootRoute) so normal GPS jitter while standing still doesn't refetch the
// nearby drops and churn/flicker the map markers. The server radius (2 km) is
// far larger than the grid, so the result set is unaffected.
const GRID_DEG = 0.0003; // ≈ 33 m of latitude
const snap = (n: number) => Math.round(n / GRID_DEG);

export function useNearbyDrops(coord: Coordinate | null) {
  return useQuery<Secret[]>({
    queryKey: [
      'drops',
      'nearby',
      coord ? snap(coord.lat) : null,
      coord ? snap(coord.lng) : null,
    ],
    queryFn: () => getNearbyDrops(coord!.lat, coord!.lng).then(ss => ss.map(apiSecretToSecret)),
    enabled: coord != null,
    staleTime: 30_000,
    // No time-based polling: refetch on screen focus and whenever the user
    // crosses into a new ~33 m grid cell (the query key changes). Standing
    // still reading a secret shouldn't churn the network or battery.
  });
}
