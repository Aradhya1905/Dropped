/**
 * 10 Your trail — the collected scrapbook: torn-receipt stats,
 * found/saved/dropped tabs, and the feed of secrets you've stood inside.
 */
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FunKicker, MapTexture, PaperScreen } from '../../../design-system/components';
import { colors, fonts } from '../../../design-system/tokens';
import { Receipt } from '../components/Receipt';
import { TrailCard } from '../components/TrailCard';
import { useTrailFound, useTrailSaved, useTrailDropped, useTrailStats, useSteps } from '../hooks';
import { relativeTime } from '../../../utils/format';
import { tap } from '../../../services/haptics';
import type { Secret } from '../../../types';

const FASTENERS = ['tape', 'pin', 'tapeRight'] as const;
const ROTATIONS = [-1, 0.8, -0.6];

const PAGE = 20;

/** Each tab earns its own empty line — "Nothing here yet" three times reads like a bug. */
const EMPTY_COPY = {
  found: 'No secrets found yet.\nWalk within 50 m of a pin to open one.',
  saved: 'Nothing saved yet.\nSave a secret and it waits for you here.',
  dropped: 'No drops of your own yet.\nTap the seal on the map to leave one.',
} as const;

export function TrailScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'found' | 'saved' | 'dropped'>('found');
  // How much of each feed we've asked for; grows as the user scrolls.
  const [limits, setLimits] = useState({ found: PAGE, saved: PAGE, dropped: PAGE });

  const found = useTrailFound(limits.found);
  const saved = useTrailSaved(limits.saved);
  const dropped = useTrailDropped(limits.dropped);
  const stats = useTrailStats();
  const { steps } = useSteps();

  const tabs = [
    { key: 'found' as const, label: 'Found', count: found.data?.total ?? 0 },
    { key: 'saved' as const, label: 'Saved', count: saved.data?.total ?? 0 },
    { key: 'dropped' as const, label: 'Dropped', count: dropped.data?.total ?? 0 },
  ];

  const activeQuery = tab === 'found' ? found : tab === 'saved' ? saved : dropped;
  const activeSecrets: Secret[] = activeQuery.data?.secrets ?? [];
  const isLoading = activeQuery.isLoading;
  const total = activeQuery.data?.total ?? 0;
  const hasMore = activeSecrets.length < total;

  const refreshAll = useCallback(() => {
    found.refetch();
    saved.refetch();
    dropped.refetch();
    stats.refetch();
  }, [found, saved, dropped, stats]);

  /** Pull the next page in once the feed is nearly scrolled out. */
  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!hasMore || activeQuery.isFetching) return;
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
      const remaining = contentSize.height - (contentOffset.y + layoutMeasurement.height);
      if (remaining < 240) {
        setLimits(prev => ({ ...prev, [tab]: prev[tab] + PAGE }));
      }
    },
    [hasMore, activeQuery.isFetching, tab],
  );

  // The heading is explicitly "this month" — use the month-scoped found count.
  const foundCount = stats.data?.foundThisMonth ?? 0;

  return (
    <PaperScreen>
      <MapTexture dense blur />
      <View style={[styles.view, { paddingTop: insets.top + 16 }]}>
        <View style={styles.head}>
          <FunKicker>look how far you've wandered.</FunKicker>
          <Text style={styles.title}>
            You've walked through{' '}
            <Text style={styles.titleEm}>{foundCount} secret{foundCount === 1 ? '' : 's'}</Text>
            {'\n'}this month.
          </Text>
        </View>

        <Receipt
          cells={[
            { value: (steps ?? 0).toLocaleString(), label: 'steps' },
            { value: String(stats.data?.citiesVisited ?? 0), label: 'cities' },
            { value: String(stats.data?.streakDays ?? 0), unit: 'd', label: 'streak' },
            { value: String(stats.data?.droppedTotal ?? dropped.data?.total ?? 0), label: 'dropped' },
          ]}
        />

        <View style={styles.tabs}>
          {tabs.map(t => {
            const on = t.key === tab;
            return (
              <Pressable
                key={t.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${t.label} · ${t.count}`}
                onPress={() => {
                  if (!on) tap();
                  setTab(t.key);
                }}
                style={[styles.tab, on && styles.tabOn]}
              >
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{t.label}</Text>
                <Text style={[styles.tabCount, on && styles.tabCountOn]}>{t.count}</Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView
          style={styles.feed}
          contentContainerStyle={styles.feedContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={200}
          refreshControl={
            <RefreshControl
              refreshing={activeQuery.isRefetching}
              onRefresh={refreshAll}
              colors={[colors.accent]}
              tintColor={colors.accent}
            />
          }
        >
          {isLoading ? (
            <ActivityIndicator color={colors.accent} style={styles.loader} />
          ) : activeQuery.isError ? (
            <Text
              accessibilityRole="button"
              style={styles.empty}
              onPress={() => activeQuery.refetch()}
            >
              Couldn&apos;t load your trail.{'\n'}Tap to try again.
            </Text>
          ) : activeSecrets.length === 0 ? (
            <Text style={styles.empty}>{EMPTY_COPY[tab]}</Text>
          ) : (
            <>
              {activeSecrets.map((s, i) => (
                <TrailCard
                  key={s.id}
                  rotate={ROTATIONS[i % ROTATIONS.length]}
                  fastener={FASTENERS[i % FASTENERS.length]}
                  place={s.drop.placeLabel ?? 'Here'}
                  mood={s.mood}
                  quote={`"${s.body ?? ''}"`}
                  footLeft={s.drop.placeLabel ?? ''}
                  footRight={`unlocked · ${relativeTime(s.createdAt)}`}
                />
              ))}
              {hasMore ? (
                <ActivityIndicator color={colors.accent} style={styles.loader} />
              ) : null}
            </>
          )}
        </ScrollView>
      </View>
    </PaperScreen>
  );
}

const styles = StyleSheet.create({
  view: { flex: 1, paddingHorizontal: 22, zIndex: 10 },
  head: { paddingHorizontal: 4 },
  title: {
    fontFamily: fonts.serif,
    fontSize: 28,
    lineHeight: 28 * 1.12,
    letterSpacing: 28 * -0.015,
    color: colors.ink,
    marginTop: 5,
  },
  titleEm: { fontFamily: fonts.serifItalic, color: colors.accentDeep },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 20, marginHorizontal: 2 },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tabOn: { borderWidth: 1.5, borderColor: colors.accent, backgroundColor: colors.accentTint },
  tabText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 10 * 0.13,
    textTransform: 'uppercase',
    color: colors.inkSoft,
  },
  tabTextOn: { color: colors.accentDeep },
  tabCount: { fontFamily: fonts.serif, fontSize: 13, color: colors.inkFaint },
  tabCountOn: { color: colors.accentDeep },
  feed: { flex: 1, marginTop: 16 },
  feedContent: { paddingTop: 6, paddingHorizontal: 2, paddingBottom: 24, gap: 15 },
  loader: { marginTop: 40 },
  empty: {
    fontFamily: fonts.handSemibold,
    fontSize: 18,
    lineHeight: 18 * 1.3,
    color: colors.inkFaint,
    textAlign: 'center',
    marginTop: 40,
  },
});
