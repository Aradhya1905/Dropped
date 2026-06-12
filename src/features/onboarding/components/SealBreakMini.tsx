/**
 * The little wax seal that cracks in two on a 6s loop (`.seal-break` in the
 * "Three simple rules" ticket): both halves lever apart while a sage glow
 * blooms behind the crack.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors } from '../../../design-system/tokens';

const SIZE = 26;

function Half() {
  return (
    <Svg width={SIZE} height={SIZE}>
      <Circle cx={13} cy={13} r={9.2} fill={colors.accent} />
      <Circle cx={13} cy={13} r={4} fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth={1.3} />
    </Svg>
  );
}

export function SealBreakMini({ scale = 1 }: { scale?: number }) {
  // 0 → closed, 1 → cracked. Timeline (of 6s): rest to 55%, crack by 72%,
  // hold to 90%, snap shut by 100%.
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(3300),
        Animated.timing(t, {
          toValue: 1,
          duration: 1020,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(1080),
        Animated.timing(t, {
          toValue: 0,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t]);

  const glowOpacity = t.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] });

  return (
    <View style={[styles.stage, { transform: [{ scale }] }]}>
      <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />
      <Animated.View
        style={[
          styles.half,
          styles.left,
          {
            transform: [
              { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) },
              { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-13deg'] }) },
            ],
          },
        ]}
      >
        <Half />
      </Animated.View>
      <Animated.View
        style={[
          styles.half,
          styles.right,
          {
            transform: [
              { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, 2] }) },
              { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '13deg'] }) },
            ],
          },
        ]}
      >
        <View style={styles.shiftRight}>
          <Half />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { width: SIZE, height: SIZE },
  glow: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderRadius: SIZE / 2,
    backgroundColor: colors.accent,
    // a blur stand-in: the glow is just a soft tinted disc
    boxShadow: `0 0 10px 4px ${colors.accentTint}`,
  },
  half: { position: 'absolute', top: 0, width: SIZE / 2, height: SIZE, overflow: 'hidden' },
  left: { left: 0 },
  right: { right: 0 },
  shiftRight: { marginLeft: -SIZE / 2 },
});
