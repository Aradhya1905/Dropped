/**
 * The taped "you're within range" card docked over the map (`.range-card`).
 */
import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { Tape, WaxSeal } from '../../../design-system/components';
import { LockWideIcon } from '../../../design-system/icons';
import { colors, fonts, shadows } from '../../../design-system/tokens';

export function RangeCard({
  kicker,
  title,
  meta,
  onPress,
  style,
}: {
  kicker: string;
  title: string;
  meta: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}>
      <Tape width={56} height={18} rotate={-3} style={styles.tape} />
      <View style={styles.copy}>
        <Text style={styles.kicker}>{kicker}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>{meta}</Text>
      </View>
      <WaxSeal size={46} pulse>
        <LockWideIcon size={20} />
      </WaxSeal>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.paperCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 17,
    boxShadow: shadows.card,
    transform: [{ rotate: '-0.5deg' }],
  },
  pressed: { opacity: 0.9 },
  tape: { position: 'absolute', top: -9, left: '50%', marginLeft: -28 },
  copy: { flex: 1 },
  kicker: {
    fontFamily: fonts.handSemibold,
    fontSize: 19,
    lineHeight: 23,
    color: colors.accentDeep,
    marginBottom: 1,
  },
  title: {
    fontFamily: fonts.serifMedium,
    fontSize: 19,
    letterSpacing: 19 * -0.01,
    color: colors.ink,
    marginBottom: 4,
  },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 9 * 0.12,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
});
