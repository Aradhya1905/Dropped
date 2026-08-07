/**
 * 00 Splash — "Splash 04 · Editorial" from the design (Dropped Splash export).
 *
 * Warm-paper launch screen: a spaced-mono "FIELD NOTES" kicker over the serif
 * italic "Dropped" wordmark (letters rise in, then the sage underline draws),
 * a left-aligned tagline, and a footer that fades up with a "locating you"
 * loader. The native react-native-bootsplash (same paper ground) sits under
 * this for the cold-start frame and is faded out once we paint, so the handoff
 * is seamless. After the intro plays we reset to onboarding / main.
 *
 * Animations run on the core Animated API (no reanimated yet), matching the
 * design CSS keyframes: kicker/footer `fadeUp`, per-letter `chRise`
 * (delay 0.42s + 0.06s/letter), underline `edDraw` (stroke-dashoffset 300→0,
 * delay 1.05s), the looping load bar and the pulsing locate dot.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { consumePendingSpot } from '../../../app/navigation/linking';
import type { RootStackParamList } from '../../../app/navigation/types';
import { FadeUp, PaperScreen } from '../../../design-system/components';
import { colors, fonts, isReducedMotion } from '../../../design-system/tokens';
import { hideNativeSplash } from '../../../services/splash';
import { getOnboardingComplete } from '../../../services/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const WORD = 'Dropped';
const settle = Easing.bezier(0.2, 0.78, 0.25, 1);
const AnimatedPath = Animated.createAnimatedComponent(Path);

// How long the intro plays before we hand off to the first real screen. The
// footer fades up at 1.7s; this leaves a beat after it lands.
const HOLD_MS = 3000;
// edDraw: stroke-dasharray/offset 300, 1.1s with a 1.05s delay.
const DASH = 300;

export function SplashScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  // Per-letter rise (chRise: opacity + 16px), the underline draw, and the
  // looping loader fill + locate-dot pulse.
  const letters = useRef(WORD.split('').map(() => new Animated.Value(0))).current;
  const draw = useRef(new Animated.Value(0)).current;
  const fill = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade the native paper bootsplash out now that this (also paper) is up.
    hideNativeSplash();

    // Read synchronously rather than via `useReducedMotion`: this effect also
    // owns the hand-off timer, and re-running it because a setting flipped
    // would restart the splash hold.
    const reduced = isReducedMotion();
    if (reduced) {
      // Straight to the finished frame — wordmark set, underline drawn, loader
      // full — then hold for the same beat so the hand-off timing is unchanged.
      for (const v of letters) v.setValue(1);
      draw.setValue(1);
      fill.setValue(1);
      pulse.setValue(0);

      const next = getOnboardingComplete() ? 'Main' : 'Welcome';
      const holdTimer = setTimeout(() => {
        if (consumePendingSpot()) return;
        navigation.reset({ index: 0, routes: [{ name: next }] });
      }, HOLD_MS);
      return () => clearTimeout(holdTimer);
    }

    const letterAnims = letters.map((v, i) =>
      Animated.timing(v, {
        toValue: 1,
        duration: 900,
        delay: 420 + i * 60,
        easing: settle,
        useNativeDriver: true,
      }),
    );
    Animated.parallel([
      ...letterAnims,
      Animated.timing(draw, {
        toValue: 1,
        duration: 1100,
        delay: 1050,
        easing: Easing.bezier(0.6, 0.1, 0.2, 1),
        useNativeDriver: false, // strokeDashoffset isn't a transform/opacity
      }),
    ]).start();

    // loadFill 5.6s: 0 → 16% → 64% → 96% → 100%, looping.
    const fillLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(fill, {
          toValue: 1,
          duration: 5600,
          easing: Easing.bezier(0.45, 0.05, 0.2, 1),
          useNativeDriver: false,
        }),
        Animated.timing(fill, { toValue: 0, duration: 0, useNativeDriver: false }),
      ]),
    );
    // locDot 1.9s ring pulse, looping.
    const pulseLoop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1900,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    fillLoop.start();
    pulseLoop.start();

    const next = getOnboardingComplete() ? 'Main' : 'Welcome';
    const timer = setTimeout(() => {
      // A shared spot link parked during the intro wins over the normal
      // handoff — it resets to [Main, SecretDetail] itself. It returns false
      // (and stays parked) when there is no link, or when onboarding hasn't
      // run yet, in which case the Location screen consumes it instead.
      if (consumePendingSpot()) return;
      navigation.reset({ index: 0, routes: [{ name: next }] });
    }, HOLD_MS);

    return () => {
      clearTimeout(timer);
      fillLoop.stop();
      pulseLoop.stop();
    };
  }, [letters, draw, fill, pulse, navigation]);

  const fillWidth = fill.interpolate({
    inputRange: [0, 0.14, 0.5, 0.82, 0.92, 1],
    outputRange: ['0%', '16%', '64%', '96%', '100%', '100%'],
  });

  return (
    <PaperScreen style={styles.root}>
      <View style={styles.center}>
        <FadeUp delay={250} style={styles.kicker}>
          <View style={styles.dot} />
          <Text style={styles.kickerText}>FIELD NOTES</Text>
        </FadeUp>

        <View style={styles.mark}>
          {WORD.split('').map((ch, i) => (
            <Animated.Text
              key={`${ch}-${i}`}
              style={[
                styles.markChar,
                {
                  opacity: letters[i],
                  transform: [
                    {
                      translateY: letters[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [16, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {ch}
            </Animated.Text>
          ))}
        </View>

        <Svg
          width={236}
          height={18}
          viewBox="0 0 236 18"
          preserveAspectRatio="none"
          style={styles.underline}
        >
          <AnimatedPath
            d="M4 11C46 4 104 3 150 6c30 2 58 1 82-3"
            fill="none"
            stroke={colors.accent}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={DASH}
            strokeDashoffset={draw.interpolate({
              inputRange: [0, 1],
              outputRange: [DASH, 0],
            })}
          />
        </Svg>

        <FadeUp delay={950}>
          <Text style={styles.tag}>The city, read where it happened.</Text>
        </FadeUp>
      </View>

      <FadeUp delay={1700} style={[styles.foot, { bottom: insets.bottom + 44 }]}>
        <View style={styles.locating}>
          <View style={styles.locWrap}>
            <Animated.View
              style={[
                styles.locRing,
                {
                  opacity: pulse.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.45, 0, 0],
                  }),
                  transform: [
                    { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 3] }) },
                  ],
                },
              ]}
            />
            <View style={styles.locDot} />
          </View>
          <Text style={styles.locText}>LOCATING YOU</Text>
        </View>
        <View style={styles.track}>
          <Animated.View style={[styles.trackFill, { width: fillWidth }]} />
        </View>
        <Text style={styles.stampBy}>ANONYMOUS · WITHIN 50 M</Text>
      </FadeUp>
    </PaperScreen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // .splash.ed — centered column, padding 74 top / 34 sides.
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 74,
    paddingHorizontal: 34,
  },

  // .ed-kicker
  kicker: { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, marginRight: 10 },
  kickerText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 10 * 0.34,
    color: colors.accentDeep,
  },

  // .ed-mark (serif italic 80 / line-height .94 / -.02em)
  mark: { flexDirection: 'row' },
  markChar: {
    fontFamily: fonts.serifItalic,
    fontSize: 80,
    lineHeight: 80 * 0.94,
    letterSpacing: 80 * -0.02,
    color: colors.ink,
  },

  // .ed-underline — left-aligned under the mark.
  underline: { alignSelf: 'flex-start', marginTop: 4, marginLeft: 3, overflow: 'visible' },

  // .ed-tag (serif italic 300 / 22 / 1.42) left-aligned, max 300.
  tag: {
    fontFamily: fonts.serifLightItalic,
    fontSize: 22,
    lineHeight: 22 * 1.42,
    color: colors.inkSoft,
    marginTop: 26,
    maxWidth: 300,
    alignSelf: 'flex-start',
  },

  // .splash-foot
  foot: {
    position: 'absolute',
    left: 30,
    right: 30,
    alignItems: 'center',
  },
  locating: { flexDirection: 'row', alignItems: 'center' },
  locWrap: {
    width: 6,
    height: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  locRing: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  locDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  locText: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 9.5 * 0.28,
    color: colors.inkFaint,
  },
  track: {
    width: 150,
    height: 2,
    borderRadius: 2,
    backgroundColor: colors.lineSoft,
    overflow: 'hidden',
    marginTop: 16,
  },
  trackFill: { height: 2, borderRadius: 2, backgroundColor: colors.accent },
  stampBy: {
    fontFamily: fonts.mono,
    fontSize: 8.5,
    letterSpacing: 8.5 * 0.22,
    color: colors.inkFaint,
    opacity: 0.8,
    marginTop: 16,
  },
});
