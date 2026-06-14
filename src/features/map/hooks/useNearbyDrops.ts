import { useQuery } from '@tanstack/react-query';

import type { Coordinate, Secret } from '../../../types';
import { apiSecretToSecret } from '../../../services/api/mappers';
import { getNearbyDrops } from '../api';

export function useNearbyDrops(coord: Coordinate | null) {
  return useQuery<Secret[]>({
    queryKey: ['drops', 'nearby', coord?.lat, coord?.lng],
    queryFn: () => getNearbyDrops(coord!.lat, coord!.lng).then(ss => ss.map(apiSecretToSecret)),
    enabled: coord != null,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
