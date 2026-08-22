import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { Coordinate, Secret } from '../../../types';
import { apiSecretToSecret } from '../../../services/api/mappers';
import { hydrateDrops } from '../../../store/dropsStore';
import { getNearbyDrops } from '../api';

/**
 * Round the cache key to ~110 m. The GPS watch emits a new object on every
 * fix, so keying on raw lat/lng minted a fresh cache entry (and an empty
 * loading state — pins blinking out) every few seconds while standing still.
 */
const keyPart = (n: number | undefined) => (n == null ? null : n.toFixed(3));

export function useNearbyDrops(coord: Coordinate | null) {
  return useQuery<Secret[]>({
    queryKey: ['drops', 'nearby', keyPart(coord?.lat), keyPart(coord?.lng)],
    queryFn: async () => {
      const secrets = (await getNearbyDrops(coord!.lat, coord!.lng)).map(apiSecretToSecret);
      // Detail / Walk / Opening read secrets out of the store by id, so what
      // the map shows has to land there too.
      hydrateDrops(secrets);
      return secrets;
    },
    enabled: coord != null,
    staleTime: 30_000,
    refetchInterval: 60_000,
    // Keep the previous block's pins on screen while the next one loads.
    placeholderData: keepPreviousData,
  });
}
