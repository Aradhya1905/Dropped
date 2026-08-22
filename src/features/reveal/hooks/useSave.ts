import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useDropsStore } from '../../../store/dropsStore';
import { postSave, deleteSave } from '../api';

export function useSave(id: string) {
  const upsert = useDropsStore(s => s.upsertDrop);
  const secret = useDropsStore(s => s.drops.find(d => d.id === id));
  const queryClient = useQueryClient();

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
      queryClient.invalidateQueries({ queryKey: ['trail'] });
    },
    onError: () => {
      // Roll the optimistic flip back and say so — a silent revert reads as
      // the tap never registering.
      if (secret) upsert({ ...secret, saved: secret.saved });
      Alert.alert("Couldn't save that", 'Check your connection and try again.');
    },
  });

  return {
    saved: secret?.saved ?? false,
    toggle: () => mutation.mutate(),
    isPending: mutation.isPending,
  };
}
