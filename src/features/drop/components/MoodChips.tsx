/**
 * "How did it feel?" mood selector (`.mood-row` / `.mood`).
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../../../design-system/tokens';

export function MoodChips({
  moods,
  selected,
  onSelect,
}: {
  moods: string[];
  selected: string;
  onSelect: (mood: string) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>How did it feel?</Text>
      <View style={styles.chips}>
        {moods.map(mood => {
          const on = mood === selected;
          return (
            <Pressable
              key={mood}
              onPress={() => onSelect(mood)}
              style={[styles.chip, on && styles.chipOn]}
            >
              <View style={[styles.dot, on && styles.dotOn]} />
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{mood}</Text>
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
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 15,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.line,
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
