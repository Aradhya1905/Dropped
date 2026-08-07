/**
 * "Can someone link others here?" — the author's opt-out from share links.
 *
 * A single tappable row rather than a third chip group: the composer sheet is
 * already tight (see the note in `LifespanChips`), and this is a yes/no, not a
 * choice between options. On by default, so the person who doesn't think about
 * links never has to touch it.
 *
 * The copy says *link*, not *find*: opting out only stops `dropped://d/<id>`
 * from resolving. Anyone walking past still finds the drop, which is the
 * premise of the app, and the hint below says so when it's off.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, fonts } from '../../../design-system/tokens';

export function ShareableToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onChange(!value)}
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
        accessibilityLabel="Let people share a link to this spot"
        style={styles.press}
      >
        <View style={[styles.box, value && styles.boxOn]}>
          {value && (
            <Svg width={11} height={11} viewBox="0 0 12 12" fill="none">
              <Path
                d="M2.5 6.3 4.8 8.6 9.5 3.6"
                stroke={colors.paperCard}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          )}
        </View>
        <Text style={[styles.text, value && styles.textOn]}>
          People can share a link to this spot
        </Text>
      </Pressable>
      {!value && (
        <Text style={styles.hint}>
          No link will open it. Anyone who walks past can still find it.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginTop: 14 },
  press: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  box: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  text: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 10 * 0.16,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  textOn: { color: colors.inkSoft },
  hint: {
    fontFamily: fonts.sans,
    fontSize: 11,
    lineHeight: 11 * 1.4,
    color: colors.inkFaint,
    marginTop: 7,
  },
});
