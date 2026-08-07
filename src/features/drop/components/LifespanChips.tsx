/**
 * "How long should it last?" — the three-way lifespan chooser in the composer.
 *
 * Same chip visual as `MoodChips` on purpose: this is the second small choice
 * on the same sheet, and it should read as a sibling of the first rather than
 * a new kind of control. Forever is the default and sits first, so the person
 * who doesn't care about expiry never has to touch it.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../../../design-system/tokens';
import type { ExpiresInDays } from '../../../types';

/** `undefined` is forever — the same absence the API and the DB use. */
const OPTIONS: { value: ExpiresInDays | undefined; label: string }[] = [
  { value: undefined, label: 'forever' },
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
];

export function LifespanChips({
  selected,
  onSelect,
}: {
  selected: ExpiresInDays | undefined;
  onSelect: (value: ExpiresInDays | undefined) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>How long should it last?</Text>
      <View style={styles.chips}>
        {OPTIONS.map(opt => {
          const on = opt.value === selected;
          return (
            <Pressable
              key={opt.label}
              onPress={() => onSelect(opt.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={
                opt.value === undefined
                  ? 'Lasts forever'
                  : `Fades after ${opt.value} days`
              }
              style={[styles.chip, on && styles.chipOn]}
            >
              <View style={[styles.dot, on && styles.dotOn]} />
              <Text style={[styles.chipText, on && styles.chipTextOn]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {/*
        Only the fading choices get a caption. "Forever" is the default and the
        app's existing promise, so explaining it would just cost a line of
        height on the smallest phones — the sheet is already tight (WriteCard
        can't shrink below 150).
      */}
      {selected !== undefined && (
        <Text style={styles.hint}>
          Leaves the map after {selected} days. Whoever found it keeps it.
        </Text>
      )}
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
  chipOn: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    backgroundColor: colors.accentTint,
  },
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
  hint: {
    fontFamily: fonts.sans,
    fontSize: 11,
    lineHeight: 11 * 1.4,
    color: colors.inkFaint,
    marginTop: 7,
  },
});
