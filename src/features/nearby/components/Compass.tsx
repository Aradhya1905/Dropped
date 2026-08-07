/**
 * Hand-drawn compass: dotted dials, cardinal labels, and a sage needle.
 * Pass `rotation` (degrees, 0 = north) to point needle at a real bearing.
 * Omit `rotation` for the ambient sway fallback (no heading data yet).
 *
 * Far from a drop the bearing handed in is deliberately a lie that drifts every
 * few seconds (`hooks/useNeedleWobble`) — this component doesn't know or care,
 * it just tweens to whatever it's given. `tweenMs` is how the caller asks for a
 * heavy needle at long range and a crisp one up close.
 *
 * **One `Animated.Value` drives the transform, always.** The sway branch and the
 * bearing branch share it; a second value over the same `transform: [{ rotate }]`
 * is how this gets janky.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';

import { colors, fonts } from '../../../design-system/tokens';

const SIZE = 178;

interface CompassProps {
  /** Bearing from user → drop in degrees (0–360). Needle points here. */
  rotation?: number | null;
  /** How long to take getting there. Longer = heavier needle. */
  tweenMs?: number;
}

export function Compass({ rotation, tweenMs = 300 }: CompassProps) {
  const animated = useRef(new Animated.Value(0)).current;
  /**
   * The value the needle is heading for, in *unwrapped* degrees: it accumulates
   * past 360 (and below 0) so that turning from 359° to 1° is a +2° move rather
   * than a −358° spin. `null` while the sway branch owns the value, since that
   * branch drives it in 0…1 instead.
   */
  const targetDeg = useRef<number | null>(null);
  // Read through a ref so changing the duration doesn't restart the animation
  // mid-swing — only a new bearing may do that.
  const tweenRef = useRef(tweenMs);
  tweenRef.current = tweenMs;

  useEffect(() => {
    if (rotation == null) {
      // Fallback: gentle ambient sway
      targetDeg.current = null;
      animated.setValue(0);
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

    // First bearing after the sway (or on mount): snap, don't sweep in from
    // north — nobody asked to watch the needle travel to where it always was.
    if (targetDeg.current == null) {
      targetDeg.current = rotation;
      animated.setValue(rotation);
      return;
    }

    // Animate to the new bearing, taking the shortest arc: compare against the
    // current target wrapped back into 0–360, then apply the delta to the
    // unwrapped target so the tween itself never crosses the 0/360 seam.
    const wrapped = ((targetDeg.current % 360) + 360) % 360;
    let delta = rotation - wrapped;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    targetDeg.current += delta;

    Animated.timing(animated, {
      toValue: targetDeg.current,
      duration: tweenRef.current,
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
