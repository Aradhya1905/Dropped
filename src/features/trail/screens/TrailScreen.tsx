/**
 * 10 Your trail — the collected scrapbook: torn-receipt stats,
 * found/saved/dropped tabs, and the feed of secrets you've stood inside.
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FunKicker, MapTexture, PaperScreen } from '../../../design-system/components';
import { colors, fonts } from '../../../design-system/tokens';
import { Receipt } from '../components/Receipt';
import { TrailCard } from '../components/TrailCard';

const TABS = [
  { key: 'found', label: 'Found', count: 9 },
  { key: 'saved', label: 'Saved', count: 4 },
  { key: 'dropped', label: 'Dropped', count: 2 },
] as const;

export function TrailScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('found');

  return (
    <PaperScreen>
      <MapTexture dense blur />
      <View style={[styles.view, { paddingTop: insets.top + 16 }]}>
        <View style={styles.head}>
          <FunKicker>look how far you've wandered.</FunKicker>
          <Text style={styles.title}>
            You've walked through <Text style={styles.titleEm}>4 secrets</Text>
            {'\n'}this month.
          </Text>
        </View>

        <Receipt
          cells={[
            { value: '24,108', label: 'steps' },
            { value: '3', label: 'cities' },
            { value: '12', unit: 'd', label: 'streak' },
            { value: '2', label: 'dropped' },
          ]}
        />

        <View style={styles.tabs}>
          {TABS.map(t => {
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
          <TrailCard
            rotate={-1}
            fastener="tape"
            place="Caffè Eleven"
            mood="ache"
            quote={'"I told her I loved her here in 2019. She said no. I still walk past on purpose."'}
            footLeft="Bedford Ave & N 7th"
            footRight="unlocked · 4y ago"
          />
          <TrailCard
            rotate={0.8}
            fastener="pin"
            place="Sterling Tower"
            mood="joy"
            quote={'"I quit my job from the corner desk on the 8th floor. Walked out and bought a cassoulet."'}
            footLeft="8th floor, NE corner"
            footRight="unlocked · 11mo ago"
          />
          <TrailCard
            rotate={-0.6}
            fastener="tapeRight"
            place="South path, by the elm"
            mood="ache"
            quote={'"I scattered my mother here. She would have hated that I picked a Tuesday."'}
            footLeft="Prospect Park"
            footRight="unlocked · 2y ago"
          />
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
});
