import { useMutation } from '@tanstack/react-query';

import { useDropsStore } from '../../../store/dropsStore';
import { postHeart, deleteHeart } from '../api';

export function useHeart(id: string) {
  const upsert = useDropsStore(s => s.upsertDrop);
  const secret = useDropsStore(s => s.drops.find(d => d.id === id));

  const mutation = useMutation({
    mutationFn: () => {
      if (!secret) return Promise.reject(new Error('Secret not found'));
      return secret.hearted ? deleteHeart(id) : postHeart(id);
    },
    onMutate: () => {
      if (secret) {
        upsert({
          ...secret,
          hearted: !secret.hearted,
          hearts: secret.hearted ? secret.hearts - 1 : secret.hearts + 1,
        });
      }
    },
    onSuccess: res => {
      if (secret) upsert({ ...secret, hearted: res.hearted, hearts: res.hearts });
    },
    onError: () => {
      if (secret) upsert({ ...secret, hearted: secret.hearted, hearts: secret.hearts });
    },
  });

  return {
    hearted: secret?.hearted ?? false,
    hearts: secret?.hearts ?? 0,
    toggle: () => mutation.mutate(),
    isPending: mutation.isPending,
  };
}
