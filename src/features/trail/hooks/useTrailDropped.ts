import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { Secret } from '../../../types';
import { apiSecretToSecret } from '../../../services/api/mappers';
import { hydrateDrops } from '../../../store/dropsStore';
import { getTrailDropped } from '../api';

/** `limit` grows as the user pulls more of the feed in. */
export function useTrailDropped(limit = 20) {
  return useQuery<{ secrets: Secret[]; total: number }>({
    queryKey: ['trail', 'dropped', limit],
    queryFn: async () => {
      const res = await getTrailDropped(limit);
      const secrets = res.secrets.map(apiSecretToSecret);
      hydrateDrops(secrets);
      return { secrets, total: res.total };
    },
    // Keep the current page visible while a longer one loads.
    placeholderData: keepPreviousData,
  });
}
