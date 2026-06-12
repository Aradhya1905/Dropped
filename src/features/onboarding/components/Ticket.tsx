/**
 * A taped paper ticket from "Three simple rules" (`.ticket`): hand-drawn
 * number ring (or the cracking seal) beside a serif rule + sans description.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Tape } from '../../../design-system/components';
import { colors, fonts, shadows } from '../../../design-system/tokens';

/** Hand-drawn circle around the ticket number (`.tnum .ring`). */
function NumberRing({ num }: { num: string }) {
  return (
    <View style={styles.tnum}>
      <Svg width={48} height={48} viewBox="0 0 48 48" style={StyleSheet.absoluteFill}>
        <Path
          d="M24 4C36 3 45 13 45 24C45 36 34 45 22 44C11 43 3 33 4 22C5 12 13 5 24 4"
          stroke={colors.accent}
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
      <Text style={styles.tnumText}>{num}</Text>
    </View>
  );
}

export interface TicketProps {
  /** Ticket number, or pass a custom badge (the cracking seal). */
  num?: string;
  badge?: React.ReactNode;
  title: React.ReactNode;
  body: string;
  rotate: number;
}

export function Ticket({ num, badge, title, body, rotate }: TicketProps) {
  return (
    <View style={[styles.ticket, { transform: [{ rotate: `${rotate}deg` }] }]}>
      <Tape width={52} height={18} rotate={-4} style={styles.tape} />
      {badge ? <View style={styles.badgeSlot}>{badge}</View> : <NumberRing num={num ?? ''} />}
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
    </View>
  );
}

/** Italic sage emphasis inside a ticket title (`.num-em`). */
export function TicketEm({ children }: { children: React.ReactNode }) {
  return <Text style={styles.em}>{children}</Text>;
}

const styles = StyleSheet.create({
  ticket: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    backgroundColor: colors.paperCard,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingTop: 16,
    paddingHorizontal: 18,
    paddingBottom: 17,
    boxShadow: shadows.chip,
  },
  tape: { position: 'absolute', top: -9, left: 34 },
  tnum: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  tnumText: {
    fontFamily: fonts.handSemibold,
    fontSize: 27,
    lineHeight: 33,
    color: colors.accentDeep,
    transform: [{ rotate: '-4deg' }],
  },
  badgeSlot: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  title: {
    fontFamily: fonts.serifMedium,
    fontSize: 19,
    lineHeight: 19 * 1.25,
    letterSpacing: 19 * -0.005,
    color: colors.ink,
    marginBottom: 3,
  },
  em: { fontFamily: fonts.serifItalic, color: colors.accentDeep },
  body: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 13 * 1.46,
    color: colors.inkSoft,
  },
});
