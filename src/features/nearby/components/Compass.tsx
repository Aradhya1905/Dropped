/**
 * Hand-drawn compass: dotted dials, cardinal labels, and a sage needle.
 * Pass `rotation` (degrees, 0 = north) to point needle at a real bearing.
 * Omit `rotation` for the ambient sway fallback (no heading data yet).
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';

import { colors, fonts } from '../../../design-system/tokens';

const SIZE = 178;

interface CompassProps {
  /** Bearing from user → drop in degrees (0–360). Needle points here. */
  rotation?: number | null;
}

export function Compass({ rotation }: CompassProps) {
  const animated = useRef(new Animated.Value(0)).current;
  const lastRotation = useRef(rotation ?? 0);

  useEffect(() => {
    if (rotation == null) {
      // Fallback: gentle ambient sway
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(animated, {
            toValue: 1,
            duration: 2500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(animated, {
            toValue: 0,
            duration: 2500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }

    // Animate to new bearing, taking the shortest arc
    let delta = rotation - lastRotation.current;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    lastRotation.current = rotation;

    Animated.timing(animated, {
      toValue: rotation,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [rotation, animated]);

  const needleRotate =
    rotation == null
      ? animated.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] })
      : animated.interpolate({
          inputRange: [0, 360],
          outputRange: ['0deg', '360deg'],
          extrapolate: 'extend',
        });

  return (
    <View style={styles.stage}>
      <Svg width={SIZE} height={SIZE} viewBox="0 0 178 178" style={StyleSheet.absoluteFill}>
        <Circle cx={89} cy={89} r={78} stroke={colors.lineSoft} strokeWidth={1} strokeDasharray="1 4.4" fill="none" />
        <Circle cx={89} cy={89} r={68} stroke={colors.line} strokeWidth={1.5} strokeDasharray="1.5 7" fill="none" />
        <SvgText x={89} y={26} textAnchor="middle" fill={colors.accentDeep} fontSize={10} fontFamily={fonts.mono} letterSpacing={1}>
          N
        </SvgText>
        <SvgText x={89} y={160} textAnchor="middle" fill={colors.inkFaint} fontSize={10} fontFamily={fonts.mono} letterSpacing={1}>
          S
        </SvgText>
        <SvgText x={20} y={93} textAnchor="middle" fill={colors.inkFaint} fontSize={10} fontFamily={fonts.mono} letterSpacing={1}>
          W
        </SvgText>
        <SvgText x={158} y={93} textAnchor="middle" fill={colors.inkFaint} fontSize={10} fontFamily={fonts.mono} letterSpacing={1}>
          E
        </SvgText>
      </Svg>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ rotate: needleRotate }] },
        ]}
      >
        <Svg width={SIZE} height={SIZE} viewBox="0 0 178 178">
          <Path d="M89 89 L150 89 L120 74 Z" fill={colors.accent} />
          <Path d="M89 89 L150 89 L120 104 Z" fill={colors.accent} />
          <Path d="M89 89 L40 89 L60 80 Z" fill={colors.accentTint} />
          <Path d="M89 89 L40 89 L60 98 Z" fill={colors.accentTint} />
        </Svg>
      </Animated.View>
      <Svg width={SIZE} height={SIZE} viewBox="0 0 178 178" style={StyleSheet.absoluteFill} pointerEvents="none">
        <Circle cx={89} cy={89} r={7} fill={colors.accent} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { width: SIZE, height: SIZE, alignSelf: 'center', marginTop: 14, marginBottom: 4 },
});
