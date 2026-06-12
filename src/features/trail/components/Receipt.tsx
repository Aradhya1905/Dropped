/**
 * Torn receipt of wander stats (`.receipt`): taped at the top, perforated
 * zig-zag along the bottom, dashed rules between the cells.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Tape } from '../../../design-system/components';
import { colors, fonts } from '../../../design-system/tokens';

export interface ReceiptCell {
  value: string;
  /** Smaller trailing unit, like the `d` in `12d`. */
  unit?: string;
  label: string;
}

/** Zig-zag torn edge: ~9px teeth, 7px tall, stretched across the width. */
function TornEdge() {
  const teeth = 40;
  const w = teeth * 9;
  let d = `M0 0`;
  for (let i = 0; i < teeth; i++) {
    d += ` L${i * 9 + 4.5} 7 L${(i + 1) * 9} 0`;
  }
  d += ' Z';
  return (
    <Svg style={styles.zig} width="100%" height={7} viewBox={`0 0 ${w} 7`} preserveAspectRatio="none">
      <Path d={d} fill={colors.paperCard} />
    </Svg>
  );
}

export function Receipt({ cells }: { cells: ReceiptCell[] }) {
  return (
    <View style={styles.receipt}>
      <Tape width={58} height={18} rotate={-2} style={styles.tape} />
      {cells.map((cell, i) => (
        <View key={cell.label} style={[styles.cell, i > 0 && styles.cellDivided]}>
          <Text style={styles.value}>
            {cell.value}
            {cell.unit ? <Text style={styles.unit}>{cell.unit}</Text> : null}
          </Text>
          <Text style={styles.label}>{cell.label}</Text>
        </View>
      ))}
      <TornEdge />
    </View>
  );
}

const styles = StyleSheet.create({
  receipt: {
    flexDirection: 'row',
    marginTop: 17,
    marginHorizontal: 2,
    paddingTop: 14,
    paddingBottom: 16,
    paddingHorizontal: 6,
    backgroundColor: colors.paperCard,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    borderBottomWidth: 0,
    boxShadow: '0 12px 24px -18px rgba(43,33,20,0.5)',
  },
  tape: { position: 'absolute', top: -9, left: '50%', marginLeft: -29, zIndex: 2 },
  zig: { position: 'absolute', left: 0, right: 0, bottom: -7 },
  cell: { flex: 1, alignItems: 'center' },
  cellDivided: {
    borderLeftWidth: 1,
    borderLeftColor: colors.line,
    borderStyle: 'dashed',
  },
  value: {
    fontFamily: fonts.serifMedium,
    fontSize: 23,
    lineHeight: 28,
    letterSpacing: 23 * -0.01,
    color: colors.ink,
  },
  unit: { fontSize: 14, color: colors.inkSoft },
  label: {
    marginTop: 3,
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 8 * 0.2,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
});
