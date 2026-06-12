/**
 * 05 Walk closer — a sealed secret too far to read: compass, distance,
 * address tag, blurred preview, and the "walk here to unlock" CTA, all on a
 * sheet over the blurred map.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../../app/navigation/types';
import {
  AppButton,
  CloseX,
  EmotionTag,
  Grabber,
  MapTexture,
  PaperScreen,
  Sheet,
} from '../../../design-system/components';
import { PinIcon, WalkIcon } from '../../../design-system/icons';
import { colors, fonts, shadows } from '../../../design-system/tokens';
import { Compass } from '../components/Compass';

type Props = NativeStackScreenProps<RootStackParamList, 'SecretDetail'>;

export function SecretDetailScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <PaperScreen>
      <MapTexture dense blur />

      <Sheet style={[styles.sheet, { top: insets.top + 64 }]}>
        <View style={[styles.inner, { paddingBottom: insets.bottom + 26 }]}>
          <Grabber style={styles.grabber} />
          <View style={styles.head}>
            <EmotionTag label="ache" />
            <CloseX onPress={() => navigation.goBack()} />
          </View>

          <Compass />

          <View style={styles.dist}>
            <Text style={styles.distBig}>
              335<Text style={styles.distUnit}>m</Text>
            </Text>
          </View>
          <Text style={styles.walkMeta}>4 min walk · heading east</Text>

          <View style={styles.addrTag}>
            <PinIcon size={20} dotColor={colors.accent} />
            <View style={styles.addrWho}>
              <Text style={styles.addrName}>Apt 3R</Text>
              <Text style={styles.addrStreet}>247 Greene Ave</Text>
            </View>
            <View style={styles.addrFound}>
              <Text style={styles.addrFoundNum}>84</Text>
              <Text style={styles.addrFoundLbl}>found</Text>
            </View>
          </View>

          <View style={styles.previewNote}>
            <Text style={styles.previewHand}>
              I've passed this door 2,000 times.{' '}
              <Text style={styles.previewBlur}>I knocked once, in 2017. He never</Text>
            </Text>
            <View style={styles.sealRow}>
              <Svg width={11} height={11} viewBox="0 0 16 16" fill="none">
                <Path d="M5 7V5a3 3 0 0 1 6 0v2M4 7h8v5H4z" stroke={colors.accentDeep} strokeWidth={1.5} />
              </Svg>
              <Text style={styles.sealRowText}>sealed · walk here to read</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <AppButton
              label="Walk here to unlock"
              iconLeft={<WalkIcon size={18} />}
              onPress={() =>
                navigation.navigate('Main', {
                  screen: 'MapTab',
                  params: { screen: 'Walk', params: { beat: 'approach' } },
                })
              }
            />
            <AppButton label="Save to come back later" variant="ghost" onPress={() => navigation.goBack()} />
          </View>
        </View>
      </Sheet>
    </PaperScreen>
  );
}

const styles = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 15 },
  inner: { flex: 1, paddingTop: 16, paddingHorizontal: 26 },
  grabber: { marginBottom: 6 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dist: { alignItems: 'center', marginTop: 6 },
  distBig: {
    fontFamily: fonts.serif,
    fontSize: 62,
    lineHeight: 64,
    letterSpacing: 62 * -0.02,
    color: colors.ink,
  },
  distUnit: { fontFamily: fonts.serifItalic, fontSize: 24, color: colors.inkSoft },
  walkMeta: {
    textAlign: 'center',
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 9.5 * 0.22,
    textTransform: 'uppercase',
    color: colors.inkFaint,
    marginTop: 6,
  },
  addrTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.paper,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 18,
  },
  addrWho: { flex: 1 },
  addrName: { fontFamily: fonts.serifItalic, fontSize: 16, color: colors.ink },
  addrStreet: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkSoft },
  addrFound: { alignItems: 'flex-end' },
  addrFoundNum: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 18, color: colors.accentDeep },
  addrFoundLbl: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 8 * 0.18,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  previewNote: {
    backgroundColor: colors.paperCard,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 15,
    marginTop: 12,
    boxShadow: shadows.note,
    transform: [{ rotate: '-0.6deg' }],
  },
  previewHand: {
    fontFamily: fonts.handMedium,
    fontSize: 19,
    lineHeight: 19 * 1.2,
    color: colors.ink,
  },
  // blurred continuation of the sealed text (see SecretNote for the trick)
  previewBlur: {
    color: 'transparent',
    opacity: 0.5,
    textShadowColor: colors.ink,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  sealRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 9 },
  sealRowText: {
    fontFamily: fonts.mono,
    fontSize: 8.5,
    letterSpacing: 8.5 * 0.2,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  actions: { marginTop: 'auto', paddingTop: 18, gap: 4 },
});
