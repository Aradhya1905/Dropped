import { useQuery } from '@tanstack/react-query';

import type { Secret } from '../../../types';
import { apiSecretToSecret } from '../../../services/api/mappers';
import { getTrailDropped } from '../api';

export function useTrailDropped() {
  return useQuery<{ secrets: Secret[]; total: number }>({
    queryKey: ['trail', 'dropped'],
    queryFn: () =>
      getTrailDropped().then(res => ({
        secrets: res.secrets.map(apiSecretToSecret),
        total: res.total,
      })),
  });
}
