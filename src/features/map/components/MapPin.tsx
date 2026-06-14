/**
 * A sealed secret pin floating on the map (`.mappin`).
 * Rendered inside a MapLibre <Marker> — no absolute positioning.
 */
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { FloatBob } from '../../../design-system/components';
import { LockIcon } from '../../../design-system/icons';
import { colors } from '../../../design-system/tokens';

export function MapPin({
  deltaY = -9,
  duration = 9000,
  onPress,
}: {
  deltaY?: number;
  duration?: number;
  onPress?: () => void;
}) {
  return (
    <FloatBob rotate={0} deltaRotate={0} deltaY={deltaY} duration={duration}>
      <Pressable
        onPress={onPress}
        hitSlop={8}
        style={({ pressed }) => [styles.pin, pressed && styles.pressed]}
      >
        <LockIcon size={14} color={colors.inkSoft} strokeWidth={1.5} />
      </Pressable>
    </FloatBob>
  );
}

const styles = StyleSheet.create({
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
