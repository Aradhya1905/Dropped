import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useDropsStore } from '../../../store/dropsStore';
import { useLocationStore } from '../../../store/locationStore';
import { apiSecretToSecret } from '../../../services/api/mappers';
import { useDeviceLocation } from '../../map/hooks';
import { addSeenId } from '../../../services/storage';
import { postReveal } from '../api';

/** Thrown when we still can't place the user after trying for a fix. */
export const NO_FIX = 'no-fix';

export function useReveal() {
  const upsert = useDropsStore(s => s.upsertDrop);
  const queryClient = useQueryClient();
  const { coord } = useDeviceLocation();

  const mutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      // The tap used to be dead whenever the fix hadn't landed. Chase one
      // instead: the user is standing on the drop, they've earned the attempt.
      let position = useLocationStore.getState().coord;
      if (!position || !useLocationStore.getState().live) {
        await useLocationStore.getState().refresh();
        position = useLocationStore.getState().coord;
      }
      if (!position) throw new Error(NO_FIX);
      return postReveal(id, position).then(apiSecretToSecret);
    },
    onSuccess: secret => {
      upsert(secret);
      addSeenId(secret.id);
      // The reveal changes the map pin, the Trail feed and the stats.
      queryClient.invalidateQueries({ queryKey: ['drops'] });
      queryClient.invalidateQueries({ queryKey: ['trail'] });
    },
  });

  return {
    reveal: mutation.mutateAsync,
    coord,
    isPending: mutation.isPending,
  };
}
