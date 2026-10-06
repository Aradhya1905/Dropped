import { useQuery } from '@tanstack/react-query';

import type { ChainCandidate, Coordinate } from '../../../types';
import { getChainCandidates } from '../api';

// Same ~33 m grid as useNearbyDrops: a GPS jitter shouldn't refetch the list.
const GRID_DEG = 0.0003;
const snap = (n: number) => Math.round(n / GRID_DEG);

/**
 * The composer's "which drop does this follow?" list — your own drops from the
 * last 24 h within 2 km, newest first. Only fetched while the picker is open.
 */
export function useChainCandidates(coord: Coordinate | null, enabled: boolean) {
  return useQuery<ChainCandidate[]>({
    queryKey: ['chainCandidates', coord ? snap(coord.lat) : null, coord ? snap(coord.lng) : null],
    queryFn: () => getChainCandidates(coord!),
    enabled: enabled && coord != null,
    staleTime: 30_000,
  });
}
