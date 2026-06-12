/**
 * Ambient animation primitives shared across screens, recreated from the
 * design CSS keyframes (`dropped.css`) with the core Animated API:
 * - FadeUp     → `fadeUp` entrance (opacity + 12px rise, staggered)
 * - FloatBob   → `floatA/floatB/bob1/bob2` idle bobbing of paper notes/pins
 * - PulseRing  → `ringPulse`/`rangePulse` expanding sonar rings
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';

const settle = Easing.bezier(0.2, 0.75, 0.25, 1);

/** One-time entrance: rise 12px + fade in, like the design's `.fade-up`. */
export function FadeUp({
  delay = 0,
  duration = 1000,
  children,
  style,
}: {
  delay?: number;
  duration?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      duration,
      delay,
      easing: settle,
      useNativeDriver: true,
    }).start();
  }, [t, delay, duration]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: t,
          transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Idle bob: rotates around a base angle while drifting vertically, looping
 * forever (the floating notes / sealed pins).
 */
export function FloatBob({
  rotate = 0,
  deltaRotate = -1,
  deltaY = -9,
  duration = 9000,
  style,
  children,
}: {
  /** Resting rotation in degrees. */
  rotate?: number;
  /** Extra rotation at the apex of the bob. */
  deltaRotate?: number;
  /** Vertical travel in px (negative floats up). */
  deltaY?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, {
          toValue: 1,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(t, {
          toValue: 0,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, duration]);

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, deltaY] }) },
            {
              rotate: t.interpolate({
                inputRange: [0, 1],
                outputRange: [`${rotate}deg`, `${rotate + deltaRotate}deg`],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export interface PulseRingProps {
  /** Diameter the ring grows to (it is centered in its parent). */
  size: number;
  /** Scale it starts from (`ringPulse` ≈ 0.28, `rangePulse` ≈ 0.5). */
  fromScale?: number;
  /** Scale it grows to (1 for `ringPulse`, 3 for `rangePulse`). */
  toScale?: number;
  /** Peak opacity early in the cycle. */
  peakOpacity?: number;
  durationMs?: number;
  delayMs?: number;
  borderWidth?: number;
  borderColor?: string;
  dashed?: boolean;
}

/** One expanding sonar ring; stack several with staggered delays. */
export function PulseRing({
  size,
  fromScale = 0.28,
  toScale = 1,
  peakOpacity = 0.55,
  durationMs = 4400,
  delayMs = 0,
  borderWidth = 1,
  borderColor,
  dashed = false,
}: PulseRingProps) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delayMs),
        Animated.timing(t, {
          toValue: 1,
          duration: durationMs,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, durationMs, delayMs]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth,
        borderColor,
        borderStyle: dashed ? 'dashed' : 'solid',
        opacity: t.interpolate({
          inputRange: [0, 0.14, 1],
          outputRange: [0, peakOpacity, 0],
        }),
        transform: [
          { scale: t.interpolate({ inputRange: [0, 1], outputRange: [fromScale, toScale] }) },
        ],
      }}
    />
  );
}
