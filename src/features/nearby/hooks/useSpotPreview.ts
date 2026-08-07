/**
 * useSpotPreview — metadata for a drop the app has never seen nearby.
 *
 * Someone who opens a shared link is, by definition, usually nowhere near the
 * drop, so it is not in the nearby results and not in `dropsStore`. This is the
 * only way that screen can say anything at all about the place. Skipped
 * entirely when the drop *is* already in the store, so the normal walk-up flow
 * costs no extra request.
 *
 * `gone` (404) is a real product state, not a failure: hidden, moderated, and
 * expired drops all answer the same way, and the screen should say "this isn't
 * here anymore" rather than showing a spinner or an error.
 */
import { useQuery } from '@tanstack/react-query';

import type { ApiError } from '../../../services/api';
import type { DropPreview } from '../../../types';
import { getDropPreview } from '../api';

export interface UseSpotPreviewResult {
  preview: DropPreview | null;
  isLoading: boolean;
  /** 404 — hidden, moderated, or faded. Indistinguishable, deliberately. */
  gone: boolean;
  /** A real failure (network, 5xx). Distinct from `gone`. */
  error: ApiError | null;
}

export function useSpotPreview(
  id: string,
  enabled = true,
): UseSpotPreviewResult {
  const query = useQuery({
    queryKey: ['drops', id, 'preview'],
    queryFn: () => getDropPreview(id),
    enabled: enabled && Boolean(id),
    // Public metadata about a fixed place — it barely changes, and the route
    // is rate-limited to 20/min, so don't refetch it on every focus.
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      // The axios layer rejects with ApiError, but react-query types the
      // callback's error as Error — go through unknown rather than widen it.
      const status = (error as unknown as ApiError)?.status;
      if (status === 404) return false;
      return failureCount < 2;
    },
  });

  const err = (query.error ?? null) as ApiError | null;
  const gone = err?.status === 404;

  return {
    preview: query.data ?? null,
    isLoading: query.isPending && enabled && Boolean(id),
    gone,
    error: gone ? null : err,
  };
}
