/**
 * The app-wide React Query client. Extracted from `AppProviders` so the dev-only
 * Reactotron config can share the *same* instance — its cache inspector needs the
 * real client features write to, not a separate copy.
 */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient();
