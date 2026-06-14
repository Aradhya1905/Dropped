import { useMutation } from '@tanstack/react-query';

import { useDropsStore } from '../../../store/dropsStore';
import { postSave, deleteSave } from '../api';

export function useSave(id: string) {
  const upsert = useDropsStore(s => s.upsertDrop);
  const secret = useDropsStore(s => s.drops.find(d => d.id === id));

  const mutation = useMutation({
    mutationFn: () => {
      if (!secret) return Promise.reject(new Error('Secret not found'));
      return secret.saved ? deleteSave(id) : postSave(id);
    },
    onMutate: () => {
      if (secret) upsert({ ...secret, saved: !secret.saved });
    },
    onSuccess: res => {
      if (secret) upsert({ ...secret, saved: res.saved });
    },
    onError: () => {
      if (secret) upsert({ ...secret, saved: secret.saved });
    },
  });

  return {
    saved: secret?.saved ?? false,
    toggle: () => mutation.mutate(),
    isPending: mutation.isPending,
  };
}
