/**
 * A sealed (locked) secret pin floating on the map (`.mappin`).
 */
import React from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';

import { FloatBob } from '../../../design-system/components';
import { LockIcon } from '../../../design-system/icons';
import { colors } from '../../../design-system/tokens';

export function MapPin({
  deltaY = -9,
  duration = 9000,
  onPress,
  style,
}: {
  deltaY?: number;
  duration?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <FloatBob rotate={0} deltaRotate={0} deltaY={deltaY} duration={duration} style={[styles.wrap, style]}>
      <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => [styles.pin, pressed && styles.pressed]}>
        <LockIcon size={14} color={colors.inkSoft} />
      </Pressable>
    </FloatBob>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', zIndex: 12 },
  pin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.paperCard,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 16px -8px rgba(43,33,20,0.4)',
  },
  pressed: { opacity: 0.8 },
});
