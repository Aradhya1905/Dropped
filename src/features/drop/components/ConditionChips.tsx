/**
 * "When can it be read?" — the optional time gate in the composer.
 *
 * Same chip visual as `MoodChips` and `LifespanChips`: the third small choice
 * on the same sheet should read as their sibling, not as a new kind of control.
 * "Any time" is the default and sits first, so the person who doesn't want a
 * gate never has to touch it.
 *
 * **One condition, never two.** These are radio chips over a single value, not
 * toggles — 50 m is already a hard ask, and 50 m *and* midnight means a drop
 * almost nobody reads. The server enforces the same rule (a single
 * `revealCondition`, plus a check constraint); this is where it is *felt*.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../../../design-system/tokens';
import type { RevealCondition } from '../../../types';

/** `undefined` is "any time" — the same absence the API and the DB use. */
const OPTIONS: { value: RevealCondition | undefined; label: string }[] = [
  { value: undefined, label: 'any time' },
  { value: 'night', label: 'after dark' },
  { value: 'day', label: 'daylight' },
];

/**
 * The promise each gate makes, spelled out. Sunset and sunrise are computed at
 * the drop's own coordinate, so this stays true wherever it is read from — and
 * the copy says "here", because that is the whole idea.
 */
const HINTS: Record<RevealCondition, string> = {
  night: 'Only readable between sunset and sunrise here. The same bench means something else at 2 a.m.',
  day: 'Only readable between sunrise and sunset here.',
};

export function ConditionChips({
  selected,
  onSelect,
}: {
  selected: RevealCondition | undefined;
  onSelect: (value: RevealCondition | undefined) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>When can it be read?</Text>
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
                  ? 'Readable at any hour'
                  : opt.value === 'night'
                    ? 'Readable only after dark'
                    : 'Readable only in daylight'
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
        Only the gated choices get a caption, matching LifespanChips: "any time"
        is the default and the app's existing promise, and the sheet is already
        tight on the smallest phones.
      */}
      {selected !== undefined && (
        <Text style={styles.hint}>{HINTS[selected]}</Text>
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
