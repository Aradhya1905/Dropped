/**
 * 01 Welcome — "wall of secrets". Floating handwritten notes (some sealed in
 * wax) over the living map, with the wordmark hero anchored at the bottom.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../../app/navigation/types';
import {
  AppButton,
  FadeUp,
  FunKicker,
  HandUnderline,
  MapTexture,
  MetaFoot,
  PaperScreen,
  Postmark,
  WaxSeal,
} from '../../../design-system/components';
import { ArrowRightIcon, SealPinIcon } from '../../../design-system/icons';
import { colors, fonts } from '../../../design-system/tokens';
import { SecretNote } from '../components/SecretNote';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <PaperScreen>
      <MapTexture />
      <Postmark style={[styles.postmark, { top: insets.top + 16 }]} />

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <SecretNote
          text="I still come here to feel less alone."
          tag="Park Square · open"
          rotate={-5}
          deltaY={-10}
          duration={7500}
          style={{ top: insets.top + 50, left: 18 }}
        />
        <SecretNote
          text="What happened here, I've never said —"
          tag="Riverside · sealed"
          sealed
          rotate={4}
          deltaY={9}
          duration={9000}
          style={{ top: insets.top + 96, right: 14 }}
        />
        <SecretNote
          text="Proposed right here. Then I —"
          tag="The Heights · sealed"
          sealed
          rotate={3}
          deltaY={9}
          duration={8200}
          style={{ top: insets.top + 214, left: 30 }}
        />
        <SecretNote
          text="I forgave you. Never told you."
          tag="South Docks · open"
          rotate={-4}
          deltaY={-10}
          duration={10000}
          style={{ top: insets.top + 252, right: 22 }}
        />
      </View>

      <View style={[styles.view, { paddingBottom: insets.bottom + 26 }]}>
        <View style={styles.hero}>
          <FadeUp delay={100}>
            <FunKicker size={23} style={styles.psst}>
              psst — the city's keeping secrets.
            </FunKicker>
          </FadeUp>
          <FadeUp delay={200}>
            <Text style={styles.bigmark}>Dropped</Text>
            <HandUnderline variant="wordmark" width={230} height={16} style={styles.underline} />
          </FadeUp>
          <FadeUp delay={400}>
            <Text style={styles.lede}>
              Thousands of confessions are pinned around you. Walk close enough and the wax breaks.
            </Text>
          </FadeUp>
          <FadeUp delay={550}>
            <View style={styles.ctaRow}>
              <AppButton
                label="Start exploring"
                style={styles.cta}
                iconRight={<ArrowRightIcon />}
                onPress={() => navigation.navigate('HowItWorks')}
              />
              <WaxSeal
                size={56}
                pulse
                onPress={() => navigation.navigate('Composer')}
                style={styles.stamp}
              >
                <SealPinIcon size={24} color="rgba(255,255,255,0.9)" dotColor="rgba(255,255,255,0.95)" />
              </WaxSeal>
            </View>
          </FadeUp>
          <FadeUp delay={650}>
            <MetaFoot align="left" style={styles.metaFoot}>
              No account · No name · Just you and a city full of secrets
            </MetaFoot>
          </FadeUp>
        </View>
      </View>
    </PaperScreen>
  );
}

const styles = StyleSheet.create({
  postmark: { position: 'absolute', right: 22, zIndex: 11 },
  view: { flex: 1, paddingHorizontal: 24, zIndex: 12 },
  hero: { marginTop: 'auto' },
  psst: { marginBottom: 12, maxWidth: 250 },
  bigmark: {
    fontFamily: fonts.serifMedium,
    fontSize: 68,
    lineHeight: 68 * 0.92 + 5, // .92 in CSS; small pad so Newsreader ascenders don't clip

    letterSpacing: 68 * -0.02,
    color: colors.ink,
  },
  underline: { marginTop: -2, marginLeft: 2 },
  lede: {
    fontFamily: fonts.serifLightItalic,
    fontSize: 18,
    lineHeight: 18 * 1.44,
    color: colors.inkSoft,
    marginTop: 18,
    marginBottom: 24,
    maxWidth: 286,
  },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cta: { flex: 1, width: 'auto' },
  stamp: { flexShrink: 0 },
  metaFoot: { marginTop: 14 },
});
