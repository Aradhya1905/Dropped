/**
 * "Show me" — the You tab's mood filter. Multi-select chips (same look as the
 * composer's `.mood` chips); only secrets that felt like the chosen moods turn
 * up on the map. At least one mood always stays on.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../../../design-system/tokens';
import { tap } from '../../../services/haptics';
import { useMoodFilterStore } from '../../../store/moodFilterStore';
import { MOODS } from '../../../types';
import { isAllMoods } from '../../../utils/moods';

export function MoodFilter() {
  const moods = useMoodFilterStore(s => s.moods);
  const toggle = useMoodFilterStore(s => s.toggle);
  const showAll = useMoodFilterStore(s => s.showAll);
  // Set when the user tries to switch off the last mood.
  const [refused, setRefused] = useState(false);
  const all = isAllMoods(moods);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.label}>Show me</Text>
        {all ? (
          <Text style={styles.value}>all moods</Text>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Show all moods"
            hitSlop={10}
            onPress={() => {
              tap();
              setRefused(false);
              showAll();
            }}
          >
            <Text style={styles.value}>
              {moods.length} of {MOODS.length} · show all
            </Text>
          </Pressable>
        )}
      </View>

      <View style={styles.chips}>
        {MOODS.map(mood => {
          const on = moods.includes(mood);
          return (
            <Pressable
              key={mood}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`Show ${mood} secrets`}
              onPress={() => {
                tap();
                setRefused(!toggle(mood));
              }}
              style={({ pressed }) => [
                styles.chip,
                on && styles.chipOn,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.dot, on && styles.dotOn]} />
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{mood}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.hint}>
        {refused
          ? 'keep at least one — the map needs something.'
          : all
            ? 'every kind of secret turns up on your map.'
            : 'only these turn up on your map. trails stay whole.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.paperCard,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingVertical: 14,
    paddingHorizontal: 16,
    boxShadow: '0 10px 20px -18px rgba(43,33,20,0.45)',
  },
  head: { flexDirection: 'row', alignItems: 'center' },
  label: { flex: 1, fontFamily: fonts.serif, fontSize: 16, color: colors.ink },
  value: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 11 * 0.04,
    color: colors.accentDeep,
  },
  chips: { flexDirection: 'row', gap: 7, marginTop: 12 },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 15,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipOn: { borderWidth: 1.5, borderColor: colors.accent, backgroundColor: colors.accentTint },
  pressed: { opacity: 0.7 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.inkFaint },
  dotOn: { backgroundColor: colors.accent },
  chipText: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 9.5 * 0.12,
    textTransform: 'uppercase',
    color: colors.inkSoft,
  },
  chipTextOn: { color: colors.accentDeep },
  hint: {
    fontFamily: fonts.handMedium,
    fontSize: 16,
    color: colors.inkFaint,
    marginTop: 10,
  },
});
