/**
 * The lined writing card in the composer (`.write-card`): ruled paper, washi
 * tape, editable confession body, signature line and character count.
 */
import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { Tape } from '../../../design-system/components';
import { colors, fonts } from '../../../design-system/tokens';

const LINE_H = 32;

/** Ruled-paper lines, one every 32px (the text's line height). */
function RuledLines() {
  const rows = Array.from({ length: 16 }, (_, i) => 18 + LINE_H * (i + 1));
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      {rows.map(y => (
        <Line key={y} x1={0} y1={y} x2="100%" y2={y} stroke={colors.lineSoft} strokeWidth={1} />
      ))}
    </Svg>
  );
}

export function WriteCard({
  value,
  onChangeText,
  sign,
  count,
}: {
  value: string;
  onChangeText: (t: string) => void;
  sign: string;
  count: number;
}) {
  return (
    <View style={styles.card}>
      <RuledLines />
      <Tape width={62} height={19} rotate={-2.5} style={styles.tape} />
      <TextInput
        style={styles.text}
        value={value}
        onChangeText={onChangeText}
        multiline
        placeholder="What happened here?"
        placeholderTextColor={colors.inkFaint}
        scrollEnabled={false}
      />
      <View style={styles.foot}>
        <TextInput
          style={styles.sign}
          value={sign}
          editable={false}
        />
        <TextInput
          style={styles.count}
          value={String(count)}
          editable={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 150,
    marginTop: 16,
    backgroundColor: colors.paper,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 14,
    boxShadow: '0 14px 26px -20px rgba(43,33,20,0.4)',
    overflow: 'hidden',
  },
  tape: { position: 'absolute', top: -9, left: '50%', marginLeft: -31 },
  text: {
    fontFamily: fonts.serif,
    fontSize: 19,
    lineHeight: LINE_H,
    color: colors.ink,
    padding: 0,
    textAlignVertical: 'top',
  },
  foot: {
    marginTop: 'auto',
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sign: {
    fontFamily: fonts.handMedium,
    fontSize: 18,
    color: colors.inkFaint,
    padding: 0,
  },
  count: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 11 * 0.04,
    color: colors.inkFaint,
    padding: 0,
  },
});
