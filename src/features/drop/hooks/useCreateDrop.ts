import { useMutation, useQueryClient } from '@tanstack/react-query';

import type {
  Coordinate,
  ExpiresInDays,
  Mood,
  RevealCondition,
  Secret,
} from '../../../types';
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
  /** 7 or 30. Omitted = forever, the composer's default. */
  expiresInDays?: ExpiresInDays;
  /** Author's opt-out from share links. Omitted = shareable, the default. */
  shareable?: boolean;
  /**
   * One time gate on top of the 50 m rule. Omitted = any time, the composer's
   * default. Single-valued by design — one condition per drop.
   */
  revealCondition?: RevealCondition;
}

export function useCreateDrop() {
  const upsert = useDropsStore(s => s.upsertDrop);
  const queryClient = useQueryClient();

  const mutation = useMutation<Secret, ApiError, CreateDropParams>({
    mutationFn: params =>
      postDrop(
        params.body,
        params.mood,
        params.coordinate,
        params.placeLabel,
        params.city,
        params.expiresInDays,
        params.shareable,
        params.revealCondition,
      ).then(apiSecretToSecret),
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
