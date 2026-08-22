/**
 * The app-wide React Query client. Extracted from `AppProviders` so the dev-only
 * Reactotron config can share the *same* instance — its cache inspector needs the
 * real client features write to, not a separate copy.
 *
 * Defaults matter here: everything this app shows is tied to where the user is
 * standing *now*, so stale-but-instant beats a spinner, and a dropped
 * connection should retry rather than dead-end.
 */
import { QueryClient } from '@tanstack/react-query';

import type { ApiError } from '../services/api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 30 * 60_000,
      // Retry connection problems; a 4xx won't fix itself.
      retry: (failureCount, error) => {
        const code = (error as unknown as ApiError)?.code;
        return (code === 'network' || code === 'timeout') && failureCount < 2;
      },
      retryDelay: attempt => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnReconnect: true,
    },
    mutations: { retry: 0 },
  },
});
