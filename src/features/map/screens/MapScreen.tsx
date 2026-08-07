/**
 * 04 Map — the living city map: sealed pins at real GPS coords bobbing,
 * your geo-anchored position dot (via MapLibre UserLocation), the drop FAB,
 * and the "within range" card when you're within 50 m of a drop.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
import { useMaplibreAdapter } from '../../../services/maps';
import {
  LayersIcon,
  LocateIcon,
  QuillIcon,
} from '../../../design-system/icons';
import { colors, fonts, shadows } from '../../../design-system/tokens';
import { MOODS } from '../../../types';
import { MoodChips } from '../../drop/components';
import {
  EMPTY_NEARBY,
  useBackgroundWalk,
  useDeviceLocation,
  useMoodFilter,
  useNearbyDrops,
} from '../hooks';
import { EchoCard, useEchoes } from '../../echo';
import { useDropsStore } from '../../../store/dropsStore';
import { agoLabel } from '../../../utils/format';
import { LocChip } from '../components/LocChip';
import { MapPin } from '../components/MapPin';
import { MapLoader } from '../components/MapLoader';
import { RangeCard } from '../components/RangeCard';
import { LayerSheet } from '../components/LayerSheet';
import { BackgroundWalkSheet } from '../components/BackgroundWalkSheet';
import { isWithin } from '../../../utils/geo';
import { WHISPER_RADIUS_M } from '../../../types';

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
    useMaplibreAdapter(coord ?? undefined, { fog: true });
  const { moods, toggle: toggleMood, clear: clearMoods, filtering } = useMoodFilter();
  const { data: nearby = EMPTY_NEARBY, refetch: refetchDrops } = useNearbyDrops(
    coord,
    moods,
  );
  const { secrets: drops, hiddenByFilter } = nearby;
  const upsertDrop = useDropsStore(s => s.upsertDrop);
  const knownDrops = useDropsStore(s => s.drops);
  const [layerSheetOpen, setLayerSheetOpen] = useState(false);
  const backgroundWalk = useBackgroundWalk();

  // Anniversaries near this spot. Off unless the user asked for them, and the
  // hook rides the same location watch as everything else on this screen — it
  // only reaches the network once a day per 250 m.
  const { echoes, mute: muteEcho } = useEchoes(coord);

  // Sync fetched secrets into Zustand so SecretDetailScreen can read them.
  useEffect(() => {
    drops.forEach(s => upsertDrop(s));
  }, [drops, upsertDrop]);

  // RN has no window-focus events, so react-query never refetches on its own
  // when we come back from the composer/reveal flow. Pull the list again on
  // screen focus so a fresh drop shows up without an app restart.
  useFocusEffect(
    useCallback(() => {
      refetchDrops();
    }, [refetchDrops]),
  );

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
  //
  // Whisper visibility is deliberately keyed off the server's own
  // `distanceMeters` from the same response, not off the live fix: the server
  // decides what to send, we decide what to show, and both read 150 m from the
  // one snapshot. Re-deriving it per GPS fix would rebuild every marker a few
  // times a second and make the whole map flicker.
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
            replyCount={secret.replyCount}
            expiresAt={secret.expiresAt}
            revealCondition={secret.revealCondition}
            mood={secret.mood}
            whisper={
              (secret.distanceMeters ?? Infinity) <= WHISPER_RADIUS_M
                ? secret.whisper
                : undefined
            }
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

  // One card at a time, and something you can open right now always beats a
  // memory: the echo only appears when nothing is in range.
  const echo = nearestInRange ? undefined : echoes[0];

  /**
   * Open what the echo is about. A secret this device has already revealed is
   * in the store with its body, so it opens straight to the reading screen;
   * anything else goes to the sealed detail screen and still costs the walk.
   * After a restart the store is empty, which lands everything on the sealed
   * screen — the honest answer, since the body genuinely isn't on the device.
   */
  const openEcho = (secretId: string) => {
    const known = knownDrops.find(d => d.id === secretId);
    navigation.navigate(known?.body ? 'Secret' : 'SecretDetail', { secretId });
  };

  // FAB vertical anchors. With the RangeCard docked the drop seal should
  // half-overlap the card's top-right corner (per design 04), with the recenter
  // FAB stacked just above it. Card bottom = insets.bottom + 12, height ~96, so
  // its top edge sits at insets.bottom + 108; the 58px drop seal straddles it.
  const dropFabBottom = nearestInRange || echo ? insets.bottom + 49 : 100;
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

      <View style={[styles.filterBar, { top: insets.top + 62 }]}>
        <MoodChips
          compact
          tintDots
          moods={MOODS}
          selected={moods}
          onToggle={toggleMood}
        />
        {/*
          Filtering hides content in an app whose whole promise is that you can
          only read what you walk to. The count keeps the filter honest: what's
          missing is missing from the *view*, not from the world — and tapping
          it puts everything back.
        */}
        {filtering ? (
          <Pressable onPress={clearMoods} style={styles.hiddenLine}>
            <Text style={styles.hiddenText}>
              {drops.length === 0
                ? `nothing ${moods.join(' or ')} near you · tap to clear`
                : hiddenByFilter === 0
                ? 'nothing hidden · tap to clear'
                : `${hiddenByFilter} ${
                    hiddenByFilter === 1 ? 'secret' : 'secrets'
                  } hidden · tap to clear`}
            </Text>
          </Pressable>
        ) : null}
      </View>

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
          meta={`Tap to break the seal · ${agoLabel(
            nearestInRange.drop.createdAt,
          )}`}
          onPress={() =>
            navigation.navigate('Opening', { secretId: nearestInRange.id })
          }
          style={[styles.rangeCard, { bottom: insets.bottom - 35 }]}
        />
      ) : echo ? (
        <EchoCard
          echo={echo}
          onPress={() => openEcho(echo.secretId)}
          onMute={() => muteEcho(echo.secretId)}
          style={[styles.rangeCard, { bottom: insets.bottom + 12 }]}
        />
      ) : null}

      <LayerSheet
        visible={layerSheetOpen}
        activeKey={activeStyleKey}
        options={styleOptions}
        onSelect={setMapStyle}
        onClose={() => setLayerSheetOpen(false)}
      />

      {/*
        The background-location ask. Offered here rather than at onboarding
        because Android puts "allow all the time" in a second dialog that a
        first-run user will simply refuse — and a refusal is permanent. The hook
        holds it back until at least one secret has been revealed.
      */}
      <BackgroundWalkSheet
        visible={backgroundWalk.prompting}
        busy={backgroundWalk.busy}
        blocked={backgroundWalk.blocked}
        onEnable={() => {
          backgroundWalk.enable().catch(() => {});
        }}
        onClose={backgroundWalk.dismiss}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  locChip: { position: 'absolute', left: 16, zIndex: 20 },
  filterBar: { position: 'absolute', left: 16, right: 16, zIndex: 20 },
  hiddenLine: { marginTop: 8, alignSelf: 'flex-start' },
  hiddenText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 9 * 0.16,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
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
