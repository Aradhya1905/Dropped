/**
 * "You're in …" chip with the nearby-secrets count (`.loc-chip`).
 */
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { PinIcon } from '../../../design-system/icons';
import { colors, fonts, shadows } from '../../../design-system/tokens';

export function LocChip({
  kicker,
  place,
  count,
  style,
}: {
  kicker: string;
  place: string;
  count: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.chip, style]}>
      <View style={styles.dot} />
      <View>
        <Text style={styles.kicker}>{kicker}</Text>
        <Text style={styles.place}>{place}</Text>
      </View>
      <View style={styles.count}>
        <PinIcon size={13} strokeWidth={1.5} />
        <Text style={styles.countText}>{count}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'flex-start',
    backgroundColor: colors.paperCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingVertical: 9,
    paddingRight: 12,
    paddingLeft: 14,
    boxShadow: shadows.chip,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    boxShadow: `0 0 0 4px ${colors.accentTint}`,
  },
  kicker: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 8 * 0.2,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  place: { fontFamily: fonts.serif, fontSize: 15, color: colors.ink },
  count: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 4,
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: colors.line,
  },
  countText: { fontFamily: fonts.mono, fontSize: 13, color: colors.accentDeep },
});
