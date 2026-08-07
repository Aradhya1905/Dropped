/**
 * The walked route: a dotted sage trace with a short bright dash flowing
 * along it (`ROUTELINE` + `.rl-flow` animation). Stretched to the container
 * (`preserveAspectRatio="none"`), matching the design.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../../../design-system/tokens';
import { useLoopsActive, useReducedMotion } from '../../../design-system/tokens/motion';

const ROUTE = 'M252 664 Q 236 604 222 548 T 196 430 Q 184 360 173 292';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export function RouteLine() {
  const reduced = useReducedMotion();
  const loopsActive = useLoopsActive();
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced || !loopsActive) return;
    const loop = Animated.loop(
      Animated.timing(t, { toValue: 1, duration: 3400, useNativeDriver: false }),
    );
    loop.start();
    return () => loop.stop();
  }, [t, reduced, loopsActive]);

  return (
    <Svg
      style={StyleSheet.absoluteFill}
      width="100%"
      height="100%"
      viewBox="0 0 346 780"
      preserveAspectRatio="none"
      pointerEvents="none"
    >
      <Path
        d={ROUTE}
        stroke="rgba(86,110,91,0.32)"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeDasharray="1 9"
        fill="none"
      />
      {/*
        The flowing dash is pure decoration — the dotted trace above already
        draws the whole route. Reduced motion drops it rather than parking a
        bright stub somewhere arbitrary along the line.
      */}
      {!reduced && (
        <AnimatedPath
          d={ROUTE}
          stroke={colors.accent}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeDasharray="14 220"
          strokeDashoffset={t.interpolate({ inputRange: [0, 1], outputRange: [234, 0] })}
          opacity={0.7}
          fill="none"
        />
      )}
    </Svg>
  );
}
