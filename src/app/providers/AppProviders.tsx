import React, { useEffect } from 'react';
import { AppState, type AppStateStatus, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { ApiError } from '../../services/api';
import { useLocationStore } from '../../store/locationStore';

/**
 * Defaults matter here: everything this app shows is tied to where the user is
 * standing *now*, so stale-but-instant beats a spinner, and a dropped
 * connection should retry rather than dead-end.
 */
const queryClient = new QueryClient({
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

/**
 * React Query's web focus detection doesn't exist on native — wire it to
 * AppState so returning to the app refreshes what's around you instead of
 * showing where you were ten minutes ago.
 */
function useAppFocusRefresh() {
  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      const active = state === 'active';
      focusManager.setFocused(active);
      if (active) {
        // A fix taken while backgrounded is usually stale — chase a new one.
        useLocationStore.getState().refresh();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  useAppFocusRefresh();

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>{children}</SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
