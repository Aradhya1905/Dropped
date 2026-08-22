import React, { useEffect } from 'react';
import { AppState, type AppStateStatus, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { focusManager, QueryClientProvider } from '@tanstack/react-query';

import { useLocationStore } from '../../store/locationStore';
import { queryClient } from '../queryClient';

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
