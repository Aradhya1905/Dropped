/**
 * The composer's one extra row for chain drops. Collapsed, it's a quiet dashed
 * "Part of a trail? · off"; once a previous stop is picked it turns sage and
 * reads `after "Blue Tokai, Indiranagar"`, with ✕ to clear it.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { CloseIcon, TrailIcon } from '../../../design-system/icons';
import { colors, fonts } from '../../../design-system/tokens';

/** The previous stop the new drop continues. */
export interface ChainPick {
  id: string;
  placeLabel?: string;
  /** The stop number the new drop becomes. */
  stop: number;
}

export function ChainRow({
  pick,
  onOpen,
  onClear,
  style,
}: {
  pick: ChainPick | null;
  /** Open the picker (to set or change the previous stop). */
  onOpen: () => void;
  onClear: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  if (!pick) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Part of a trail? Off. Pick an earlier drop of yours to continue."
        onPress={onOpen}
        style={({ pressed }) => [styles.row, styles.off, pressed && styles.pressed, style]}
      >
        <TrailIcon size={22} color={colors.inkSoft} />
        <Text style={styles.offLabel}>Part of a trail?</Text>
        <Text style={styles.offState}>off</Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.row, styles.on, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Continues a trail, stop ${pick.stop}, after ${pick.placeLabel ?? 'your earlier drop'}. Change.`}
        onPress={onOpen}
        style={({ pressed }) => [styles.onBody, pressed && styles.pressed]}
      >
        <TrailIcon size={22} color={colors.accentDeep} />
        <View style={styles.onText}>
          <Text style={styles.onKicker}>continues a trail · stop {pick.stop}</Text>
          <Text style={styles.onPlace} numberOfLines={1}>
            after "{pick.placeLabel ?? 'your earlier drop'}"
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Remove from trail"
        onPress={onClear}
        style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
      >
        <CloseIcon size={14} color={colors.inkSoft} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    marginTop: 14,
  },
  off: {
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.line,
  },
  offLabel: { flex: 1, fontFamily: fonts.sans, fontSize: 13.5, color: colors.ink },
  offState: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 9 * 0.18,
    textTransform: 'uppercase',
    color: colors.inkSoft,
  },
  on: {
    paddingLeft: 14,
    paddingRight: 0,
    backgroundColor: colors.accentTint,
    borderWidth: 1,
    borderColor: 'rgba(118,149,124,0.35)',
  },
  onBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  onText: { flex: 1, minWidth: 0 },
  onKicker: {
    fontFamily: fonts.mono,
    fontSize: 8.5,
    letterSpacing: 8.5 * 0.19,
    textTransform: 'uppercase',
    color: colors.accentDeep,
  },
  onPlace: { fontFamily: fonts.handSemibold, fontSize: 19, lineHeight: 22, color: colors.ink },
  clear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.8 },
});
