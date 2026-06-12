/**
 * A handwritten paper note floating on the welcome wall (`.snote`).
 * Sealed notes blur their text and carry a wax stamp; open notes get tape.
 */
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { FloatBob, Tape, WaxSeal } from '../../../design-system/components';
import { SealPinIcon } from '../../../design-system/icons';
import { colors, fonts, shadows } from '../../../design-system/tokens';

export interface SecretNoteProps {
  text: string;
  tag: string;
  sealed?: boolean;
  /** Resting tilt + bob parameters (each note drifts differently). */
  rotate: number;
  deltaY?: number;
  duration?: number;
  style?: ViewStyle;
}

export function SecretNote({
  text,
  tag,
  sealed = false,
  rotate,
  deltaY = -9,
  duration = 9000,
  style,
}: SecretNoteProps) {
  return (
    <FloatBob
      rotate={rotate}
      deltaRotate={rotate < 0 ? -0.6 : 0.6}
      deltaY={deltaY}
      duration={duration}
      style={[styles.wrap, style]}
    >
      <View style={styles.note}>
        {!sealed ? <Tape style={styles.tape} /> : null}
        <Text style={[styles.hand, sealed && styles.handSealed]}>{text}</Text>
        <Text style={styles.tag}>{tag}</Text>
        {sealed ? (
          <WaxSeal size={42} rotate={-8} style={styles.stamp}>
            <SealPinIcon size={20} color="rgba(255,255,255,0.82)" />
          </WaxSeal>
        ) : null}
      </View>
    </FloatBob>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', width: 158 },
  note: {
    backgroundColor: colors.paperCard,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingTop: 15,
    paddingHorizontal: 16,
    paddingBottom: 16,
    boxShadow: shadows.note,
  },
  tape: { position: 'absolute', top: -9, left: '50%', marginLeft: -27 },
  hand: {
    fontFamily: fonts.handMedium,
    fontSize: 21,
    lineHeight: 21 * 1.18,
    letterSpacing: 21 * 0.01,
    color: colors.ink,
  },
  // CSS blurs the sealed text (`blur(3.4px)`); RN can't blur glyphs, so fake
  // it: transparent fill + soft same-color shadow reads as out-of-focus ink.
  handSealed: {
    color: 'transparent',
    opacity: 0.55,
    textShadowColor: colors.ink,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  tag: {
    marginTop: 9,
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 8 * 0.18,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  stamp: { position: 'absolute', right: -12, bottom: -12 },
});
