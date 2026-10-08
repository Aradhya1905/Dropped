/**
 * 04 Map — the living city map: sealed pins at real GPS coords bobbing,
 * your geo-anchored position dot (via MapLibre UserLocation), the drop FAB,
 * and the "within range" card when you're within 50 m of a drop.
 *
 * Trails (chain drops): stops are joined by a dashed ink line, opened stops
 * show a broken seal, and the stop you just unlocked a numbered wax pin. While
 * you're following one, the location chip becomes an "on a trail" pill and a
 * next-stop card offers to walk you there.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
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
import { MapPolyline, useMaplibreAdapter } from '../../../services/maps';
import {
  LayersIcon,
  LocateIcon,
  QuillIcon,
} from '../../../design-system/icons';
import { colors, shadows } from '../../../design-system/tokens';
import { useDeviceLocation, useNearbyDrops, useStarterDrops } from '../hooks';
import { LocChip } from '../components/LocChip';
import { ChainPin } from '../components/ChainPin';
import { MapPin } from '../components/MapPin';
import { NextStopCard } from '../components/NextStopCard';
import { TrailPill } from '../components/TrailPill';
import { MapLoader } from '../components/MapLoader';
import { RangeCard } from '../components/RangeCard';
import { LayerSheet } from '../components/LayerSheet';
import { LocationPermissionSheet } from '../components/LocationPermissionSheet';
import { bearingTo, compassPoint, haversineMeters, isWithin } from '../../../utils/geo';
import { formatDistance, relativeTime, walkMinutes } from '../../../utils/format';
import { filterByMood, isAllMoods } from '../../../utils/moods';
import { useMoodFilterStore } from '../../../store/moodFilterStore';
import {
  activeTrail,
  chainPinKind,
  hiddenAfterLine,
  trailDots,
  trailsOnMap,
} from '../../../utils/chains';

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
  const { adapter, MaplibreView, activeStyleKey, setMapStyle, styleOptions } =
    useMaplibreAdapter(coord ?? undefined);
  const { data: nearby = [], isError: dropsFailed, refetch: refetchDrops } = useNearbyDrops(coord);
  // The You tab's "show me" filter. Everything below works off the filtered
  // list, so a hidden mood gets no pin, no range card and no count.
  const moods = useMoodFilterStore(s => s.moods);
  const drops = useMemo(() => filterByMood(nearby, moods), [nearby, moods]);
  const filtered = !isAllMoods(moods);
  // First run in an empty area: the server seeds a few starter drops nearby.
  useStarterDrops();
  const [layerSheetOpen, setLayerSheetOpen] = useState(false);
  const [permissionSheetOpen, setPermissionSheetOpen] = useState(false);
  const [stalled, setStalled] = useState(false);
  // Measured so the FABs can straddle the next-stop card's top edge.
  const [nextCardH, setNextCardH] = useState(0);

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

  // RN has no window-focus events, so react-query never refetches on its own
  // when we come back from the composer/reveal flow. Pull the list again on
  // screen focus so a fresh drop shows up without an app restart.
  useFocusEffect(
    useCallback(() => {
      refetchDrops();
    }, [refetchDrops]),
  );

  // Secret markers depend only on the drops list — memoize so streaming GPS
  // fixes (which re-render this screen) don't rebuild every marker and churn
  // the native map (flicker). Must run before the coord==null early return.
  const trails = useMemo(() => trailsOnMap(drops), [drops]);
  const dropMarkers = useMemo(
    () =>
      drops.map((secret, i) => {
        const place = secret.drop.placeLabel ?? 'an unnamed spot';
        const kind = chainPinKind(secret, trails);
        return (
          <Marker
            key={secret.id}
            id={secret.id}
            lngLat={[secret.drop.coordinate.lng, secret.drop.coordinate.lat]}
          >
            {kind && secret.chain ? (
              <ChainPin
                kind={kind}
                pos={secret.chain.pos}
                length={secret.chain.length}
                deltaY={i % 2 === 0 ? -9 : 9}
                duration={9000 + i * 1000}
                accessibilityLabel={
                  kind === 'read'
                    ? `Trail stop ${secret.chain.pos}, already read, at ${place}`
                    : `${kind === 'next' ? 'Next trail stop' : 'Trail stop'} ${secret.chain.pos} of ${secret.chain.length}, sealed, at ${place}`
                }
                onPress={() =>
                  kind === 'read'
                    ? navigation.navigate('Secret', { secretId: secret.id })
                    : navigation.navigate('SecretDetail', { secretId: secret.id })
                }
              />
            ) : (
              <MapPin
                deltaY={i % 2 === 0 ? -9 : 9}
                duration={9000 + i * 1000}
                accessibilityLabel={`Sealed secret at ${place}`}
                onPress={() => navigation.navigate('SecretDetail', { secretId: secret.id })}
              />
            )}
          </Marker>
        );
      }),
    [drops, trails, navigation],
  );

  // The dashed ink line through each trail's stops that are on the map.
  const trailLines = useMemo(
    () =>
      trails
        .filter(t => t.stops.length > 1)
        .map(t => (
          <MapPolyline
            key={t.id}
            id={`trail-${t.id}`}
            coordinates={t.stops.map(s => s.drop.coordinate)}
            color={colors.ink}
            width={2.2}
            dashArray={[0.5, 3]}
            opacity={0.85}
          />
        )),
    [trails],
  );

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

  // Following a trail: the next stop gets the bottom card (unless something is
  // already within range — breaking a seal comes first).
  const following = activeTrail(drops, coord);
  const nextStop = following?.next;
  const showNextCard = !!nextStop && !nearestInRange;
  const nextDist = nextStop ? haversineMeters(coord, nextStop.drop.coordinate) : 0;

  // FAB vertical anchors. With the RangeCard docked the drop seal should
  // half-overlap the card's top-right corner (per design 04), with the recenter
  // FAB stacked just above it. Card bottom = insets.bottom + 12, height ~96, so
  // its top edge sits at insets.bottom + 108; the 58px drop seal straddles it.
  // The taller next-stop card is measured instead.
  const dropFabBottom = nearestInRange
    ? insets.bottom + 49
    : showNextCard && nextCardH > 0
      ? insets.bottom + 12 + nextCardH - 29
      : 100;
  const recenterFabBottom = dropFabBottom + 70;

  return (
    <View style={styles.root}>
      <MaplibreView>
        <Marker id="user-location" lngLat={[coord.lng, coord.lat]}>
          <UserDot />
        </Marker>
        {trailLines}
        {dropMarkers}
      </MaplibreView>

      {following && nextStop?.chain ? (
        <TrailPill
          stop={nextStop.chain.pos}
          of={following.trail.length}
          place={nextStop.drop.placeLabel ?? shortAddress ?? 'the next stop'}
          dots={trailDots(following)}
          onPress={() =>
            adapter.fitBounds([coord, ...following.trail.stops.map(s => s.drop.coordinate)], 96)
          }
          style={[styles.trailPill, { top: insets.top + 8 }]}
        />
      ) : (
        <LocChip
          kicker={
            dropsFailed
              ? 'offline · last known'
              : drops.length === 0
                ? filtered && nearby.length > 0
                  ? 'none in your moods'
                  : 'nothing sealed near'
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
      )}
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
        accessibilityLabel="Drop a secret here"
        onPress={() => navigation.navigate('Composer')}
        style={[styles.dropFab, { bottom: dropFabBottom }]}
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

      {showNextCard && nextStop?.chain ? (
        <NextStopCard
          mood={nextStop.mood}
          distance={formatDistance(nextDist)}
          way={`${compassPoint(bearingTo(coord, nextStop.drop.coordinate))} · ~${walkMinutes(nextDist)} min`}
          after={hiddenAfterLine(nextStop.chain.pos, following!.trail.length)}
          onWalk={() => navigation.navigate('Walk', { secretId: nextStop.id })}
          onLayout={e => setNextCardH(Math.round(e.nativeEvent.layout.height))}
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
  // Stops short of the layers button (16 + 46 + 10).
  trailPill: { position: 'absolute', left: 16, right: 72, zIndex: 20 },
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
