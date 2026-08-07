/**
 * useReplies — the replies pinned under a secret.
 *
 * The server 403s both reads and writes unless it has a reveal on record for
 * this device, so an error here is not "something broke" — it's usually "you
 * haven't stood there". `gated` separates those two so the screen can say the
 * right thing, and no retry is attempted on a 403 (walking is the only fix).
 */
import { useQuery } from '@tanstack/react-query';

import type { ApiError } from '../../../services/api';
import type { Reply } from '../../../types';
import { getReplies } from '../api';

export interface UseRepliesResult {
  replies: Reply[];
  total: number;
  isLoading: boolean;
  /** 403 — this device has no reveal for the drop. Not a failure to retry. */
  gated: boolean;
  /** A real failure (network, 5xx). Distinct from `gated`. */
  error: ApiError | null;
  refetch: () => void;
}

export function useReplies(id: string, enabled = true): UseRepliesResult {
  const query = useQuery({
    queryKey: ['drops', id, 'replies'],
    queryFn: () => getReplies(id),
    enabled: enabled && Boolean(id),
    retry: (failureCount, error) => {
      // The axios layer rejects with ApiError, but react-query types the
      // callback's error as Error — go through unknown rather than widen it.
      const status = (error as unknown as ApiError)?.status;
      // Walking is the only fix for a 403, and a 404 won't heal either.
      if (status === 403 || status === 404) return false;
      return failureCount < 2;
    },
  });

  const err = (query.error ?? null) as ApiError | null;
  const gated = err?.status === 403;

  return {
    replies: query.data?.replies ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isPending && enabled,
    gated,
    error: gated ? null : err,
    refetch: () => {
      query.refetch();
    },
  };
}
