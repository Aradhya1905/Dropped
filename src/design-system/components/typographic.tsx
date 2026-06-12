/**
 * Small typographic set-pieces shared by the "fun" screens:
 * - FunKicker     — tilted handwritten lead-in (`.fun-kicker`, `.psst`)
 * - HandUnderline — the hand-drawn sage underline stroke
 * - FunTitle      — serif display title with the underline beneath
 * - MetaFoot      — spaced mono micro-caption (`.meta-foot`)
 */
import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, fonts } from '../tokens';

export function FunKicker({
  children,
  size = 22,
  rotate = -2,
  centered = false,
  style,
}: {
  children: React.ReactNode;
  size?: number;
  rotate?: number;
  centered?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      style={[
        styles.kicker,
        { fontSize: size, lineHeight: size * 1.1, transform: [{ rotate: `${rotate}deg` }] },
        centered && styles.centered,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/** The wobbling sage underline. Two cuts exist in the design. */
export function HandUnderline({
  width = 170,
  height = 14,
  variant = 'title',
  style,
}: {
  width?: number;
  height?: number;
  variant?: 'title' | 'wordmark';
  style?: StyleProp<ViewStyle>;
}) {
  const d =
    variant === 'wordmark'
      ? 'M3 9c40-7 92-8 142-4 30 2 58 1 82-3'
      : 'M3 8c34-6 78-7 120-4 22 1 36 0 44-2';
  const viewBox = variant === 'wordmark' ? '0 0 230 16' : '0 0 170 14';
  return (
    <View style={[{ width, height }, style]}>
      <Svg width={width} height={height} viewBox={viewBox} preserveAspectRatio="none">
        <Path d={d} stroke={colors.accent} strokeWidth={4} strokeLinecap="round" fill="none" />
      </Svg>
    </View>
  );
}

export function FunTitle({
  children,
  size = 36,
  underlineWidth = 170,
  centered = false,
  style,
}: {
  children: React.ReactNode;
  size?: number;
  underlineWidth?: number;
  centered?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[centered && styles.centerItems, style]}>
      <Text
        style={[
          styles.title,
          { fontSize: size, lineHeight: size * 1.02, letterSpacing: size * -0.02 },
          centered && styles.centered,
        ]}
      >
        {children}
      </Text>
      <HandUnderline width={underlineWidth} style={styles.underline} />
    </View>
  );
}

export function MetaFoot({
  children,
  align = 'center',
  style,
}: {
  children: React.ReactNode;
  align?: 'left' | 'center';
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[styles.metaFoot, { textAlign: align }, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  kicker: {
    fontFamily: fonts.handSemibold,
    color: colors.accentDeep,
    marginBottom: 6,
  },
  centered: { textAlign: 'center' },
  centerItems: { alignItems: 'center' },
  title: { fontFamily: fonts.serifMedium, color: colors.ink },
  underline: { marginLeft: 2 },
  metaFoot: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 9.5 * 0.22,
    textTransform: 'uppercase',
    color: colors.inkFaint,
    marginTop: 16,
  },
});
