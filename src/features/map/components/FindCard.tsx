/**
 * Bottom find-card for the walk sequence (`.findcard`): runs grey/locked out
 * of range, warms up in range, and grows a "Break the seal" bar on arrival.
 */
import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { Tape, WaxSeal } from '../../../design-system/components';
import { LockIcon } from '../../../design-system/icons';
import { colors, fonts, shadows } from '../../../design-system/tokens';

export function FindCard({
  kicker,
  title,
  meta,
  locked = false,
  onBreakSeal,
  style,
}: {
  kicker: string;
  title: string;
  meta: string;
  locked?: boolean;
  /** When set, shows the full-width "Break the seal" action (arrival beat). */
  onBreakSeal?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.card, locked && styles.cardLocked, style]}>
      {!locked ? <Tape width={56} height={18} rotate={-3} style={styles.tape} /> : null}
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={[styles.kicker, locked && styles.kickerLocked]}>{kicker}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.meta}>{meta}</Text>
        </View>
        {locked ? (
          <View style={styles.lockedSeal}>
            <LockIcon size={20} color={colors.inkFaint} strokeWidth={1.6} />
          </View>
        ) : (
          <WaxSeal size={48}>
            <LockIcon size={20} color="rgba(255,255,255,0.9)" strokeWidth={1.6} />
          </WaxSeal>
        )}
      </View>
      {onBreakSeal ? (
        <Pressable
          onPress={onBreakSeal}
          style={({ pressed }) => [styles.breakBtn, pressed && styles.pressed]}
        >
          <LockIcon size={16} color={colors.paperCard} strokeWidth={1.6} variant="broken" />
          <Text style={styles.breakText}>Break the seal</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.paperCard,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 17,
    boxShadow: shadows.card,
  },
  cardLocked: { opacity: 0.92 },
  tape: { position: 'absolute', top: -9, left: '50%', marginLeft: -28 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  copy: { flex: 1 },
  kicker: {
    fontFamily: fonts.handSemibold,
    fontSize: 18,
    lineHeight: 22,
    color: colors.accentDeep,
    marginBottom: 2,
  },
  kickerLocked: { color: colors.inkFaint },
  title: {
    fontFamily: fonts.serifMedium,
    fontSize: 18,
    letterSpacing: 18 * -0.01,
    color: colors.ink,
    marginBottom: 4,
  },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 8.5,
    letterSpacing: 8.5 * 0.12,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  lockedSeal: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.paperDeep,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 13,
    backgroundColor: colors.ink,
    borderRadius: 13,
    paddingVertical: 13,
  },
  pressed: { opacity: 0.85 },
  breakText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 11 * 0.14,
    textTransform: 'uppercase',
    color: colors.paperCard,
  },
});
