import { useMutation } from '@tanstack/react-query';

import { useDropsStore } from '../../../store/dropsStore';
import { apiSecretToSecret } from '../../../services/api/mappers';
import { useDeviceLocation } from '../../map/hooks';
import { postReveal } from '../api';

export function useReveal() {
  const upsert = useDropsStore(s => s.upsertDrop);
  const { coord } = useDeviceLocation();

  const mutation = useMutation({
    mutationFn: ({ id }: { id: string }) => {
      if (!coord) return Promise.reject(new Error('No location'));
      return postReveal(id, coord).then(apiSecretToSecret);
    },
    onSuccess: secret => upsert(secret),
  });

  return {
    reveal: mutation.mutateAsync,
    coord,
    isPending: mutation.isPending,
  };
}
