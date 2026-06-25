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
    },
  });

  return {
    create: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
