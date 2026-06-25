import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useDropsStore } from '../../../store/dropsStore';
import { apiSecretToSecret } from '../../../services/api/mappers';
import { useDeviceLocation } from '../../map/hooks';
import { postReveal } from '../api';

// Bengaluru city center — lets the tap work in dev without real GPS.
const DEV_COORD = __DEV__ ? { lat: 12.9716, lng: 77.5946 } : null;

export function useReveal() {
  const upsert = useDropsStore(s => s.upsertDrop);
  const { coord: liveCoord } = useDeviceLocation();
  const queryClient = useQueryClient();

  // In dev, fall back to a fake coord so the button is never permanently disabled.
  const coord = liveCoord ?? DEV_COORD;

  const mutation = useMutation({
    mutationFn: ({ id }: { id: string }) => {
      if (!coord) return Promise.reject(new Error('No location'));
      return postReveal(id, coord).then(apiSecretToSecret);
    },
    onSuccess: secret => {
      upsert(secret);
      queryClient.invalidateQueries({ queryKey: ['trail'] });
    },
  });

  return {
    reveal: mutation.mutateAsync,
    coord,
    isPending: mutation.isPending,
  };
}
