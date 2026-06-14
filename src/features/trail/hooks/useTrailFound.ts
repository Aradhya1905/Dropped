import { useQuery } from '@tanstack/react-query';

import type { Secret } from '../../../types';
import { apiSecretToSecret } from '../../../services/api/mappers';
import { getTrailFound } from '../api';

export function useTrailFound() {
  return useQuery<{ secrets: Secret[]; total: number }>({
    queryKey: ['trail', 'found'],
    queryFn: () =>
      getTrailFound().then(res => ({
        secrets: res.secrets.map(apiSecretToSecret),
        total: res.total,
      })),
  });
}
