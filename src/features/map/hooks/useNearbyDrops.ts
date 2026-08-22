import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { Coordinate, Secret } from '../../../types';
import { apiSecretToSecret } from '../../../services/api/mappers';
import { hydrateDrops } from '../../../store/dropsStore';
import { getNearbyDrops } from '../api';

// Snap the origin to a ~33 m grid in the query key (same pattern as
// useFootRoute). The GPS watch emits a new object on every fix, so keying on
// raw lat/lng minted a fresh cache entry (and an empty loading state — pins
// blinking out) every few seconds while standing still. The server radius
// (2 km) is far larger than the grid, so the result set is unaffected.
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
    queryFn: async () => {
      const secrets = (await getNearbyDrops(coord!.lat, coord!.lng)).map(apiSecretToSecret);
      // Detail / Walk / Opening read secrets out of the store by id, so what
      // the map shows has to land there too.
      hydrateDrops(secrets);
      return secrets;
    },
    enabled: coord != null,
    staleTime: 30_000,
    // No time-based polling: refetch on screen focus and whenever the user
    // crosses into a new ~33 m grid cell (the query key changes). Standing
    // still reading a secret shouldn't churn the network or battery.
    // Keep the previous block's pins on screen while the next one loads.
    placeholderData: keepPreviousData,
  });
}
