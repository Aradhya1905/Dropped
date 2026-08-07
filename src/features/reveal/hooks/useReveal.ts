import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useDropsStore } from '../../../store/dropsStore';
import { apiSecretToSecret } from '../../../services/api/mappers';
import { trigger as haptic } from '../../../services/haptics';
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
      // The warmth pulses stop at the 50 m line; this is the payoff. Fired on
      // server confirmation, never on client optimism — a spoofed position must
      // not get the winning feel before the server rejects the reveal.
      haptic('snap');
      upsert(secret);
      queryClient.invalidateQueries({ queryKey: ['trail'] });
      // Keep the map pins in sync with the new revealed state.
      queryClient.invalidateQueries({ queryKey: ['drops', 'nearby'] });
    },
  });

  return {
    reveal: mutation.mutateAsync,
    coord,
    isPending: mutation.isPending,
  };
}
