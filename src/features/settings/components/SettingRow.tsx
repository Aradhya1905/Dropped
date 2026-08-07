/**
 * One row on the You screen: icon, label, an optional line of explanation, and
 * the live value on the right.
 *
 * Rows come in three kinds and the difference is only in what `onPress` and
 * `checked` are: a static fact (no press), a toggle (`checked` given), a picker
 * (press opens a sheet). Extracted because the screen now has eight of them and
 * the retention levers are the rows most likely to be read carefully by someone
 * deciding whether to keep the app.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../../../design-system/tokens';

export function SettingRow({
  icon,
  label,
  note,
  value,
  onPress,
  checked,
  /** Grey the value out — "off", "none", the muted end of a setting. */
  quiet = false,
}: {
  icon: React.ReactNode;
  label: string;
  note?: string;
  value: string;
  onPress?: () => void;
  checked?: boolean;
  quiet?: boolean;
}) {
  const body = (
    <>
      <View style={styles.ico}>{icon}</View>
      <View style={styles.lblBlock}>
        <Text style={styles.lbl}>{label}</Text>
        {note ? <Text style={styles.note}>{note}</Text> : null}
      </View>
      <Text style={[styles.val, quiet && styles.valQuiet]}>{value}</Text>
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{body}</View>;
  }

  return (
    <Pressable
      accessibilityRole={checked === undefined ? 'button' : 'switch'}
      accessibilityState={checked === undefined ? undefined : { checked }}
      accessibilityLabel={label}
      accessibilityValue={checked === undefined ? { text: value } : undefined}
      accessibilityHint={note}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colors.paperCard,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingVertical: 13,
    paddingHorizontal: 16,
    boxShadow: '0 10px 20px -18px rgba(43,33,20,0.45)',
  },
  pressed: { opacity: 0.85 },
  ico: { width: 22, height: 22 },
  lblBlock: { flex: 1 },
  lbl: { fontFamily: fonts.serif, fontSize: 16, color: colors.ink },
  note: {
    fontFamily: fonts.sans,
    fontSize: 11.5,
    lineHeight: 11.5 * 1.4,
    color: colors.inkSoft,
    marginTop: 2,
    paddingRight: 8,
  },
  val: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 11 * 0.04,
    color: colors.accentDeep,
  },
  valQuiet: { color: colors.inkFaint },
});
