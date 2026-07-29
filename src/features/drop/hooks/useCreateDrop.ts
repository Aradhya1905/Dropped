import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Coordinate, Mood, Secret } from '../../../types';
import type { ApiError } from '../../../services/api';
import { apiSecretToSecret } from '../../../services/api/mappers';
import { useDropsStore } from '../../../store/dropsStore';
import { postDrop } from '../api';

interface CreateDropParams {
  body: string;
  mood: Mood;
  coordinate: Coordinate;
  placeLabel?: string;
  city?: string;
}

export function useCreateDrop() {
  const upsert = useDropsStore(s => s.upsertDrop);
  const queryClient = useQueryClient();

  const mutation = useMutation<Secret, ApiError, CreateDropParams>({
    mutationFn: params =>
      postDrop(params.body, params.mood, params.coordinate, params.placeLabel, params.city).then(apiSecretToSecret),
    onSuccess: secret => {
      upsert(secret);
      queryClient.invalidateQueries({ queryKey: ['trail'] });
      // The new drop must show up on the map right away — without this the
      // nearby query keeps serving its cached (30 s staleTime) list and the
      // pin only appears after an app restart.
      queryClient.invalidateQueries({ queryKey: ['drops', 'nearby'] });
    },
  });

  return {
    create: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
