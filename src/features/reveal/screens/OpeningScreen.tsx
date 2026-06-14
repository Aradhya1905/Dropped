/**
 * 06 Opening — "It cracks open." The wax seal bursts on a loop over the
 * blurred map. Tap anywhere to trigger the server reveal, then read the secret.
 */
import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../../app/navigation/types';
import {
  FunKicker,
  MapTexture,
  MetaFoot,
  PaperScreen,
} from '../../../design-system/components';
import { colors, fonts } from '../../../design-system/tokens';
import { SealBurst } from '../components/SealBurst';
import { useDropsStore } from '../../../store/dropsStore';
import { useReveal } from '../hooks';
import type { ApiError } from '../../../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Opening'>;

export function OpeningScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { secretId } = route.params;
  const secret = useDropsStore(s => s.drops.find(d => d.id === secretId));
  const { reveal, coord, isPending } = useReveal();

  const handlePress = async () => {
    if (!coord || isPending) return;
    try {
      await reveal({ id: secretId });
      navigation.replace('Secret', { secretId });
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr?.status === 403) {
        Alert.alert(
          'Too far',
          apiErr.distanceMeters != null
            ? `Get within 50 m. You're ${Math.round(apiErr.distanceMeters)} m away.`
            : 'Get within 50 m to reveal this secret.',
        );
      }
    }
  };

  return (
    <PaperScreen>
      <MapTexture dense blur />
      <Pressable
        style={[styles.view, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 30 }]}
        onPress={handlePress}
        disabled={!coord || isPending}
      >
        <FunKicker centered style={styles.kicker}>
          you made it all the way here —
        </FunKicker>

        <SealBurst />

        <Text style={[styles.title, isPending && styles.dimmed]}>It cracks open.</Text>
        <Text style={styles.meta}>{secret?.drop.placeLabel ?? ''}</Text>
        <Text style={styles.hint}>
          {isPending
            ? 'opening…'
            : 'someone left this here years ago — just for whoever got close.'}
        </Text>

        <View style={styles.foot}>
          <MetaFoot style={styles.footMeta}>Read it once · then reseal it or let it fade</MetaFoot>
        </View>
      </Pressable>
    </PaperScreen>
  );
}

const styles = StyleSheet.create({
  view: { flex: 1, paddingHorizontal: 26, alignItems: 'center', zIndex: 10 },
  kicker: { alignSelf: 'center' },
  title: {
    fontFamily: fonts.serifItalic,
    fontSize: 30,
    color: colors.ink,
    marginTop: 14,
    textAlign: 'center',
  },
  dimmed: { opacity: 0.5 },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 9 * 0.2,
    textTransform: 'uppercase',
    color: colors.inkFaint,
    marginTop: 11,
    textAlign: 'center',
  },
  hint: {
    fontFamily: fonts.handSemibold,
    fontSize: 20,
    lineHeight: 20 * 1.2,
    color: colors.accentDeep,
    marginTop: 18,
    textAlign: 'center',
    maxWidth: 300,
    transform: [{ rotate: '-1.5deg' }],
  },
  foot: { marginTop: 'auto' },
  footMeta: { marginTop: 0 },
});
