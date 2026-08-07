/**
 * useCreateReply — leave one line under a secret you've stood at.
 *
 * Server rules mirrored here only where the UI needs them ahead of the round
 * trip (length, one-per-drop). The gate itself is never enforced client-side:
 * the server decides, and a 403 surfaces as "walk here first".
 *
 * The one-per-device unique index means a retried request that already
 * succeeded comes back 201 with the reply the device already left. That is
 * success, not a duplicate error — the server does that collapsing, so this
 * hook has no special case for it.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ApiError } from '../../../services/api';
import { useDropsStore } from '../../../store/dropsStore';
import type { Reply } from '../../../types';
import { deleteReply, postReply } from '../api';

export function useCreateReply(id: string) {
  const queryClient = useQueryClient();
  const upsert = useDropsStore(s => s.upsertDrop);
  const secret = useDropsStore(s => s.drops.find(d => d.id === id));

  /** Keep the pin's "N voices here" honest without waiting for a refetch. */
  const bumpCount = (delta: number) => {
    if (secret) {
      upsert({
        ...secret,
        replyCount: Math.max(0, secret.replyCount + delta),
      });
    }
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['drops', id, 'replies'] });
    // So the map pin's count updates without an app restart.
    queryClient.invalidateQueries({ queryKey: ['drops', 'nearby'] });
  };

  const create = useMutation<Reply, ApiError, string>({
    mutationFn: (body: string) => postReply(id, body),
    onSuccess: () => {
      bumpCount(1);
      invalidate();
    },
  });

  const remove = useMutation<{ deleted: true }, ApiError, string>({
    mutationFn: (replyId: string) => deleteReply(id, replyId),
    onSuccess: () => {
      bumpCount(-1);
      invalidate();
    },
  });

  return {
    submit: create.mutateAsync,
    remove: remove.mutateAsync,
    isPending: create.isPending,
    isRemoving: remove.isPending,
    /** Server message on refusal (moderation 422, quota 429, gate 403). */
    error: (create.error ?? null) as ApiError | null,
    reset: create.reset,
  };
}
