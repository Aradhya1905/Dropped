/**
 * The design's button family (`.btn-primary` / `.btn-ghost` / `.btn-outline`):
 * 56px pill, Geist Medium 15.5, optional leading/trailing glyphs and the
 * little sage dot the primary CTA carries on the permission screen.
 *
 * Press feel uses the core Animated API (no reanimated yet): a spring
 * scale-press on the whole pill.
 */
import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { colors, fonts } from '../tokens';

export interface AppButtonProps {
  label: string;
  variant?: 'primary' | 'ghost' | 'outline';
  /** Leading sage dot (`.btn-primary .dot`). */
  dot?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  onPress?: () => void;
  /** Overrides the label for screen readers (e.g. when the label is a glyph). */
  accessibilityLabel?: string;
  /** Set while the action is in flight so the button reads as unavailable. */
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function AppButton({
  label,
  variant = 'primary',
  dot = false,
  iconLeft,
  iconRight,
  onPress,
  accessibilityLabel,
  disabled = false,
  style,
}: AppButtonProps) {
  // press = 0 at rest, 1 while held; drives the pill scale.
  const press = useRef(new Animated.Value(0)).current;

  const isPrimary = variant === 'primary';

  const handlePressIn = () =>
    Animated.spring(press, {
      toValue: 1,
      useNativeDriver: true,
      speed: 28,
      bounciness: 0,
    }).start();

  const handlePressOut = () =>
    Animated.spring(press, {
      toValue: 0,
      useNativeDriver: true,
      speed: 24,
      bounciness: 9,
    }).start();

  const scale = press.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.955],
  });

  return (
    <Animated.View style={[styles.wrap, { transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || !onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: disabled || !onPress }}
        style={[
          styles.base,
          isPrimary && styles.primary,
          variant === 'ghost' && styles.ghost,
          variant === 'outline' && styles.outline,
        ]}
      >
        {dot ? <View style={styles.dot} /> : null}
        {iconLeft}
        <Text
          style={[
            styles.label,
            isPrimary && styles.labelPrimary,
            variant === 'ghost' && styles.labelGhost,
            variant === 'outline' && styles.labelOutline,
          ]}
        >
          {label}
        </Text>
        {iconRight}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  base: {
    width: '100%',
    height: 56,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    gap: 10,
  },
  primary: { backgroundColor: colors.ink },
  ghost: { backgroundColor: 'transparent', height: 44 },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.line,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 15.5,
    letterSpacing: 0.155,
    flexShrink: 1,
  },
  labelPrimary: { color: colors.paperCard },
  labelGhost: { color: colors.inkSoft, fontSize: 14 },
  labelOutline: { color: colors.ink },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.accent,
  },
});
