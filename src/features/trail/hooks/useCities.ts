import { useQuery } from '@tanstack/react-query';

import type { ApiDeviceCity } from '../../../services/api';
import { getCities } from '../api';

/**
 * Every city this device has found or left something in, newest activity
 * first — the index the constellation picker is built from.
 *
 * Cheap and slow-moving (a new city is a trip, not a tap), so it is cached
 * generously; the Trail tab's focus effect invalidates the whole `['trail']`
 * key anyway when something changed.
 */
export function useCities() {
  return useQuery<ApiDeviceCity[]>({
    queryKey: ['trail', 'cities'],
    queryFn: getCities,
    staleTime: 60_000,
  });
}
