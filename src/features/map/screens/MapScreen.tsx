/**
 * 04 Map — the living city map: sealed pins at real GPS coords bobbing,
 * your geo-anchored position dot (via MapLibre UserLocation), the drop FAB,
 * and the "within range" card when you're within 50 m of a drop.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
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
import { LayersIcon, LocateIcon, QuillIcon } from '../../../design-system/icons';
import { colors, shadows } from '../../../design-system/tokens';
import { useDeviceLocation, useNearbyDrops } from '../hooks';
import { LocChip } from '../components/LocChip';
import { MapPin } from '../components/MapPin';
import { MapLoader } from '../components/MapLoader';
import { RangeCard } from '../components/RangeCard';
import { LayerSheet } from '../components/LayerSheet';
import { LocationPermissionSheet } from '../components/LocationPermissionSheet';
import { isWithin } from '../../../utils/geo';
import { relativeTime } from '../../../utils/format';

type Props = CompositeScreenProps<
  NativeStackScreenProps<MapStackParamList, 'MapHome'>,
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, 'MapTab'>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

/** How long a fix may take before silence starts reading as "broken". */
const STALLED_AFTER_MS = 15_000;

export function MapScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { coord, live, shortAddress, status, request, refresh } = useDeviceLocation();
  // Open the map already centered on the user (or on the last place we knew
  // them to be) so the default center never flashes.
  const { adapter, MaplibreView, activeStyleKey, setMapStyle, styleOptions } = useMaplibreAdapter(coord ?? undefined);
  const { data: drops = [], isError: dropsFailed, refetch: refetchDrops } = useNearbyDrops(coord);
  const [layerSheetOpen, setLayerSheetOpen] = useState(false);
  const [permissionSheetOpen, setPermissionSheetOpen] = useState(false);
  const [stalled, setStalled] = useState(false);

  const needsPermission = status === 'denied' || status === 'blocked';

  // The GPS can simply never fix (indoors, airplane mode, a stuck provider).
  // After a while, say so and offer a way out instead of pulsing forever.
  useEffect(() => {
    if (live) {
      setStalled(false);
      return;
    }
    const timer = setTimeout(() => setStalled(true), STALLED_AFTER_MS);
    return () => clearTimeout(timer);
  }, [live]);

  // Someone who declined at onboarding lands here with no location at all —
  // surface the ask rather than an endless loader.
  useEffect(() => {
    if (needsPermission) setPermissionSheetOpen(true);
  }, [needsPermission]);

  // Recenter map on first real fix.
  const centeredRef = useRef(false);
  useEffect(() => {
    if (coord && live && !centeredRef.current) {
      centeredRef.current = true;
      adapter.flyTo(coord);
    }
  }, [coord, live, adapter]);

  // With no position at all there is nothing to draw — but only hold the
  // loader while a fix is still plausible. The native MapLibre surface punches
  // through RN sibling z-order on Android, so we can't mount the map beneath
  // it; render the loader alone instead.
  if (coord == null) {
    return (
      <>
        <MapLoader
          stalled={stalled || needsPermission}
          onRetry={needsPermission ? () => setPermissionSheetOpen(true) : refresh}
        />
        <LocationPermissionSheet
          visible={permissionSheetOpen}
          blocked={status === 'blocked'}
          onEnable={() => {
            setPermissionSheetOpen(false);
            if (status === 'blocked') {
              Linking.openSettings().catch(() => {});
            } else {
              request();
            }
          }}
          onClose={() => setPermissionSheetOpen(false)}
        />
      </>
    );
  }

  // Nearest drop within 50 m drives the RangeCard.
  const nearestInRange = drops.find(s => isWithin(coord, s.drop.coordinate));

  return (
    <View style={styles.root}>
      <MaplibreView>
        <Marker id="user-location" lngLat={[coord.lng, coord.lat]}>
          <UserDot />
        </Marker>
        {drops.map((secret, i) => (
          <Marker
            key={secret.id}
            id={secret.id}
            lngLat={[secret.drop.coordinate.lng, secret.drop.coordinate.lat]}
          >
            <MapPin
              deltaY={i % 2 === 0 ? -9 : 9}
              duration={9000 + i * 1000}
              accessibilityLabel={`Sealed secret at ${secret.drop.placeLabel ?? 'an unnamed spot'}`}
              onPress={() => navigation.navigate('SecretDetail', { secretId: secret.id })}
            />
          </Marker>
        ))}
      </MaplibreView>

      <LocChip
        kicker={
          dropsFailed
            ? 'offline · last known'
            : drops.length === 0
              ? 'nothing sealed near'
              : live
                ? "You're in"
                : 'last seen in'
        }
        place={shortAddress ?? (live ? 'Locating…' : 'somewhere you were')}
        count={drops.length}
        onPress={() => {
          refresh();
          // After a failed load the chip is the only retry the user has.
          if (dropsFailed) refetchDrops();
        }}
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
        style={({ pressed }) => [styles.recenterFab, pressed && styles.pressed]}
      >
        <LocateIcon size={21} />
      </Pressable>

      <WaxSeal
        size={58}
        shadow="sealLarge"
        accessibilityLabel="Drop a secret here"
        onPress={() => navigation.navigate('Composer')}
        style={styles.dropFab}
      >
        <QuillIcon size={25} />
      </WaxSeal>

      {nearestInRange ? (
        <RangeCard
          kicker="you're within range —"
          title={nearestInRange.drop.placeLabel ?? 'A secret was dropped here'}
          meta={`Tap to break the seal · ${relativeTime(nearestInRange.drop.createdAt)}`}
          onPress={() => navigation.navigate('Opening', { secretId: nearestInRange.id })}
          style={[styles.rangeCard, { bottom: insets.bottom + 12 }]}
        />
      ) : null}

      <LocationPermissionSheet
        visible={permissionSheetOpen}
        blocked={status === 'blocked'}
        onEnable={() => {
          setPermissionSheetOpen(false);
          if (status === 'blocked') {
            Linking.openSettings().catch(() => {});
          } else {
            request();
          }
        }}
        onClose={() => setPermissionSheetOpen(false)}
      />

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
    bottom: 168,
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
  dropFab: { position: 'absolute', right: 18, bottom: 100, zIndex: 21 },
  rangeCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 20,
  },
});
