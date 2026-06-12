/**
 * Shared small chrome: EmotionTag, CloseX, Grabber, Postmark, Sheet.
 */
import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { CloseIcon } from '../icons';
import { colors, fonts, shadows } from '../tokens';

/** Tilted handwritten mood chip (`.emotion-tag`, `.emotion-tag.sm`). */
export function EmotionTag({
  label,
  small = false,
  style,
}: {
  label: string;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.tag, small && styles.tagSm, style]}>
      <View style={[styles.tagDot, small && styles.tagDotSm]} />
      <Text style={[styles.tagText, small && styles.tagTextSm]}>{label}</Text>
    </View>
  );
}

/** Round dismiss button (`.close-x`). */
export function CloseX({ onPress, style }: { onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityLabel="Close"
      style={({ pressed }) => [styles.closeX, pressed && styles.pressed, style]}
    >
      <CloseIcon size={14} color={colors.inkSoft} />
    </Pressable>
  );
}

/** Bottom-sheet grab handle (`.grabber`). */
export function Grabber({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.grabber, style]} />;
}

/** Faded rotated postal mark in the corner of onboarding screens. */
export function Postmark({ size = 58, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[styles.postmark, { width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <Circle cx={32} cy={32} r={29} stroke={colors.accentDeep} strokeWidth={1.4} strokeDasharray="3 3" />
        <Circle cx={32} cy={32} r={22} stroke={colors.accentDeep} strokeWidth={1.4} />
        <Path d="M14 32h36M32 14v36" stroke={colors.accentDeep} strokeWidth={1.4} opacity={0.5} />
        <Path d="M20 22c3 4 5 9 5 14M44 22c-3 4-5 9-5 14" stroke={colors.accentDeep} strokeWidth={1.4} />
      </Svg>
    </View>
  );
}

/**
 * Rounded-top paper sheet (`.s5sheet` / `.composer-sheet`):
 * `radial-gradient(120% 60% at 50% 0%, #F8F3E9, paper-card 60%)`.
 */
export function Sheet({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.sheet, style]}>
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient
            id="sheetGround"
            gradientUnits="userSpaceOnUse"
            cx="50%"
            cy="0%"
            rx="120%"
            ry="60%"
          >
            <Stop offset="0" stopColor={colors.paperBright} />
            <Stop offset="0.6" stopColor={colors.paperCard} />
            <Stop offset="1" stopColor={colors.paperCard} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" rx={30} fill="url(#sheetGround)" />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    backgroundColor: colors.accentTint,
    borderRadius: 20,
    paddingTop: 4,
    paddingBottom: 5,
    paddingHorizontal: 14,
    transform: [{ rotate: '-2deg' }],
  },
  tagSm: {
    gap: 5,
    paddingTop: 2,
    paddingBottom: 3,
    paddingHorizontal: 10,
    transform: [{ rotate: '-1.5deg' }],
  },
  tagDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.accent },
  tagDotSm: { width: 5, height: 5, borderRadius: 2.5 },
  tagText: {
    fontFamily: fonts.handSemibold,
    fontSize: 17,
    lineHeight: 21,
    color: colors.accentDeep,
  },
  tagTextSm: { fontSize: 13, lineHeight: 17 },
  closeX: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.paperDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  grabber: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.line,
    alignSelf: 'center',
  },
  postmark: { opacity: 0.42, transform: [{ rotate: '11deg' }] },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    overflow: 'hidden',
    boxShadow: shadows.sheet,
  },
});
