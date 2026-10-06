/**
 * "On a trail · stop 2 of 3" — replaces the location chip while you're
 * following a trail, with a dot per stop: read (grey), next (sage), still
 * hidden (dashed).
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { TrailIcon } from '../../../design-system/icons';
import { colors, fonts, shadows } from '../../../design-system/tokens';
import type { TrailDot } from '../../../utils/chains';

const DOT_WORD: Record<TrailDot, string> = { read: 'read', next: 'next', hidden: 'hidden' };

export function TrailPill({
  stop,
  of,
  place,
  dots,
  onPress,
  style,
}: {
  stop: number;
  of: number;
  place: string;
  dots: TrailDot[];
  /** Frame the trail on the map. */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const dotsLabel = dots.map((d, i) => `stop ${i + 1} ${DOT_WORD[d]}`).join(', ');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`On a trail, stop ${stop} of ${of}, ${place}. ${dotsLabel}. Tap to see the trail.`}
      style={({ pressed }) => [styles.pill, pressed && styles.pressed, style]}
    >
      <TrailIcon size={22} color={colors.accentDeep} />
      <View style={styles.text}>
        <Text style={styles.kicker}>
          on a trail · stop {stop} of {of}
        </Text>
        <Text style={styles.place} numberOfLines={1}>
          {place}
        </Text>
      </View>
      <View style={styles.dots}>
        {dots.map((d, i) => (
          <View key={i} style={[styles.dot, styles[d]]} />
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.paperCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingVertical: 12,
    paddingHorizontal: 14,
    boxShadow: shadows.chip,
  },
  pressed: { opacity: 0.85 },
  text: { flex: 1, minWidth: 0 },
  kicker: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 9 * 0.18,
    textTransform: 'uppercase',
    color: colors.accentDeep,
  },
  place: { fontFamily: fonts.serif, fontSize: 17, color: colors.ink, marginTop: 1 },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 9, height: 9, borderRadius: 4.5 },
  read: { backgroundColor: colors.inkFaint },
  next: { backgroundColor: colors.accent },
  hidden: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.inkSoft },
});
