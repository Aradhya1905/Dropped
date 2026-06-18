import { useQuery } from '@tanstack/react-query';

import type { ApiDeviceStats } from '../../../services/api';
import { getTrailStats } from '../api';

/** Aggregate Trail stats (dropped/found/cities/streak) for this device. */
export function useTrailStats() {
  return useQuery<ApiDeviceStats>({
    queryKey: ['trail', 'stats'],
    queryFn: getTrailStats,
    staleTime: 30_000,
  });
}
