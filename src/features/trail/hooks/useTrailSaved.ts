import { useQuery } from '@tanstack/react-query';

import type { Secret } from '../../../types';
import { apiSecretToSecret } from '../../../services/api/mappers';
import { getTrailSaved } from '../api';

export function useTrailSaved() {
  return useQuery<{ secrets: Secret[]; total: number }>({
    queryKey: ['trail', 'saved'],
    queryFn: () =>
      getTrailSaved().then(res => ({
        secrets: res.secrets.map(apiSecretToSecret),
        total: res.total,
      })),
  });
}
