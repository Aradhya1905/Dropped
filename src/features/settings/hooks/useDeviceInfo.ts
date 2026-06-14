import { useQuery } from '@tanstack/react-query';

import type { ApiDeviceInfo } from '../../../services/api';
import { getDeviceInfo } from '../api';

export function useDeviceInfo() {
  return useQuery<ApiDeviceInfo>({
    queryKey: ['device', 'me'],
    queryFn: getDeviceInfo,
    staleTime: 5 * 60 * 1000,
  });
}
