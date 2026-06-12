/**
 * A pressed wax seal: sage radial gradient (`circle at 36% 30%, accent →
 * accent-deep 82%`), soft drop shadow, faint white inner ring. The signature
 * mark of the app — stamps on notes, FABs, map pins, the passport.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { colors, shadows } from '../tokens';

let sealGradientSeq = 0;

export interface WaxSealProps {
  size?: number;
  /** Resting rotation, like the CSS `transform: rotate(…)`. */
  rotate?: number;
  /** Loop the `stampPulse` squash (used on tappable seals). */
  pulse?: boolean;
  /** Use the bigger FAB shadow. */
  shadow?: 'seal' | 'sealLarge';
  /** The embossed glyph, centered. */
  children?: React.ReactNode;
  /** When set, the seal becomes a button (the stamp FABs). */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function WaxSeal({
  size = 46,
  rotate = 0,
  pulse = false,
  shadow = 'seal',
  children,
  onPress,
  style,
}: WaxSealProps) {
  const gradId = useRef(`waxGrad${sealGradientSeq++}`).current;
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!pulse) {
      return;
    }
    // stampPulse: rest …88%, dip to .92 at 94%, back — over 3.4s
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(2992),
        Animated.timing(t, { toValue: 1, duration: 204, useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 204, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, t]);

  const seal = (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          boxShadow: `${shadows[shadow]}, inset 0 0 0 1px rgba(255,255,255,0.18)`,
          transform: [
            { rotate: `${rotate}deg` },
            { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] }) },
          ],
        },
        styles.center,
        onPress ? undefined : style,
      ]}
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={gradId} cx="36%" cy="30%" r="82%">
            <Stop offset="0" stopColor={colors.accent} />
            <Stop offset="0.82" stopColor={colors.accentDeep} />
            <Stop offset="1" stopColor={colors.accentDeep} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${gradId})`} />
      </Svg>
      <View style={styles.center}>{children}</View>
    </Animated.View>
  );

  if (!onPress) {
    return seal;
  }
  return (
    <Pressable onPress={onPress} hitSlop={6} style={({ pressed }) => [pressed && styles.pressed, style]}>
      {seal}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.85 },
});
