/**
 * 11 You — "hello, stranger." The anonymous passport, setting stubs, and the
 * handwritten house rules.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FunKicker, MapTexture, PaperScreen } from '../../../design-system/components';
import { ClockIcon, HumIcon, LayersIcon } from '../../../design-system/icons';
import { colors, fonts } from '../../../design-system/tokens';
import { Passport } from '../components/Passport';

const SETTINGS = [
  { icon: <LayersIcon size={22} color={colors.accentDeep} />, label: 'Map style', value: 'Night ink' },
  { icon: <ClockIcon size={22} />, label: 'Unlock radius', value: '50 m' },
  { icon: <HumIcon size={22} />, label: 'Walk-by notifications', value: 'Quiet hum' },
];

const RULES = [
  'No usernames, no profiles.',
  'No photos. Just words.',
  'One device. One trail.',
  'Cruelty gets erased.',
];

export function YouScreen() {
  const insets = useSafeAreaInsets();
  return (
    <PaperScreen>
      <MapTexture blur />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        <FunKicker centered style={styles.kicker}>
          hello, stranger.
        </FunKicker>

        <Passport />

        <View style={styles.setList}>
          {SETTINGS.map(s => (
            <View key={s.label} style={styles.setRow}>
              <View style={styles.setIco}>{s.icon}</View>
              <Text style={styles.setLbl}>{s.label}</Text>
              <Text style={styles.setVal}>{s.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.rulesBlock}>
          <Text style={styles.rulesKick}>house rules — handwritten</Text>
          <View style={styles.rules}>
            {RULES.map((rule, i) => (
              <View
                key={rule}
                style={[styles.rule, { transform: [{ rotate: i % 2 === 0 ? '-0.6deg' : '0.5deg' }] }]}
              >
                <Text style={styles.star}>✦</Text>
                <Text style={styles.ruleText}>{rule}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.rulesSign}>— kept by everyone who walks here</Text>
        </View>
      </ScrollView>
    </PaperScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, zIndex: 10 },
  content: { paddingHorizontal: 24, paddingBottom: 30 },
  kicker: { alignSelf: 'center' },
  setList: { marginTop: 20, gap: 9 },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colors.paperCard,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingVertical: 13,
    paddingHorizontal: 16,
    boxShadow: '0 10px 20px -18px rgba(43,33,20,0.45)',
  },
  setIco: { width: 22, height: 22 },
  setLbl: { flex: 1, fontFamily: fonts.serif, fontSize: 16, color: colors.ink },
  setVal: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 11 * 0.04,
    color: colors.accentDeep,
  },
  rulesBlock: { marginTop: 22, marginHorizontal: 2 },
  rulesKick: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 9 * 0.24,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  rules: { marginTop: 13, gap: 11 },
  rule: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  star: { color: colors.accent, fontSize: 15, marginTop: 2 },
  ruleText: {
    fontFamily: fonts.handSemibold,
    fontSize: 21,
    lineHeight: 21 * 1.05,
    color: colors.ink,
  },
  rulesSign: {
    fontFamily: fonts.handMedium,
    fontSize: 16,
    color: colors.inkFaint,
    marginTop: 16,
    marginBottom: 30,
    transform: [{ rotate: '-1deg' }],
  },
});
