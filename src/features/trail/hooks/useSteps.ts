import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchDeviceSteps } from '../../../services/api';
import { flushSteps } from '../../../services/pedometer';

export interface StepsResult {
  /** The steps number to show, or null while loading. */
  steps: number | null;
  loading: boolean;
}

/**
 * The Trail receipt's "steps" value. The number is owned by the backend (which
 * decides the day/month/lifetime scope); the pedometer service counts locally
 * and buffers deltas. Each time the Trail gains focus we flush the buffer, then
 * refetch — so the receipt reflects the latest walk without ever double-counting
 * (the displayed number is always the authoritative server total).
 */
export function useSteps(): StepsResult {
  const queryClient = useQueryClient();
  const query = useQuery<number>({
    queryKey: ['device', 'steps'],
    queryFn: fetchDeviceSteps,
    staleTime: 30_000,
  });

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      flushSteps().finally(() => {
        if (alive) {
          queryClient.invalidateQueries({ queryKey: ['device', 'steps'] });
        }
      });
      return () => {
        alive = false;
      };
    }, [queryClient]),
  );

  return { steps: query.data ?? null, loading: query.isLoading };
}
