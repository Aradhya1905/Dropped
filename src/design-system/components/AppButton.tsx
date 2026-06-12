/**
 * The design's button family (`.btn-primary` / `.btn-ghost` / `.btn-outline`):
 * 56px pill, Geist Medium 15.5, optional leading/trailing glyphs and the
 * little sage dot the primary CTA carries on the permission screen.
 */
import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, fonts } from '../tokens';

export interface AppButtonProps {
  label: string;
  variant?: 'primary' | 'ghost' | 'outline';
  /** Leading sage dot (`.btn-primary .dot`). */
  dot?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function AppButton({
  label,
  variant = 'primary',
  dot = false,
  iconLeft,
  iconRight,
  onPress,
  style,
}: AppButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'ghost' && styles.ghost,
        variant === 'outline' && styles.outline,
        pressed && styles.pressed,
        style,
      ]}
    >
      {dot ? <View style={styles.dot} /> : null}
      {iconLeft}
      <Text
        style={[
          styles.label,
          variant === 'primary' && styles.labelPrimary,
          variant === 'ghost' && styles.labelGhost,
          variant === 'outline' && styles.labelOutline,
        ]}
      >
        {label}
      </Text>
      {iconRight}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    height: 56,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primary: { backgroundColor: colors.ink },
  ghost: { backgroundColor: 'transparent', height: 44 },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line },
  pressed: { opacity: 0.85 },
  label: { fontFamily: fonts.sansMedium, fontSize: 15.5, letterSpacing: 0.155 },
  labelPrimary: { color: colors.paperCard },
  labelGhost: { color: colors.inkSoft, fontSize: 14 },
  labelOutline: { color: colors.ink },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.accent },
});
