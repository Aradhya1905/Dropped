/**
 * 10 Your trail — the collected scrapbook: torn-receipt stats,
 * found/saved/dropped tabs, and the feed of secrets you've stood inside.
 */
import React, { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';

import type { RootStackParamList } from '../../../app/navigation/types';
import {
  FunKicker,
  MapTexture,
  PaperScreen,
  QueryState,
} from '../../../design-system/components';
import { colors, fonts } from '../../../design-system/tokens';
import { EchoCard, useEchoes } from '../../echo';
import { useDeviceLocation } from '../../../services/location/LocationContext';
import { useDropsStore } from '../../../store/dropsStore';
import { ConstellationCard } from '../components/ConstellationCard';
import { FogHeader } from '../components/FogHeader';
import { Receipt } from '../components/Receipt';
import { SealGrid } from '../components/SealGrid';
import { TrailCard } from '../components/TrailCard';
import {
  TrailPostcard,
  type TrailPostcardHandle,
} from '../components/TrailPostcard';
import { shareImage } from '../../../services/share';
import { useTrailFound, useTrailSaved, useTrailDropped, useTrailStats, useSteps } from '../hooks';
import { fadesInLabel, isExpired } from '../../../utils/expiry';
import { relTime } from '../../../utils/format';
import type { Secret } from '../../../types';

const FASTENERS = ['tape', 'pin', 'tapeRight'] as const;
const ROTATIONS = [-1, 0.8, -0.6];

/** Empty says something different on each tab; "nothing yet" says nothing. */
const EMPTY_LABELS: Record<'found' | 'saved' | 'dropped', string> = {
  found: "Nothing found yet.\nThey only open when you're standing on them.",
  saved: "Nothing kept yet.\nSave one and it stays yours.",
  dropped: "You haven't left anything anywhere yet.",
};

export function TrailScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [tab, setTab] = useState<'found' | 'saved' | 'dropped'>('found');
  // Two ways to look at the same page: the pasted-in cards, or the sheet of
  // seals you pressed getting them.
  const [view, setView] = useState<'cards' | 'seals'>('cards');

  // The scrapbook is where a memory belongs, so this is the other half of the
  // Map's echo card — same hook, same once-a-day-per-250 m discipline, same
  // silence when the user hasn't opted in.
  const { coord } = useDeviceLocation();
  const { echoes, mute: muteEcho } = useEchoes(coord);
  const knownDrops = useDropsStore(s => s.drops);

  /**
   * Open a secret from anywhere on this page: straight to it when this device
   * has already revealed it (its body is in the store), otherwise to the sealed
   * screen. Neither an anniversary nor a collected seal is a shortcut past the
   * 50 m walk.
   */
  const openSecret = (secretId: string) => {
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

  const receiptCells = [
    { value: (steps ?? 0).toLocaleString(), label: 'steps' },
    { value: String(stats.data?.citiesVisited ?? 0), label: 'cities' },
    { value: String(stats.data?.streakDays ?? 0), unit: 'd', label: 'streak' },
    {
      value: String(stats.data?.droppedTotal ?? dropped.data?.total ?? 0),
      label: 'dropped',
    },
  ];

  // --- postcard export -------------------------------------------------------
  const postcard = useRef<TrailPostcardHandle>(null);
  const [sharing, setSharing] = useState(false);

  const sharePostcard = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const png = await postcard.current?.capture();
      if (!png) {
        Alert.alert(
          'Could not make the card',
          'Something went wrong drawing it. Try again in a moment.',
        );
        return;
      }
      await shareImage({
        base64Png: png,
        filename: `dropped-trail-${tab}`,
        title: 'My trail',
        // No secret body, and no count of anything anyone else wrote — the
        // sentence says as little as the card does.
        message: 'Places I walked to.',
      });
    } finally {
      setSharing(false);
    }
  };

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

        <Receipt cells={receiptCells} />

        <FogHeader />

        {/* The keepsake version of the same idea, right under the fog: one
            drawing per city, made only of places you actually stood in. */}
        <ConstellationCard />

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
                onPress={() => openSecret(echo.secretId)}
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
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${t.label}, ${t.count}`}
                style={[styles.tab, on && styles.tabOn]}
              >
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{t.label}</Text>
                <Text style={[styles.tabCount, on && styles.tabCountOn]}>{t.count}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.views}>
          {(['cards', 'seals'] as const).map(v => (
            <Pressable
              key={v}
              onPress={() => setView(v)}
              hitSlop={8}
              accessibilityRole="radio"
              accessibilityState={{ selected: v === view }}
              accessibilityLabel={`Show ${v}`}
            >
              <Text style={[styles.viewText, v === view && styles.viewTextOn]}>{v}</Text>
            </Pressable>
          ))}
        </View>

        <ScrollView
          style={styles.feed}
          contentContainerStyle={styles.feedContent}
          showsVerticalScrollIndicator={false}
        >
          <QueryState
            isLoading={isLoading}
            error={activeQuery.error}
            onRetry={activeQuery.refetch}
            // The seal grid draws its own "nothing yet" inside the sheet, so
            // only the card feed delegates the empty case here.
            isEmpty={view === 'cards' && activeSecrets.length === 0}
            emptyLabel={EMPTY_LABELS[tab]}
          >
          {view === 'seals' ? (
            <SealGrid
              secrets={activeSecrets}
              onPress={s => openSecret(s.id)}
              emptyLabel={
                tab === 'found'
                  ? 'No seals yet. They break when you walk to them.'
                  : 'Nothing here yet.'
              }
            />
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
          </QueryState>

          {activeSecrets.length > 0 && (
            <Pressable
              onPress={sharePostcard}
              disabled={sharing}
              accessibilityRole="button"
              accessibilityLabel={`Share a postcard of the places you ${tab}`}
              style={({ pressed }) => [styles.postcardBtn, pressed && styles.pressed]}
            >
              <Text style={styles.postcardText}>
                {sharing ? 'Preparing…' : 'Share these places'}
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </View>

      {/*
        Rendered off-screen rather than conditionally: `toDataURL` needs a
        mounted, laid-out SVG, so a card created only on tap would have nothing
        to capture. Zero opacity and no hit target keeps it out of the way, and
        `accessibilityElementsHidden` keeps it out of TalkBack's path.
      */}
      <View
        style={styles.offscreen}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <TrailPostcard
          ref={postcard}
          secrets={activeSecrets}
          stats={receiptCells}
          kind={tab}
        />
      </View>
    </PaperScreen>
  );
}

const styles = StyleSheet.create({
  view: { flex: 1, paddingHorizontal: 22, zIndex: 10 },
  postcardBtn: {
    alignSelf: 'center',
    marginTop: 18,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paperCard,
  },
  postcardText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 10 * 0.14,
    textTransform: 'uppercase',
    color: colors.accentDeep,
  },
  pressed: { opacity: 0.85 },
  // Off-canvas, not `display: none` — the SVG still has to lay out to be
  // captured. Far enough left that no device shows a sliver of it.
  offscreen: { position: 'absolute', left: -10000, top: 0, opacity: 0 },
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
  views: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 14,
    marginTop: 12,
    marginHorizontal: 2,
  },
  viewText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 9 * 0.16,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  viewTextOn: { color: colors.accentDeep },
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
