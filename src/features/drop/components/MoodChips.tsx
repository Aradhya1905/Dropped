/**
 * "How did it feel?" mood selector (`.mood-row` / `.mood`).
 *
 * Multi-select by shape (`selected` is a list) so the map's mood filter and the
 * composer's single choice share one chip control instead of growing a second
 * one that drifts from it. The composer passes a one-item list and re-sets the
 * same value on every tap; the map toggles.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, moodColor } from '../../../design-system/tokens';
import type { Mood } from '../../../types';

export function MoodChips({
  moods,
  selected,
  onToggle,
  label,
  /** Size chips to their text instead of splitting the row four ways. */
  compact = false,
  /**
   * Colour each chip's dot with its mood pigment, so the chips teach the map's
   * tint mapping. Off in the composer, which follows the design's sage dots.
   */
  tintDots = false,
}: {
  moods: readonly Mood[];
  selected: readonly Mood[];
  onToggle: (mood: Mood) => void;
  label?: string;
  compact?: boolean;
  tintDots?: boolean;
}) {
  return (
    <View style={compact ? undefined : styles.row}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.chips, compact && styles.chipsCompact]}>
        {moods.map(mood => {
          const on = selected.includes(mood);
          const tint = moodColor(mood);
          return (
            <Pressable
              key={mood}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${mood}${on ? ', showing' : ''}`}
              onPress={() => onToggle(mood)}
              style={[
                styles.chip,
                compact ? styles.chipCompact : styles.chipFlex,
                on && styles.chipOn,
                on && tintDots && { borderColor: tint.ink, backgroundColor: tint.tint },
              ]}
            >
              <View
                style={[
                  styles.dot,
                  on && styles.dotOn,
                  tintDots && { backgroundColor: on ? tint.ink : colors.inkFaint },
                ]}
              />
              <Text
                style={[
                  styles.chipText,
                  on && styles.chipTextOn,
                  on && tintDots && { color: colors.ink },
                ]}
              >
                {mood}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginTop: 16 },
  label: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 9 * 0.24,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  chips: { flexDirection: 'row', gap: 9, marginTop: 10 },
  chipsCompact: { marginTop: 0, gap: 7 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 15,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipFlex: { flex: 1 },
  chipCompact: {
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 13,
    backgroundColor: colors.paperCard,
  },
  chipOn: { borderWidth: 1.5, borderColor: colors.accent, backgroundColor: colors.accentTint },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.inkFaint },
  dotOn: { backgroundColor: colors.accent },
  chipText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 10 * 0.16,
    textTransform: 'uppercase',
    color: colors.inkSoft,
  },
  chipTextOn: { color: colors.accentDeep },
});
