/**
 * Ambient animation primitives shared across screens, recreated from the
 * design CSS keyframes (`dropped.css`) with the core Animated API:
 * - FadeUp     → `fadeUp` entrance (opacity + 12px rise, staggered)
 * - FloatBob   → `floatA/floatB/bob1/bob2` idle bobbing of paper notes/pins
 * - PulseRing  → `ringPulse`/`rangePulse` expanding sonar rings
 *
 * **Reduced motion stops these, it does not slow them.** Each helper below has
 * an explicit static branch that renders the value the animation would have
 * ended on: `FadeUp` at full opacity in place, `FloatBob` at rest, `PulseRing`
 * as one still ring. A reduced-motion path that merely shortens a duration is
 * still a loop, and a loop is the thing that makes some people ill — so the
 * branch is structural, not a `duration: 0`.
 *
 * Loops additionally pause while their screen is unfocused or the app is
 * backgrounded (`useLoopsActive`), which is a battery win rather than an
 * accessibility one. Pausing and stopping are different: a paused loop resumes
 * where it was, a reduced-motion loop never starts.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';

import { motion, useLoopsActive, useReducedMotion } from '../tokens/motion';

const settle = Easing.bezier(0.2, 0.75, 0.25, 1);

/** One-time entrance: rise 12px + fade in, like the design's `.fade-up`. */
export function FadeUp({
  delay = 0,
  duration = motion.entrance,
  children,
  style,
}: {
  delay?: number;
  duration?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  // Start already-arrived when motion is off, so nothing is invisible for even
  // one frame while the effect below decides not to run.
  const t = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      // Covers the mid-life flip (a user turning the setting on while this is
      // on screen): jump to the end rather than freezing part-way through.
      t.setValue(1);
      return;
    }
    const anim = Animated.timing(t, {
      toValue: 1,
      duration,
      delay,
      easing: settle,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [t, delay, duration, reduced]);

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
  duration = motion.bob,
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
  const reduced = useReducedMotion();
  const loopsActive = useLoopsActive();
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      // Rest is `t = 0`: no vertical drift, sitting at the base rotation. The
      // note keeps its hand-pinned tilt — that's layout, not motion.
      t.setValue(0);
      return;
    }
    if (!loopsActive) return;

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
  }, [t, duration, reduced, loopsActive]);

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

/**
 * Resting scale for a stopped ring.
 *
 * A sonar ring's job is to mark a radius, and a stack of them exists only to
 * animate. Stopped, one ring is drawn at its **full extent** — the radius is the
 * information, the pulsing is the decoration — and `PulseRingStack` renders only
 * the first of them so reduced motion gets one clean circle, not three
 * overlapping ones.
 */
const STATIC_OPACITY_FACTOR = 0.8;

/** One expanding sonar ring; stack several with staggered delays. */
export function PulseRing({
  size,
  fromScale = 0.28,
  toScale = 1,
  peakOpacity = 0.55,
  durationMs = motion.ring,
  delayMs = 0,
  borderWidth = 1,
  borderColor,
  dashed = false,
}: PulseRingProps) {
  const reduced = useReducedMotion();
  const loopsActive = useLoopsActive();
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced || !loopsActive) return;
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
  }, [t, durationMs, delayMs, reduced, loopsActive]);

  const shared = {
    position: 'absolute',
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth,
    borderColor,
    borderStyle: dashed ? 'dashed' : 'solid',
  } as const;

  if (reduced) {
    // Static values, not interpolations: there is no `t` to read from, so the
    // ring simply sits at its full radius.
    return (
      <Animated.View
        pointerEvents="none"
        style={{
          ...shared,
          opacity: peakOpacity * STATIC_OPACITY_FACTOR,
          transform: [{ scale: toScale }],
        }}
      />
    );
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        ...shared,
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

/**
 * Several rings on staggered delays — the usual way `PulseRing` is used.
 *
 * Exists so the reduced-motion case has somewhere to collapse: three stacked
 * rings frozen at the same radius would just draw one thick circle, so this
 * renders a single ring instead.
 */
export function PulseRingStack({
  count = 3,
  staggerMs,
  ...ring
}: PulseRingProps & { count?: number; staggerMs?: number }) {
  const reduced = useReducedMotion();
  const gap = staggerMs ?? (ring.durationMs ?? motion.ring) / count;
  const rings = reduced ? 1 : count;

  return (
    <>
      {Array.from({ length: rings }, (_, i) => (
        <PulseRing key={i} {...ring} delayMs={(ring.delayMs ?? 0) + i * gap} />
      ))}
    </>
  );
}
