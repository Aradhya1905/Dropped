/**
 * 04a/b/c — walking a secret into range, in three beats: out of range,
 * crossing the 50 m line, then standing right on top of it.
 * Tap the map to take the next steps; on arrival, break the seal.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutAnimation,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type {
  MainTabParamList,
  MapStackParamList,
  RootStackParamList,
  WalkBeat,
} from '../../../app/navigation/types';
import { PaperScreen, PulseRing } from '../../../design-system/components';
import { HeadingIcon, LockIcon, PinIcon } from '../../../design-system/icons';
import { colors, fonts } from '../../../design-system/tokens';
import { FindCard } from '../components/FindCard';
import { MapStatus } from '../components/MapStatus';
import { RouteLine } from '../components/RouteLine';
import { RouteMap } from '../components/RouteMap';

type Props = CompositeScreenProps<
  NativeStackScreenProps<MapStackParamList, 'Walk'>,
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, 'MapTab'>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

// All coordinates live in the design's 346×780 screen space; converted to
// percentages so they track the stretched route line on any device.
const pctX = (x: number) => `${(x / 346) * 100}%` as const;
const pctY = (y: number) => `${(y / 780) * 100}%` as const;

const FOOTSTEPS: Array<[number, number]> = [
  [250, 638],
  [236, 590],
  [224, 544],
  [212, 486],
  [200, 430],
  [187, 372],
  [177, 326],
];

const BEATS: Record<WalkBeat, { stepsOn: number; walker: [number, number] }> = {
  approach: { stepsOn: 2, walker: [236, 590] },
  range: { stepsOn: 5, walker: [193, 388] },
  arrived: { stepsOn: 7, walker: [177, 330] },
};

const ZONE_CENTER: [number, number] = [173, 288];

/** Zero-size anchor at a design-space point; children center on it. */
function Anchor({
  at,
  zIndex,
  children,
}: {
  at: [number, number];
  zIndex?: number;
  children: React.ReactNode;
}) {
  return (
    <View pointerEvents="none" style={[styles.anchor, { left: pctX(at[0]), top: pctY(at[1]), zIndex }]}>
      {children}
    </View>
  );
}

/** The buried secret's wax pin — grows and shakes as you arrive. */
function SecretPin({ beat }: { beat: WalkBeat }) {
  const shake = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (beat !== 'arrived') {
      return;
    }
    // sealShake: rest, then a quick -7° / +6° rattle every 2.8s
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

  const scale = beat === 'approach' ? 0.78 : beat === 'arrived' ? 1.16 : 1;
  return (
    <Animated.View
      style={[
        styles.secretPin,
        {
          opacity: beat === 'approach' ? 0.85 : 1,
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

/** Expanding ripple where you crossed into the zone (`.cross-ripple`). */
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
  const [beat, setBeat] = useState<WalkBeat>(route.params?.beat ?? 'approach');
  const cfg = BEATS[beat];

  const advance = () => {
    LayoutAnimation.configureNext(LayoutAnimation.create(600, 'easeInEaseOut', 'opacity'));
    setBeat(b => (b === 'approach' ? 'range' : 'arrived'));
  };

  const status =
    beat === 'approach' ? (
      <MapStatus
        icon={<HeadingIcon size={16} />}
        kicker="Walking · 88 steps"
        place="Bedford Ave"
        state="out of range"
        cold
      />
    ) : beat === 'range' ? (
      <MapStatus
        icon={<PinIcon size={16} strokeWidth={1.6} />}
        kicker="You stepped in"
        place="Bedford & N 7th"
        state="in range · 50 m"
      />
    ) : (
      <MapStatus
        icon={<PinIcon size={16} strokeWidth={1.6} />}
        kicker="You're standing on it"
        place="Bedford & N 7th"
        state="you're here"
      />
    );

  return (
    <PaperScreen>
      <Pressable style={StyleSheet.absoluteFill} onPress={beat === 'arrived' ? undefined : advance}>
        <RouteMap />
        <RouteLine />

        {/* the 50 m unlock zone */}
        <Anchor at={ZONE_CENTER} zIndex={3}>
          <View
            style={[
              styles.uzone,
              beat === 'approach' && styles.uzoneFaint,
              beat === 'range' && styles.uzoneWake,
              beat === 'arrived' && styles.uzoneHere,
            ]}
          >
            <Svg width={212} height={212} style={StyleSheet.absoluteFill}>
              <Defs>
                <RadialGradient id="uzoneGrad" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={colors.accent} stopOpacity={0.14} />
                  <Stop
                    offset="0.7"
                    stopColor={colors.accent}
                    stopOpacity={beat === 'arrived' ? 0.08 : 0.04}
                  />
                  <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={106} cy={106} r={105} fill="url(#uzoneGrad)" />
            </Svg>
          </View>
        </Anchor>
        <Anchor at={ZONE_CENTER} zIndex={4}>
          {[0, 1150, 2300].map(delay => (
            <PulseRing
              key={delay}
              size={56}
              fromScale={0.5}
              toScale={3}
              peakOpacity={0.6}
              durationMs={beat === 'approach' ? 5000 : 3400}
              delayMs={delay}
              borderWidth={1.5}
              borderColor={colors.accent}
            />
          ))}
        </Anchor>
        <Anchor at={[ZONE_CENTER[0], ZONE_CENTER[1] - 122]} zIndex={6}>
          <View style={styles.uzLbl}>
            <Text style={styles.uzLblText}>50 m unlock zone</Text>
          </View>
        </Anchor>
        <Anchor at={ZONE_CENTER} zIndex={6}>
          <SecretPin beat={beat} />
        </Anchor>
        {beat === 'arrived' ? (
          <Anchor at={[173, 204]} zIndex={9}>
            <Text style={styles.arrived}>you made it!</Text>
          </Anchor>
        ) : null}

        {/* footsteps along the route */}
        {FOOTSTEPS.map(([x, y], i) => (
          <View
            key={i}
            pointerEvents="none"
            style={[styles.fstep, { left: pctX(x), top: pctY(y) }, i < cfg.stepsOn && styles.fstepOn]}
          />
        ))}

        {/* you, walking */}
        {beat === 'range' ? (
          <Anchor at={cfg.walker} zIndex={7}>
            <CrossRipple />
          </Anchor>
        ) : null}
        <Anchor at={cfg.walker} zIndex={8}>
          <PulseRing
            size={44}
            fromScale={0.6}
            toScale={1.6}
            peakOpacity={0.5}
            durationMs={2600}
            borderWidth={2}
            borderColor={colors.accent}
          />
          <View style={styles.walker}>
            <View style={styles.walkerDot} />
          </View>
        </Anchor>
        <Anchor at={cfg.walker} zIndex={9}>
          <View style={styles.distPillWrap}>
            <View style={styles.distPill}>
              {beat === 'approach' ? (
                <Text style={styles.distText}>
                  <Text style={styles.distEm}>78 m</Text> to go
                </Text>
              ) : beat === 'range' ? (
                <Text style={styles.distText}>
                  you're <Text style={styles.distEm}>in range</Text>
                </Text>
              ) : (
                <Text style={styles.distText}>
                  <Text style={styles.distEm}>0 m</Text> · you're here
                </Text>
              )}
            </View>
            <View style={styles.distCaret} />
          </View>
        </Anchor>
      </Pressable>

      <View style={[styles.statusWrap, { top: insets.top + 10 }]}>{status}</View>

      {beat === 'approach' ? (
        <FindCard
          locked
          kicker="something's buried nearby…"
          title="Keep walking"
          meta="78 m away · out of range"
          style={styles.findCard}
        />
      ) : beat === 'range' ? (
        <FindCard
          kicker="you crossed the line —"
          title="A secret is within 50 m"
          meta="walk to the pin · dropped 4 years ago"
          style={styles.findCard}
        />
      ) : (
        <FindCard
          kicker="you made it —"
          title="A secret was dropped here"
          meta="right where you're standing · 4 years ago"
          onBreakSeal={() => navigation.navigate('Opening')}
          style={styles.findCard}
        />
      )}
    </PaperScreen>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'absolute', width: 0, height: 0, alignItems: 'center', justifyContent: 'center' },
  uzone: {
    width: 212,
    height: 212,
    borderRadius: 106,
    borderWidth: 1.6,
    borderStyle: 'dashed',
    borderColor: colors.accent,
    overflow: 'hidden',
  },
  uzoneFaint: { opacity: 0.5 },
  uzoneWake: { boxShadow: '0 0 36px -6px rgba(118,149,124,0.4)' },
  uzoneHere: { boxShadow: '0 0 50px -4px rgba(118,149,124,0.45)' },
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
  fstep: {
    position: 'absolute',
    width: 8,
    height: 12,
    marginLeft: -4,
    marginTop: -6,
    borderRadius: 6,
    backgroundColor: 'rgba(86,110,91,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(86,110,91,0.25)',
    zIndex: 4,
  },
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
  walker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 0 0 4px ${colors.paperCard}, 0 4px 10px -2px rgba(43,33,20,0.5)`,
  },
  walkerDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.accent },
  distPillWrap: { position: 'absolute', bottom: 16, alignItems: 'center' },
  distPill: {
    backgroundColor: colors.paperCard,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingVertical: 5,
    paddingHorizontal: 10,
    boxShadow: '0 8px 16px -8px rgba(43,33,20,0.45)',
  },
  distText: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 10 * 0.06, color: colors.ink },
  distEm: { fontFamily: fonts.monoMedium, color: colors.accentDeep },
  distCaret: {
    width: 9,
    height: 9,
    marginTop: -5,
    backgroundColor: colors.paperCard,
    transform: [{ rotate: '45deg' }],
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.lineSoft,
  },
  statusWrap: { position: 'absolute', left: 16, right: 16, zIndex: 20 },
  findCard: { position: 'absolute', left: 16, right: 16, bottom: 12, zIndex: 20 },
});
