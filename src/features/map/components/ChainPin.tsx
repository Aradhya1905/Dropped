/**
 * A map pin for a stop on a trail (chain drops). Three reads:
 * - `tagged` — a sealed pin like any other, with a small "1/3" ink tag;
 * - `next`   — the stop you just unlocked: a sage wax disc with its number;
 * - `read`   — a stop you've opened: the seal broken in two, gone grey.
 * Rendered inside a MapLibre <Marker>, like MapPin.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FloatBob, WaxSeal } from '../../../design-system/components';
import { LockIcon } from '../../../design-system/icons';
import { colors, fonts } from '../../../design-system/tokens';
import type { ChainPinKind } from '../../../utils/chains';

export function ChainPin({
  kind,
  pos,
  length,
  deltaY = -9,
  duration = 9000,
  accessibilityLabel,
  onPress,
}: {
  kind: ChainPinKind;
  pos: number;
  length: number;
  deltaY?: number;
  duration?: number;
  accessibilityLabel: string;
  onPress?: () => void;
}) {
  if (kind === 'next') {
    return (
      <FloatBob rotate={0} deltaRotate={0} deltaY={deltaY / 2} duration={duration}>
        <WaxSeal size={44} shadow="sealLarge" accessibilityLabel={accessibilityLabel} onPress={onPress}>
          <Text style={styles.nextNum}>{pos}</Text>
        </WaxSeal>
      </FloatBob>
    );
  }

  if (kind === 'read') {
    return (
      <Pressable
        onPress={onPress}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [styles.read, pressed && styles.pressed]}
      >
        <View style={[styles.half, styles.halfL]} />
        <View style={[styles.half, styles.halfR]} />
      </Pressable>
    );
  }

  return (
    <FloatBob rotate={0} deltaRotate={0} deltaY={deltaY} duration={duration}>
      <View style={styles.taggedBox}>
        <Pressable
          onPress={onPress}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          style={({ pressed }) => [styles.pin, pressed && styles.pressed]}
        >
          <LockIcon size={14} color={colors.inkSoft} strokeWidth={1.5} />
        </Pressable>
        <View style={styles.tag} pointerEvents="none">
          <Text style={styles.tagText}>
            {pos}/{length}
          </Text>
        </View>
      </View>
    </FloatBob>
  );
}

const styles = StyleSheet.create({
  nextNum: { fontFamily: fonts.serif, fontSize: 20, color: colors.paperBright },
  read: {
    width: 32,
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  half: { width: 13, height: 24, backgroundColor: colors.inkFaint },
  halfL: {
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    transform: [{ rotate: '-14deg' }],
  },
  halfR: {
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    transform: [{ rotate: '14deg' }],
  },
  // Room for the tag to sit on the pin's shoulder without being clipped.
  taggedBox: { paddingTop: 8, paddingRight: 14 },
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
  tag: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: colors.ink,
  },
  tagText: {
    fontFamily: fonts.mono,
    fontSize: 8.5,
    letterSpacing: 8.5 * 0.08,
    color: colors.paperCard,
  },
  pressed: { opacity: 0.8 },
});
