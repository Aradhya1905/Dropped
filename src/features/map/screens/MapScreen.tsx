/**
 * 04 Map — the living city map: sealed pins at real GPS coords bobbing,
 * your geo-anchored position dot (via MapLibre UserLocation), the drop FAB,
 * and the "within range" card when you're within 50 m of a drop.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Marker } from '@maplibre/maplibre-react-native';
import { UserDot } from '../components/UserDot';

import type {
  MainTabParamList,
  MapStackParamList,
  RootStackParamList,
} from '../../../app/navigation/types';
import { WaxSeal } from '../../../design-system/components';
import { useMaplibreAdapter } from '../../../services/maps';
import {
  LayersIcon,
  LocateIcon,
  QuillIcon,
} from '../../../design-system/icons';
import { colors, shadows } from '../../../design-system/tokens';
import { useDeviceLocation, useNearbyDrops } from '../hooks';
import { useDropsStore } from '../../../store/dropsStore';
import { LocChip } from '../components/LocChip';
import { MapPin } from '../components/MapPin';
import { MapLoader } from '../components/MapLoader';
import { RangeCard } from '../components/RangeCard';
import { LayerSheet } from '../components/LayerSheet';
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
  const { coord, shortAddress, status, refresh, request } = useDeviceLocation();
  // Open the map already centered on the user so the default center never
  // flashes (the map only mounts once we have a fix — see the guard below).
  const { adapter, MaplibreView, activeStyleKey, setMapStyle, styleOptions } =
    useMaplibreAdapter(coord ?? undefined);
  const { data: drops = [] } = useNearbyDrops(coord);
  const upsertDrop = useDropsStore(s => s.upsertDrop);
  const [layerSheetOpen, setLayerSheetOpen] = useState(false);

  // Sync fetched secrets into Zustand so SecretDetailScreen can read them.
  useEffect(() => {
    drops.forEach(s => upsertDrop(s));
  }, [drops, upsertDrop]);

  // The context auto-starts the live watch when permission is already held.
  // This is the cold-start guard: if we land here without a grant (skipped or
  // denied onboarding), prompt once so the watch can begin.
  useEffect(() => {
    if (status === 'unknown' || status === 'denied') {
      request();
    }
  }, [status, request]);

  // Secret markers depend only on the drops list — memoize so streaming GPS
  // fixes (which re-render this screen) don't rebuild every marker and churn
  // the native map (flicker). Must run before the coord==null early return.
  const dropMarkers = useMemo(
    () =>
      drops.map((secret, i) => (
        <Marker
          key={secret.id}
          id={secret.id}
          lngLat={[secret.drop.coordinate.lng, secret.drop.coordinate.lat]}
        >
          <MapPin
            deltaY={i % 2 === 0 ? -9 : 9}
            duration={9000 + i * 1000}
            onPress={() =>
              navigation.navigate('SecretDetail', { secretId: secret.id })
            }
          />
        </Marker>
      )),
    [drops, navigation],
  );

  // Recenter map on first real fix.
  const centeredRef = useRef(false);
  useEffect(() => {
    if (coord && !centeredRef.current) {
      centeredRef.current = true;
      adapter.flyTo(coord);
    }
  }, [coord, adapter]);

  // Until the first GPS fix, cover everything with the loader. The native
  // MapLibre surface punches through RN sibling z-order on Android, so we must
  // not mount the map underneath — render the loader alone instead.
  if (coord == null) {
    return <MapLoader />;
  }

  // Nearest drop within 50 m drives the RangeCard.
  const nearestInRange = drops.find(s => isWithin(coord, s.drop.coordinate));

  // FAB vertical anchors. With the RangeCard docked the drop seal should
  // half-overlap the card's top-right corner (per design 04), with the recenter
  // FAB stacked just above it. Card bottom = insets.bottom + 12, height ~96, so
  // its top edge sits at insets.bottom + 108; the 58px drop seal straddles it.
  const dropFabBottom = nearestInRange ? insets.bottom + 49 : 100;
  const recenterFabBottom = dropFabBottom + 70;

  return (
    <View style={styles.root}>
      <MaplibreView>
        <Marker id="user-location" lngLat={[coord.lng, coord.lat]}>
          <UserDot />
        </Marker>
        {dropMarkers}
      </MaplibreView>

      <LocChip
        kicker="You're in"
        place={shortAddress ?? 'Locating…'}
        count={drops.length}
        onPress={refresh}
        style={[styles.locChip, { top: insets.top + 10 }]}
      />
      <Pressable
        accessibilityLabel="Map layers"
        onPress={() => setLayerSheetOpen(true)}
        style={({ pressed }) => [
          styles.layersFab,
          { top: insets.top + 8 },
          pressed && styles.pressed,
        ]}
      >
        <LayersIcon size={21} />
      </Pressable>

      <Pressable
        accessibilityLabel="Recenter map on your location"
        onPress={() => {
          refresh();
          adapter.flyTo(coord);
        }}
        style={({ pressed }) => [
          styles.recenterFab,
          { bottom: recenterFabBottom },
          pressed && styles.pressed,
        ]}
      >
        <LocateIcon size={21} />
      </Pressable>

      <WaxSeal
        size={58}
        shadow="sealLarge"
        onPress={() => navigation.navigate('Composer')}
        style={[styles.dropFab, { bottom: dropFabBottom }]}
      >
        <QuillIcon size={25} />
      </WaxSeal>

      {nearestInRange ? (
        <RangeCard
          kicker="you're within range —"
          title="A secret was dropped here"
          meta={`Tap to break the seal · ${_yearsAgo(
            nearestInRange.drop.createdAt,
          )}`}
          onPress={() =>
            navigation.navigate('Opening', { secretId: nearestInRange.id })
          }
          style={[styles.rangeCard, { bottom: insets.bottom - 35 }]}
        />
      ) : null}

      <LayerSheet
        visible={layerSheetOpen}
        activeKey={activeStyleKey}
        options={styleOptions}
        onSelect={setMapStyle}
        onClose={() => setLayerSheetOpen(false)}
      />
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
  recenterFab: {
    position: 'absolute',
    right: 18,
    zIndex: 21,
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
  dropFab: { position: 'absolute', right: 18, zIndex: 21 },
  rangeCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 20,
  },
});
