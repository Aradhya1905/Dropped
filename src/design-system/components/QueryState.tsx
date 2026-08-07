/**
 * The three things that can happen instead of content: still loading, nothing
 * to show, or the request failed.
 *
 * One component so every list answers all three, in the same voice. The failure
 * case is the one that was missing everywhere: a query that throws used to
 * render as an empty list, which tells someone standing on a street corner that
 * there are no secrets here — when the truth is that we couldn't ask. Those two
 * must never look alike in an app whose whole promise is about what is actually
 * at a place.
 */
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../tokens';

export interface QueryStateProps {
  isLoading: boolean;
  /** Anything truthy counts as failed; the message is ours, not the error's. */
  error?: unknown;
  /** True when the request succeeded and came back with nothing. */
  isEmpty?: boolean;
  /** What "nothing" means here. Written per list — "nothing yet" is not enough. */
  emptyLabel?: string;
  /** Usually the query's `refetch`. Without it the retry button is hidden. */
  onRetry?: () => void;
  /** Shown when there is something to show. */
  children?: React.ReactNode;
}

export function QueryState({
  isLoading,
  error,
  isEmpty = false,
  emptyLabel = 'Nothing here yet.',
  onRetry,
  children,
}: QueryStateProps) {
  // Loading first: a refetch after an error should show the spinner, not keep
  // the failure on screen while it retries.
  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        {/*
          No status codes, no stack — the person reading this is outdoors and
          wants to know whether to walk on. Say what happened and what to do.
        */}
        <Text style={styles.errorTitle}>Couldn't reach the world.</Text>
        <Text style={styles.errorBody}>
          Your connection dropped somewhere between here and there. Nothing is
          lost.
        </Text>
        {onRetry != null && (
          <Pressable
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel="Try again"
            hitSlop={10}
            style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        )}
      </View>
    );
  }

  if (isEmpty) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>{emptyLabel}</Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { paddingVertical: 34, paddingHorizontal: 12, alignItems: 'center' },
  empty: {
    fontFamily: fonts.handMedium,
    fontSize: 19,
    lineHeight: 19 * 1.25,
    color: colors.inkFaint,
    textAlign: 'center',
  },
  errorTitle: {
    fontFamily: fonts.handSemibold,
    fontSize: 21,
    color: colors.ink,
    textAlign: 'center',
  },
  errorBody: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 13 * 1.5,
    color: colors.inkSoft,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 280,
  },
  retry: {
    marginTop: 16,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paperCard,
  },
  pressed: { opacity: 0.8 },
  retryText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 11 * 0.12,
    textTransform: 'uppercase',
    color: colors.accentDeep,
  },
});
