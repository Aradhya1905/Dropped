/**
 * 03 Location — "Stand here. That's the trick." Radius diagram, the privacy
 * note, the anonymous wax stamp, and the location permission CTA.
 */
import React, { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../../app/navigation/types';
import {
  AppButton,
  FadeUp,
  FunKicker,
  FunTitle,
  MapTexture,
  PaperScreen,
  Postmark,
  WaxSeal,
} from '../../../design-system/components';
import { AnonLockIcon } from '../../../design-system/icons';
import { colors, fonts } from '../../../design-system/tokens';
import { getCurrent, requestPermission } from '../../../services/location';
import { LocationPermissionSheet } from '../../map/components';
import { RadiusStage } from '../components/RadiusStage';

type Props = NativeStackScreenProps<RootStackParamList, 'Location'>;

export function LocationScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const enterApp = () => navigation.replace('Main');

  const [busy, setBusy] = useState(false);
  // Sheet only surfaces when the OS will no longer prompt (Settings needed).
  const [blockedSheet, setBlockedSheet] = useState(false);

  /** "Allow while using the app" → real OS request, then into the app. */
  const allow = async () => {
    setBusy(true);
    try {
      const status = await requestPermission();
      if (status === 'granted') {
        // Warm the GPS so the map has a fix waiting; don't block on it.
        getCurrent().catch(() => {});
        enterApp();
      } else if (status === 'blocked') {
        setBlockedSheet(true);
      }
      // 'denied': stay on the screen so they can retry or pick "Not now".
    } catch {
      enterApp();
    } finally {
      setBusy(false);
    }
  };

  return (
    <PaperScreen>
      <MapTexture />
      <Postmark style={[styles.postmark, { top: insets.top + 16 }]} />

      <View
        style={[styles.view, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 26 }]}
      >
        <FadeUp delay={100} style={styles.funhead}>
          <FunKicker centered>one quick thing —</FunKicker>
          <FunTitle centered>Stand here. That's the trick.</FunTitle>
        </FadeUp>

        <FadeUp delay={300}>
          <RadiusStage />
        </FadeUp>

        <FadeUp delay={400}>
          <Text style={styles.body}>
            We only peek at where you're standing — just enough to break the seals near you. It
            never leaves your device.
          </Text>
        </FadeUp>

        <FadeUp delay={500}>
          <View style={styles.anonSeal}>
            <WaxSeal size={46} rotate={-7}>
              <AnonLockIcon size={22} />
            </WaxSeal>
            <View>
              <Text style={styles.anonTitle}>Anonymous by design.</Text>
              <Text style={styles.anonSub}>One device · no name · no profile</Text>
            </View>
          </View>
        </FadeUp>

        <FadeUp delay={600} style={styles.actions}>
          <AppButton
            label={busy ? 'Asking…' : 'Allow while using the app'}
            dot
            onPress={busy ? undefined : allow}
          />
          <AppButton label="Not now" variant="ghost" onPress={enterApp} />
        </FadeUp>
      </View>

      <LocationPermissionSheet
        visible={blockedSheet}
        blocked
        onEnable={() => {
          setBlockedSheet(false);
          Linking.openSettings().catch(() => {});
        }}
        onClose={() => {
          setBlockedSheet(false);
          enterApp();
        }}
      />
    </PaperScreen>
  );
}

const styles = StyleSheet.create({
  postmark: { position: 'absolute', right: 22, zIndex: 11 },
  view: { flex: 1, paddingHorizontal: 26, zIndex: 12 },
  funhead: { alignItems: 'center' },
  body: {
    fontFamily: fonts.sans,
    fontSize: 13.5,
    lineHeight: 13.5 * 1.56,
    color: colors.inkSoft,
    maxWidth: 280,
    alignSelf: 'center',
    textAlign: 'center',
    marginTop: 18,
  },
  anonSeal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
  },
  anonTitle: { fontFamily: fonts.serifItalic, fontSize: 16, color: colors.ink },
  anonSub: {
    fontFamily: fonts.mono,
    fontSize: 8.5,
    letterSpacing: 8.5 * 0.16,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  actions: { marginTop: 'auto', paddingTop: 22, gap: 4 },
});
