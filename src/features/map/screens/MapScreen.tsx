/**
 * 04 Map — the living city map: sealed pins at real GPS coords bobbing,
 * your geo-anchored position dot (via MapLibre UserLocation), the drop FAB,
 * and the "within range" card when you're within 50 m of a drop.
 */
import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Marker, UserLocation } from '@maplibre/maplibre-react-native';

import type {
  MainTabParamList,
  MapStackParamList,
  RootStackParamList,
} from '../../../app/navigation/types';
import { WaxSeal } from '../../../design-system/components';
import { useMaplibreAdapter } from '../../../services/maps';
import { LayersIcon, QuillIcon } from '../../../design-system/icons';
import { colors, shadows } from '../../../design-system/tokens';
import { useDeviceLocation } from '../hooks';
import { LocChip } from '../components/LocChip';
import { MapPin } from '../components/MapPin';
import { RangeCard } from '../components/RangeCard';
import { useDropsStore } from '../../../store/dropsStore';
import { isWithin } from '../../../utils/geo';

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
  const { drops, seed, seeded } = useDropsStore();

  // Onboarding usually grants + warms location first; guard in case it didn't.
  useEffect(() => {
    if (status === 'unknown') {
      refresh();
    }
  }, [status, refresh]);

  // Recenter on first real fix; seed dummy drops once.
  const centeredRef = useRef(false);
  useEffect(() => {
    if (coord) {
      if (!centeredRef.current) {
        centeredRef.current = true;
        adapter.flyTo(coord);
      }
      if (!seeded) {
        seed(coord);
      }
    }
  }, [coord, adapter, seed, seeded]);

  // Nearest drop within 50 m drives the RangeCard.
  const nearestInRange = coord
    ? drops.find(s => isWithin(coord, s.drop.coordinate))
    : null;

  return (
    <View style={styles.root}>
      <MaplibreView>
        <UserLocation animated minDisplacement={2} />
        {drops.map((secret, i) => (
          <Marker
            key={secret.id}
            id={secret.id}
            lngLat={[secret.drop.coordinate.lng, secret.drop.coordinate.lat]}
          >
            <MapPin
              deltaY={i % 2 === 0 ? -9 : 9}
              duration={9000 + i * 1000}
              onPress={() => navigation.navigate('SecretDetail', { secretId: secret.id })}
            />
          </Marker>
        ))}
      </MaplibreView>

      <LocChip
        kicker="You're in"
        place={shortAddress ?? 'Locating…'}
        count={drops.length}
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

      {nearestInRange ? (
        <RangeCard
          kicker="you're within range —"
          title={nearestInRange.drop.placeLabel ?? 'A secret was dropped here'}
          meta={`Tap to break the seal · ${_yearsAgo(nearestInRange.drop.createdAt)}`}
          onPress={() => navigation.navigate('Opening', { secretId: nearestInRange.id })}
          style={[styles.rangeCard, { bottom: insets.bottom + 12 }]}
        />
      ) : null}
    </View>
  );
}

function _yearsAgo(ms: number): string {
  const years = Math.round((Date.now() - ms) / (365.25 * 24 * 3600 * 1000));
  if (years < 1) return 'just now';
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
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
    zIndex: 20,
  },
});
