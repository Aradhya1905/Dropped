/**
 * 04 Map — the living city map: sealed pins bobbing, your pulsing position,
 * one live (in-range) secret, the drop FAB, and the "within range" card.
 */
import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type {
  MainTabParamList,
  MapStackParamList,
  RootStackParamList,
} from '../../../app/navigation/types';
import {
  FloatBob,
  PulseRing,
  WaxSeal,
} from '../../../design-system/components';
import { useMaplibreAdapter } from '../../../services/maps';
import {
  LayersIcon,
  QuillIcon,
  SealPinIcon,
} from '../../../design-system/icons';
import { colors, fonts, shadows } from '../../../design-system/tokens';
import { useDeviceLocation } from '../hooks';
import { LocChip } from '../components/LocChip';
import { MapPin } from '../components/MapPin';
import { RangeCard } from '../components/RangeCard';

type Props = CompositeScreenProps<
  NativeStackScreenProps<MapStackParamList, 'MapHome'>,
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, 'MapTab'>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

export function MapScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { adapter, MaplibreView } = useMaplibreAdapter();
  const { coord, shortAddress, status, refresh } = useDeviceLocation();

  // Onboarding usually grants + warms location first; guard in case it didn't.
  useEffect(() => {
    if (status === 'unknown') {
      refresh();
    }
  }, [status, refresh]);

  // Recenter on the first real fix (and again if the device moves far).
  const centeredRef = useRef(false);
  useEffect(() => {
    if (coord && !centeredRef.current) {
      centeredRef.current = true;
      adapter.flyTo(coord);
    }
  }, [coord, adapter]);

  // a sealed pin far away → its "walk closer" sheet (05)
  const openPin = () => navigation.navigate('SecretDetail');

  return (
    <View style={styles.root}>
      <MaplibreView />
      <View style={styles.park} />
      <Text style={styles.parkLbl}>PARK</Text>

      {/* sealed pins scattered on the map — tap one to walk it into range */}
      <MapPin
        style={{ top: insets.top + 134, left: 34 }}
        deltaY={-9}
        duration={9000}
        onPress={openPin}
      />
      <MapPin
        style={{ top: insets.top + 96, right: 48 }}
        deltaY={9}
        duration={11000}
        onPress={openPin}
      />
      <MapPin
        style={{ top: insets.top + 246, right: 30 }}
        deltaY={-9}
        duration={12000}
        onPress={openPin}
      />
      <MapPin
        style={{ top: insets.top + 416, left: 24 }}
        deltaY={9}
        duration={10000}
        onPress={openPin}
      />

      {/* you + the live secret within reach */}
      <View
        style={[styles.rangeStage, { marginTop: insets.top }]}
        pointerEvents="none"
      >
        {[0, 1200, 2400].map(delay => (
          <PulseRing
            key={delay}
            size={60}
            fromScale={0.5}
            toScale={3}
            peakOpacity={0.6}
            durationMs={3600}
            delayMs={delay}
            borderWidth={1.5}
            borderColor={colors.accent}
          />
        ))}
        <View style={styles.youDot} />
        <FloatBob
          rotate={0}
          deltaRotate={0}
          deltaY={7}
          duration={7000}
          style={styles.livePinWrap}
        >
          <PulseRing
            size={54}
            fromScale={0.9}
            toScale={1.8}
            peakOpacity={0.5}
            durationMs={3600}
            borderWidth={1.5}
            borderColor={colors.accent}
          />
          <WaxSeal size={40}>
            <SealPinIcon size={17} />
          </WaxSeal>
        </FloatBob>
      </View>

      <LocChip
        kicker="You're in"
        place={shortAddress ?? 'Locating…'}
        count={9}
        style={[styles.locChip, { top: insets.top + 10 }]}
      />
      <Pressable
        accessibilityLabel="Map layers"
        style={({ pressed }) => [
          styles.layersFab,
          { top: insets.top + 8 },
          pressed && styles.pressed,
        ]}
      >
        <LayersIcon size={21} />
      </Pressable>

      <WaxSeal
        size={58}
        shadow="sealLarge"
        onPress={() => navigation.navigate('Composer')}
        style={styles.dropFab}
      >
        <QuillIcon size={25} />
      </WaxSeal>

      <RangeCard
        kicker="you're within range —"
        title="A secret was dropped here"
        meta="Tap to break the seal · 4 years ago"
        onPress={() => navigation.navigate('Opening')}
        style={styles.rangeCard}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  park: {
    position: 'absolute',
    left: -40,
    bottom: 90,
    width: 230,
    height: 230,
    backgroundColor: 'rgba(118,149,124,0.16)',
    borderTopLeftRadius: 106,
    borderTopRightRadius: 124,
    borderBottomRightRadius: 115,
    borderBottomLeftRadius: 115,
    zIndex: 1,
  },
  parkLbl: {
    position: 'absolute',
    left: 54,
    bottom: 188,
    zIndex: 2,
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 9 * 0.3,
    color: 'rgba(86,110,91,0.65)',
  },
  rangeStage: {
    position: 'absolute',
    top: 276,
    left: 0,
    right: 0,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 13,
  },
  youDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    boxShadow:
      '0 0 0 4px rgba(118,149,124,0.25), 0 2px 6px rgba(86,110,91,0.5)',
  },
  livePinWrap: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: 26,
    marginTop: -54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locChip: { position: 'absolute', left: 16, zIndex: 20 },
  layersFab: {
    position: 'absolute',
    right: 16,
    zIndex: 20,
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.paperCard,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: shadows.chip,
  },
  pressed: { opacity: 0.8 },
  dropFab: { position: 'absolute', right: 18, bottom: 100, zIndex: 21 },
  rangeCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
    zIndex: 20,
  },
});
