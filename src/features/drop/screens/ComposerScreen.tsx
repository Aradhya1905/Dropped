/**
 * 08 Composer — "What happened here?" Pin your spot, write the confession on
 * ruled paper, pick a mood, drop it forever.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../../app/navigation/types';
import type { Secret } from '../../../types';
import {
  AppButton,
  CloseX,
  FunKicker,
  Grabber,
  MapTexture,
  PaperScreen,
  PulseRing,
  Sheet,
  WaxSeal,
} from '../../../design-system/components';
import { PinIcon, SealPinIcon } from '../../../design-system/icons';
import { colors, fonts, shadows } from '../../../design-system/tokens';
import { MoodChips } from '../components/MoodChips';
import { WriteCard } from '../components/WriteCard';
import { useDropsStore } from '../../../store/dropsStore';
import { useDeviceLocation } from '../../map/hooks';

type Props = NativeStackScreenProps<RootStackParamList, 'Composer'>;

export function ComposerScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [mood, setMood] = useState('ache');
  const [body, setBody] = useState('');
  const { coord, shortAddress } = useDeviceLocation();
  const addDrop = useDropsStore(s => s.addDrop);

  const handleDrop = () => {
    const now = Date.now();
    const newSecret: Secret = {
      id: `user-${now}`,
      body: body.trim() || '(no words, just a feeling)',
      drop: {
        id: `drop-user-${now}`,
        coordinate: coord ?? { lat: 0, lng: 0 },
        placeLabel: shortAddress ?? 'Here',
        createdAt: now,
      },
      createdAt: now,
      revealCount: 0,
    };
    addDrop(newSecret);
    navigation.replace('Dropped', { secretId: newSecret.id });
  };

  return (
    <PaperScreen>
      <MapTexture dense />

      <CloseX onPress={() => navigation.goBack()} style={[styles.close, { top: insets.top + 6 }]} />
      <View style={[styles.spotPill, { top: insets.top + 10 }]}>
        <PinIcon size={13} strokeWidth={1.6} dotColor={colors.accent} />
        <Text style={styles.spotPillText}>Dropping at this spot</Text>
      </View>
      <Text style={[styles.placeLbl, { top: insets.top + 62 }]}>
        {shortAddress?.toUpperCase() ?? 'LOCATING…'}
      </Text>
      <View style={[styles.marker, { top: insets.top + 58 }]}>
        <PulseRing
          size={24}
          fromScale={1}
          toScale={2.6}
          peakOpacity={0.6}
          durationMs={3200}
          borderWidth={1.6}
          borderColor={colors.accent}
        />
        <WaxSeal size={24} />
      </View>

      <Sheet style={[styles.sheet, { top: insets.top + 96 }]}>
        <View style={[styles.inner, { paddingBottom: insets.bottom + 24 }]}>
          <Grabber style={styles.grabber} />
          <FunKicker>go on — out with it.</FunKicker>
          <Text style={styles.title}>What happened here?</Text>
          <Text style={styles.sub}>
            Anonymous. Nobody reads this unless they walk within 50m of where you're standing.
          </Text>

          <WriteCard
            value={body}
            onChangeText={setBody}
            sign="— anonymous, here, now"
            count={body.length}
          />

          <MoodChips moods={['joy', 'ache', 'trouble', 'wonder']} selected={mood} onSelect={setMood} />

          <AppButton
            label="Drop here · forever"
            iconLeft={<SealPinIcon size={18} color={colors.paperCard} dotColor={colors.paperCard} />}
            onPress={handleDrop}
            style={styles.dropBtn}
          />
        </View>
      </Sheet>
    </PaperScreen>
  );
}

const styles = StyleSheet.create({
  close: { position: 'absolute', left: 18, zIndex: 25 },
  spotPill: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.paperCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 15,
    boxShadow: shadows.chip,
  },
  spotPillText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 9 * 0.2,
    textTransform: 'uppercase',
    color: colors.accentDeep,
  },
  placeLbl: {
    position: 'absolute',
    right: 30,
    zIndex: 12,
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 9 * 0.3,
    color: 'rgba(86,110,91,0.6)',
  },
  marker: {
    position: 'absolute',
    alignSelf: 'center',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 14,
  },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 18 },
  inner: { flex: 1, paddingTop: 18, paddingHorizontal: 26 },
  grabber: { marginBottom: 12 },
  title: {
    fontFamily: fonts.serif,
    fontSize: 29,
    letterSpacing: 29 * -0.01,
    color: colors.ink,
    marginTop: 2,
  },
  sub: {
    fontFamily: fonts.sans,
    fontSize: 12.5,
    lineHeight: 12.5 * 1.5,
    color: colors.inkSoft,
    marginTop: 8,
    maxWidth: 284,
  },
  dropBtn: { marginTop: 18 },
});
