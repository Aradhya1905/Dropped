/**
 * 04a/b/c — walking a secret into range, in three beats: out of range,
 * crossing the 50 m line, then standing on top of it — now over a REAL map.
 *
 * Geometry is geographic: your live GPS dot, the drop's wax pin, a real 50 m
 * unlock ring, and a street-following walking path (from the backend /route/foot
 * proxy). The path + footsteps only render when the proxy returns one; when it
 * can't (quota spent / offline) the map, dot, pin, and ring still show.
 *
 * Beats are driven by real straight-line GPS distance (haversine) — that, not
 * the route, is what gates the 50 m reveal.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { GeoJSONSource, Layer, Marker } from '@maplibre/maplibre-react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type {
  MainTabParamList,
  MapStackParamList,
  RootStackParamList,
  WalkBeat,
} from '../../../app/navigation/types';
import { PulseRing } from '../../../design-system/components';
import { HeadingIcon, LocateIcon, LockIcon, PinIcon } from '../../../design-system/icons';
import { colors, fonts } from '../../../design-system/tokens';
import {
  useDeviceLocation,
  useFootRoute,
  useWarmth,
  WARMTH_FAR_M,
  WARMTH_WARM_M,
} from '../hooks';
import { FindCard } from '../components/FindCard';
import { MapStatus } from '../components/MapStatus';
import { MapLoader } from '../components/MapLoader';
import { UserDot } from '../components/UserDot';
import { useMaplibreAdapter } from '../../../services/maps';
import { useDropsStore } from '../../../store/dropsStore';
import {
  circlePolygon,
  haversineMeters,
  samplePathSteps,
} from '../../../utils/geo';
import type { Coordinate } from '../../../types';
import { REVEAL_RADIUS_M } from '../../../types';

type Props = CompositeScreenProps<
  NativeStackScreenProps<MapStackParamList, 'Walk'>,
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, 'MapTab'>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

// Distance thresholds in metres. Taken from the warmth bands (`useWarmth`) so
// the beats you see and the pulses you feel change at exactly the same lines.
const RANGE_THRESHOLD = WARMTH_FAR_M;
const ARRIVED_THRESHOLD = REVEAL_RADIUS_M;

/** Footstep spacing along the walking route, in metres. */
const FOOTSTEP_SPACING_M = 35;

/**
 * Steps within this along-route distance of the user glow solid ("walked");
 * beyond it they stay faint ("ahead") — a bright→faint trail from the feet out.
 */
const STEP_LIT_RANGE_M = WARMTH_WARM_M;

/** The buried secret's wax pin — grows and shakes as you arrive. */
function SecretPin({ beat }: { beat: WalkBeat }) {
  const shake = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (beat !== 'arrived') {
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(2296),
        Animated.timing(shake, { toValue: -1, duration: 168, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 1, duration: 168, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 168, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [beat, shake]);

  const scale = beat === 'approach' ? 0.82 : beat === 'arrived' ? 1.16 : 1;
  return (
    <Animated.View
      style={[
        styles.secretPin,
        {
          opacity: beat === 'approach' ? 0.9 : 1,
          transform: [
            { scale },
            { rotate: shake.interpolate({ inputRange: [-1, 1], outputRange: ['-7deg', '6deg'] }) },
          ],
        },
      ]}
    >
      <Svg width={44} height={44} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="secretPinGrad" cx="36%" cy="30%" r="82%">
            <Stop offset="0" stopColor={colors.accent} />
            <Stop offset="0.82" stopColor={colors.accentDeep} />
            <Stop offset="1" stopColor={colors.accentDeep} />
          </RadialGradient>
        </Defs>
        <Circle cx={22} cy={22} r={22} fill="url(#secretPinGrad)" />
      </Svg>
      <LockIcon size={21} color="rgba(255,255,255,0.9)" strokeWidth={1.6} />
    </Animated.View>
  );
}

/** Expanding ripple where you crossed into the zone. */
function CrossRipple() {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(t, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [t]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.crossRipple,
        {
          opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }),
          transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.4, 4.4] }) }],
        },
      ]}
    />
  );
}

export function WalkSequenceScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { secretId } = route.params;
  const secret = useDropsStore(s => s.drops.find(d => d.id === secretId));
  const { coord, shortAddress } = useDeviceLocation();
  const drop: Coordinate | null = secret?.drop.coordinate ?? null;

  const { adapter, MaplibreView } = useMaplibreAdapter(coord ?? undefined);
  const { data: footRoute } = useFootRoute(coord, drop);

  // GPS-derived distance + beat. A missing coordinate would make haversine
  // return NaN (all comparisons false → silent "approach"); guard for null.
  const rawDist = coord && drop ? haversineMeters(coord, drop) : null;
  const distM = rawDist != null && Number.isFinite(rawDist) ? rawDist : null;

  const beat: WalkBeat =
    distM == null ? 'approach' :
    distM <= ARRIVED_THRESHOLD ? 'arrived' :
    distM <= RANGE_THRESHOLD ? 'range' :
    'approach';

  // Hot/cold: haptic pulses + the ring's tempo, both keyed off the same bands.
  // Must run before the loader early-returns below.
  const { ringPeriodMs } = useWarmth(distM);

  // Frame both points on the first fix and whenever the beat changes — so the
  // pair stays in view as you close in ("fit both, then follow").
  const fittedRef = useRef(false);
  const lastBeatRef = useRef<WalkBeat | null>(null);
  const { fitBounds } = adapter;
  useEffect(() => {
    if (!coord || !drop) return;
    if (!fittedRef.current || lastBeatRef.current !== beat) {
      fittedRef.current = true;
      lastBeatRef.current = beat;
      fitBounds([coord, drop], 96);
    }
  }, [coord, drop, beat, fitBounds]);

  // --- map children, memoized so streaming GPS fixes don't re-upload the
  // native GeoJSON sources / re-spawn markers (flicker). These hooks must run
  // before the early return below, so they're null-safe on `drop`.

  // 50 m unlock zone as a real geographic polygon. Depends only on the (stable)
  // drop, so it never changes identity once the drop is known.
  const dropLngLat = useMemo<[number, number] | null>(
    () => (drop ? [drop.lng, drop.lat] : null),
    [drop],
  );
  const zoneFeature = useMemo(() => {
    if (!drop) return null;
    const zoneRing = circlePolygon(drop, REVEAL_RADIUS_M).map(c => [c.lng, c.lat]);
    return {
      type: 'Feature' as const,
      properties: {},
      geometry: { type: 'Polygon' as const, coordinates: [zoneRing] },
    };
  }, [drop]);

  // Walking path + footsteps — only when the proxy returned a usable route.
  // A malformed / empty LineString is treated as no-route — handing one to the
  // native source crashes.
  const routeFeature = useMemo(() => {
    const coords = footRoute?.geometry?.coordinates;
    if (!footRoute?.available || !Array.isArray(coords) || coords.length < 2) {
      return null;
    }
    return { type: 'Feature' as const, properties: {}, geometry: footRoute.geometry! };
  }, [footRoute]);
  // Space footsteps ≥35 m apart, widening on long routes so we never spawn
  // more than ~40 markers.
  const footsteps = useMemo(() => {
    const coords = footRoute?.geometry?.coordinates;
    if (!footRoute?.available || !Array.isArray(coords) || coords.length < 2) {
      return { spacing: FOOTSTEP_SPACING_M, steps: [] as ReturnType<typeof samplePathSteps> };
    }
    const spacing = Math.max(
      FOOTSTEP_SPACING_M,
      Math.round((footRoute.distanceMeters ?? 0) / 40),
    );
    const steps = samplePathSteps(
      coords.map(([lng, lat]) => ({ lat, lng })),
      spacing,
    );
    return { spacing, steps };
  }, [footRoute]);

  // Until the first GPS fix (or if the drop isn't in the store yet), cover the
  // screen with the loader — the native map surface must not mount underneath.
  if (coord == null || drop == null || dropLngLat == null || zoneFeature == null) {
    return <MapLoader />;
  }

  const distLabel = distM != null ? `${Math.round(distM)} m` : '— m';
  const zoneFillOpacity = beat === 'arrived' ? 0.18 : beat === 'range' ? 0.12 : 0.07;
  const zoneLineOpacity = beat === 'approach' ? 0.5 : 0.9;
  const footstepSpacing = footsteps.spacing;

  const status =
    beat === 'approach' ? (
      <MapStatus
        icon={<HeadingIcon size={16} />}
        kicker={`Walking · ${distLabel} away`}
        place={shortAddress ?? 'Locating…'}
        state="out of range"
        cold
      />
    ) : beat === 'range' ? (
      <MapStatus
        icon={<PinIcon size={16} strokeWidth={1.6} />}
        kicker="You stepped in"
        place={shortAddress ?? ''}
        state={`in range · ${distLabel}`}
      />
    ) : (
      <MapStatus
        icon={<PinIcon size={16} strokeWidth={1.6} />}
        kicker="You're standing on it"
        place={shortAddress ?? ''}
        state="you're here"
      />
    );

  return (
    <View style={styles.root}>
      <MaplibreView>
        {/* the 50 m unlock zone */}
        <GeoJSONSource id="walk-zone" data={zoneFeature}>
          <Layer
            id="walk-zone-fill"
            type="fill"
            paint={{ 'fill-color': colors.accent, 'fill-opacity': zoneFillOpacity }}
          />
          <Layer
            id="walk-zone-line"
            type="line"
            paint={{
              'line-color': colors.accent,
              'line-width': 1.6,
              'line-dasharray': [2, 3],
              'line-opacity': zoneLineOpacity,
            }}
          />
        </GeoJSONSource>

        {/* the walking route (street-following) */}
        {routeFeature ? (
          <GeoJSONSource id="walk-route" data={routeFeature}>
            <Layer
              id="walk-route-line"
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{
                'line-color': colors.accent,
                'line-width': 3,
                'line-dasharray': [0.6, 2],
                'line-opacity': 0.75,
              }}
            />
          </GeoJSONSource>
        ) : null}

        {/* footsteps along the route — faint ellipses tilted to follow the
            path, glowing solid at the feet and fading toward the target */}
        {footsteps.steps.map((s, i) => {
          const alongDist = (i + 1) * footstepSpacing;
          const lit = alongDist <= STEP_LIT_RANGE_M;
          const opacity = lit ? 1 - 0.45 * (alongDist / STEP_LIT_RANGE_M) : 0.85;
          return (
            <Marker key={`step-${i}`} id={`walk-step-${i}`} lngLat={[s.coord.lng, s.coord.lat]} anchor="center">
              <View
                style={[
                  styles.fstep,
                  lit && styles.fstepOn,
                  { opacity, transform: [{ rotate: `${s.headingDeg}deg` }] },
                ]}
              />
            </Marker>
          );
        })}

        {/* you, walking */}
        <Marker id="walk-user" lngLat={[coord.lng, coord.lat]} anchor="center">
          <View style={styles.userWrap}>
            {beat === 'range' ? <CrossRipple /> : null}
            <UserDot />
          </View>
        </Marker>

        {/* the buried secret */}
        <Marker id="walk-drop" lngLat={dropLngLat} anchor="center">
          <View style={styles.dropWrap}>
            <PulseRing
              size={48}
              fromScale={0.6}
              toScale={beat === 'approach' ? 2.6 : 3.4}
              peakOpacity={0.5}
              durationMs={ringPeriodMs}
              borderWidth={1.5}
              borderColor={colors.accent}
            />
            <SecretPin beat={beat} />
          </View>
        </Marker>

        {/* "50 m unlock zone" caption, floating above the pin */}
        {beat !== 'arrived' ? (
          <Marker key="walk-zone-label" id="walk-zone-label" lngLat={dropLngLat} anchor="bottom" offset={[0, -40]}>
            <View style={styles.uzLbl}>
              <Text style={styles.uzLblText}>50 m unlock zone</Text>
            </View>
          </Marker>
        ) : (
          <Marker key="walk-arrived" id="walk-arrived" lngLat={dropLngLat} anchor="top" offset={[0, 34]}>
            <Text style={styles.arrived}>you made it!</Text>
          </Marker>
        )}
      </MaplibreView>

      <View style={[styles.statusWrap, { top: insets.top + 10 }]}>{status}</View>

      <Pressable
        accessibilityLabel="Recenter on you and the secret"
        onPress={() => adapter.fitBounds([coord, drop], 96)}
        style={({ pressed }) => [
          styles.recenterFab,
          { bottom: insets.bottom + 150 },
          pressed && styles.pressed,
        ]}
      >
        <LocateIcon size={21} />
      </Pressable>

      {beat === 'approach' ? (
        <FindCard
          locked
          kicker="something's buried nearby…"
          title="Keep walking"
          meta={`${distLabel} away · out of range`}
          style={styles.findCard}
        />
      ) : beat === 'range' ? (
        <FindCard
          kicker="you crossed the line —"
          title="A secret is within 50 m"
          meta={`walk to the pin · ${secret ? _yearsAgo(secret.drop.createdAt) : ''}`}
          style={styles.findCard}
        />
      ) : (
        <FindCard
          kicker="you made it —"
          title="A secret was dropped here"
          meta={`right where you're standing · ${secret ? _yearsAgo(secret.drop.createdAt) : ''}`}
          onBreakSeal={() => navigation.navigate('Opening', { secretId })}
          style={styles.findCard}
        />
      )}
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
  userWrap: { alignItems: 'center', justifyContent: 'center' },
  dropWrap: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  uzLbl: {
    backgroundColor: colors.paperCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  uzLblText: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 8 * 0.24,
    textTransform: 'uppercase',
    color: colors.accentDeep,
  },
  secretPin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 10px 20px -6px rgba(86,110,91,0.7), inset 0 0 0 1px rgba(255,255,255,0.2)',
  },
  arrived: {
    fontFamily: fonts.handSemibold,
    fontSize: 24,
    color: colors.accentDeep,
    transform: [{ rotate: '-4deg' }],
  },
  // .fstep — faint, not-yet-walked: translucent sage with a soft ring.
  fstep: {
    width: 8,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(86,110,91,0.20)',
    borderWidth: 1,
    borderColor: 'rgba(86,110,91,0.28)',
  },
  // .fstep.on — lit, near the user: solid sage with a lifted shadow.
  fstepOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    boxShadow: '0 2px 5px -1px rgba(86,110,91,0.5)',
  },
  crossRipple: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: colors.accent,
  },
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
    boxShadow: '0 8px 16px -8px rgba(43,33,20,0.4)',
  },
  pressed: { opacity: 0.8 },
  statusWrap: { position: 'absolute', left: 16, right: 16, zIndex: 20 },
  findCard: { position: 'absolute', left: 16, right: 16, bottom: 12, zIndex: 20 },
});
