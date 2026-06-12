/**
 * The walked route: a dotted sage trace with a short bright dash flowing
 * along it (`ROUTELINE` + `.rl-flow` animation). Stretched to the container
 * (`preserveAspectRatio="none"`), matching the design.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../../../design-system/tokens';

const ROUTE = 'M252 664 Q 236 604 222 548 T 196 430 Q 184 360 173 292';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export function RouteLine() {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(t, { toValue: 1, duration: 3400, useNativeDriver: false }),
    );
    loop.start();
    return () => loop.stop();
  }, [t]);

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
    </Svg>
  );
}
