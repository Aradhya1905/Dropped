/**
 * 10 Your trail — the collected scrapbook: torn-receipt stats,
 * found/saved/dropped tabs, and the feed of secrets you've stood inside.
 */
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';

import type { RootStackParamList } from '../../../app/navigation/types';
import { FunKicker, MapTexture, PaperScreen } from '../../../design-system/components';
import { colors, fonts } from '../../../design-system/tokens';
import { EchoCard, useEchoes } from '../../echo';
import { useDeviceLocation } from '../../../services/location/LocationContext';
import { useDropsStore } from '../../../store/dropsStore';
import { FogHeader } from '../components/FogHeader';
import { Receipt } from '../components/Receipt';
import { TrailCard } from '../components/TrailCard';
import { useTrailFound, useTrailSaved, useTrailDropped, useTrailStats, useSteps } from '../hooks';
import { fadesInLabel, isExpired } from '../../../utils/expiry';
import { relTime } from '../../../utils/format';
import type { Secret } from '../../../types';

const FASTENERS = ['tape', 'pin', 'tapeRight'] as const;
const ROTATIONS = [-1, 0.8, -0.6];

export function TrailScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [tab, setTab] = useState<'found' | 'saved' | 'dropped'>('found');

  // The scrapbook is where a memory belongs, so this is the other half of the
  // Map's echo card — same hook, same once-a-day-per-250 m discipline, same
  // silence when the user hasn't opted in.
  const { coord } = useDeviceLocation();
  const { echoes, mute: muteEcho } = useEchoes(coord);
  const knownDrops = useDropsStore(s => s.drops);

  /**
   * Open what an echo is about: straight to the secret when this device has
   * already revealed it (its body is in the store), otherwise to the sealed
   * screen — an anniversary is never a shortcut past the 50 m walk.
   */
  const openEcho = (secretId: string) => {
    const known = knownDrops.find(d => d.id === secretId);
    navigation.navigate(known?.body ? 'Secret' : 'SecretDetail', { secretId });
  };

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['trail'] });
    }, [queryClient]),
  );

  const found = useTrailFound();
  const saved = useTrailSaved();
  const dropped = useTrailDropped();
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

        <FogHeader />

        {/*
          Above the tabs, below the fog: these are places, not entries — they
          belong with the map of where you've been rather than inside a list of
          what you collected. Capped at two so the scrapbook never turns into a
          wall of anniversaries.
        */}
        {echoes.length > 0 && (
          <View style={styles.echoes}>
            {echoes.slice(0, 2).map(echo => (
              <EchoCard
                key={echo.secretId}
                echo={echo}
                onPress={() => openEcho(echo.secretId)}
                onMute={() => muteEcho(echo.secretId)}
              />
            ))}
          </View>
        )}

        <View style={styles.tabs}>
          {tabs.map(t => {
            const on = t.key === tab;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
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
        >
          {isLoading ? (
            <ActivityIndicator color={colors.accent} style={styles.loader} />
          ) : activeSecrets.length === 0 ? (
            <Text style={styles.empty}>Nothing here yet.</Text>
          ) : (
            activeSecrets.map((s, i) => {
              // The server keeps expired drops in these lists on purpose: your
              // own drops stay in your history, and a drop you saved stays
              // yours. Show them aged rather than dropping them from the feed.
              const expired = isExpired(s.expiresAt);
              const fades = fadesInLabel(s.expiresAt);
              return (
                <TrailCard
                  key={s.id}
                  rotate={ROTATIONS[i % ROTATIONS.length]}
                  fastener={FASTENERS[i % FASTENERS.length]}
                  place={s.drop.placeLabel ?? 'Here'}
                  mood={s.mood}
                  quote={`"${s.body ?? ''}"`}
                  faded={expired}
                  footLeft={s.drop.placeLabel ?? ''}
                  footRight={
                    fades != null
                      ? `${fades} · ${relTime(s.createdAt)}`
                      : `unlocked · ${relTime(s.createdAt)}`
                  }
                />
              );
            })
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
  echoes: { marginTop: 14, marginHorizontal: 2, gap: 10 },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 14, marginHorizontal: 2 },
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
    color: colors.inkFaint,
    textAlign: 'center',
    marginTop: 40,
  },
});
