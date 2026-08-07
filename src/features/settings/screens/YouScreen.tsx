/**
 * 11 You — "hello, stranger." The anonymous passport, setting stubs, and the
 * handwritten house rules.
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';

import {
  FunKicker,
  MapTexture,
  PaperScreen,
} from '../../../design-system/components';
import {
  BookmarkIcon,
  ClockIcon,
  HumIcon,
  LayersIcon,
} from '../../../design-system/icons';
import { colors, fonts } from '../../../design-system/tokens';
import { Passport } from '../components/Passport';
import {
  getDeviceId,
  getEchoesEnabled,
  getMapStyle,
  getNotificationMode,
  setEchoesEnabled,
} from '../../../services/storage';
import { mapStyleLabel } from '../../../services/maps';
import { useDeviceInfo } from '../hooks';

const RULES = [
  'No usernames, no profiles.',
  'No photos. Just words.',
  'One device. One trail.',
  'Cruelty gets erased.',
];

export function YouScreen() {
  const insets = useSafeAreaInsets();
  const { data: deviceInfo } = useDeviceInfo();
  const deviceId = getDeviceId().slice(0, 8).toUpperCase();
  // Re-read persisted settings whenever this tab regains focus, so a style
  // change made on the Map tab shows here without a remount.
  useIsFocused();

  // Anniversary echoes — the one setting on this screen that does something,
  // because the feature it gates is off until someone asks for it. Held in
  // state as well as MMKV so the row flips under the finger.
  const [echoes, setEchoes] = useState(getEchoesEnabled);
  const toggleEchoes = () => {
    const next = !echoes;
    setEchoesEnabled(next);
    setEchoes(next);
  };

  const settings = [
    {
      icon: <LayersIcon size={22} color={colors.accentDeep} />,
      label: 'Map style',
      value: mapStyleLabel(getMapStyle()),
    },
    { icon: <ClockIcon size={22} />, label: 'Unlock radius', value: '50 m' },
    {
      icon: <HumIcon size={22} />,
      label: 'Walk-by notifications',
      value: getNotificationMode() === 'hum' ? 'Quiet hum' : 'Off',
    },
  ];
  return (
    <PaperScreen>
      <MapTexture blur />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <FunKicker centered style={styles.kicker}>
          hello, stranger.
        </FunKicker>

        <Passport
          deviceId={deviceId}
          quotaRemaining={deviceInfo?.dropsQuotaRemaining}
        />

        <View style={styles.setList}>
          {settings.map(s => (
            <View key={s.label} style={styles.setRow}>
              <View style={styles.setIco}>{s.icon}</View>
              <Text style={styles.setLbl}>{s.label}</Text>
              <Text style={styles.setVal}>{s.value}</Text>
            </View>
          ))}

          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: echoes }}
            accessibilityLabel="Anniversary echoes"
            onPress={toggleEchoes}
            style={({ pressed }) => [styles.setRow, pressed && styles.pressed]}
          >
            <View style={styles.setIco}>
              <BookmarkIcon
                size={22}
                color={echoes ? colors.accentDeep : colors.inkSoft}
              />
            </View>
            <View style={styles.setLblBlock}>
              <Text style={styles.setLbl}>Anniversary echoes</Text>
              {/*
                Said plainly before it's turned on, not after: this app is
                where people leave the things they don't say, and being told
                about one of them a year later should be a choice made with
                open eyes.
              */}
              <Text style={styles.setNote}>
                Quietly tells you when you pass somewhere you stood a year ago.
              </Text>
            </View>
            <Text style={[styles.setVal, !echoes && styles.setValOff]}>
              {echoes ? 'On' : 'Off'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.rulesBlock}>
          <Text style={styles.rulesKick}>house rules — handwritten</Text>
          <View style={styles.rules}>
            {RULES.map((rule, i) => (
              <View
                key={rule}
                style={[
                  styles.rule,
                  {
                    transform: [{ rotate: i % 2 === 0 ? '-0.6deg' : '0.5deg' }],
                  },
                ]}
              >
                <Text style={styles.star}>✦</Text>
                <Text style={styles.ruleText}>{rule}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.rulesSign}>
            — kept by everyone who walks here
          </Text>
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
  setLblBlock: { flex: 1 },
  setNote: {
    fontFamily: fonts.sans,
    fontSize: 11.5,
    lineHeight: 11.5 * 1.4,
    color: colors.inkSoft,
    marginTop: 2,
    paddingRight: 8,
  },
  setVal: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 11 * 0.04,
    color: colors.accentDeep,
  },
  setValOff: { color: colors.inkFaint },
  pressed: { opacity: 0.85 },
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
