/**
 * 09 It's here now — the freshly sealed confession settling onto the spot,
 * live rings pulsing under it, "sealed!" in the corner.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../../app/navigation/types';
import {
  AppButton,
  FloatBob,
  FunKicker,
  MapTexture,
  PaperScreen,
  Postmark,
  PulseRing,
  Tape,
  WaxSeal,
} from '../../../design-system/components';
import { SealPinIcon } from '../../../design-system/icons';
import { colors, fonts } from '../../../design-system/tokens';
import { useDropsStore } from '../../../store/dropsStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Dropped'>;

export function DroppedScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { secretId } = route.params;
  const secret = useDropsStore(s => s.drops.find(d => d.id === secretId));
  return (
    <PaperScreen>
      <MapTexture dense blur />
      <Postmark style={[styles.postmark, { top: insets.top + 16 }]} />

      <View
        style={[styles.view, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 26 }]}
      >
        <FunKicker centered style={styles.kicker}>
          and… it's out of your hands.
        </FunKicker>

        <View style={styles.stage}>
          {[0, 1300, 2600].map(delay => (
            <PulseRing
              key={delay}
              size={96}
              fromScale={0.5}
              toScale={3}
              peakOpacity={0.6}
              durationMs={4000}
              delayMs={delay}
              borderWidth={1.5}
              borderColor={colors.accent}
            />
          ))}
          <FloatBob rotate={-3} deltaRotate={-0.6} deltaY={-7} duration={9000}>
            <View style={styles.card}>
              <Tape width={56} height={18} rotate={-3} style={styles.cardTape} />
              <Text style={styles.place}>{secret?.drop.placeLabel ?? 'Here'}</Text>
              <Text style={styles.quote}>
                "{secret?.body ?? ''}"
              </Text>
              <View style={styles.dash} />
              <View style={styles.foot}>
                <Text style={styles.footLbl}>sealed · ache</Text>
                <Text style={[styles.footLbl, styles.footNow]}>now</Text>
              </View>
              <WaxSeal size={52} rotate={-8} pulse style={styles.seal}>
                <SealPinIcon size={23} />
              </WaxSeal>
            </View>
          </FloatBob>
          <Text style={styles.thunk}>sealed!</Text>
        </View>

        <Text style={styles.title}>It's here now.</Text>
        <Text style={styles.sub}>
          Anyone who walks within 50 meters can read it. Come back to see who's stood here.
        </Text>

        <View style={styles.actions}>
          <AppButton
            label="Walk away"
            variant="ghost"
            style={styles.walkAway}
            onPress={() => navigation.navigate('Main', { screen: 'MapTab' })}
          />
          <AppButton
            label="Drop another"
            iconLeft={<SealPinIcon size={18} color={colors.paperCard} dotColor={colors.paperCard} />}
            style={styles.dropAnother}
            onPress={() => navigation.replace('Composer')}
          />
        </View>
      </View>
    </PaperScreen>
  );
}

const styles = StyleSheet.create({
  postmark: { position: 'absolute', right: 22, zIndex: 11 },
  view: { flex: 1, paddingHorizontal: 26, alignItems: 'center', zIndex: 10 },
  kicker: { alignSelf: 'center' },
  stage: {
    width: 288,
    height: 248,
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: 236,
    backgroundColor: colors.paperCard,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 18,
    boxShadow: '0 26px 46px -24px rgba(43,33,20,0.5)',
  },
  cardTape: { position: 'absolute', top: -9, left: '50%', marginLeft: -28 },
  place: { fontFamily: fonts.handSemibold, fontSize: 20, lineHeight: 24, color: colors.inkSoft },
  quote: {
    fontFamily: fonts.serifItalic,
    fontSize: 16.5,
    lineHeight: 16.5 * 1.42,
    color: colors.ink,
    marginTop: 8,
  },
  dash: {
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.line,
    marginTop: 15,
    marginBottom: 11,
  },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footLbl: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 8 * 0.18,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  footNow: { color: colors.accentDeep },
  seal: { position: 'absolute', right: -14, bottom: -14 },
  thunk: {
    position: 'absolute',
    right: 2,
    top: 24,
    zIndex: 5,
    fontFamily: fonts.handSemibold,
    fontSize: 23,
    color: colors.accentDeep,
    transform: [{ rotate: '-9deg' }],
  },
  title: { fontFamily: fonts.serifItalic, fontSize: 32, color: colors.ink, marginTop: 18 },
  sub: {
    fontFamily: fonts.sans,
    fontSize: 13.5,
    lineHeight: 13.5 * 1.56,
    color: colors.inkSoft,
    maxWidth: 282,
    textAlign: 'center',
    marginTop: 12,
  },
  actions: {
    marginTop: 'auto',
    paddingTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  walkAway: { width: 'auto', paddingHorizontal: 18, height: 56 },
  dropAnother: { flex: 1, width: 'auto' },
});
