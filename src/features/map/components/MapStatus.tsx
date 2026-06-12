/**
 * Full-width walking status chip at the top of the walk sequence
 * (`.map-status`): round tinted icon, label pair, and a state pill that runs
 * cold (grey) while out of range.
 */
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, fonts, shadows } from '../../../design-system/tokens';

export function MapStatus({
  icon,
  kicker,
  place,
  state,
  cold = false,
  style,
}: {
  icon: React.ReactNode;
  kicker: string;
  place: string;
  state: string;
  cold?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.chip, style]}>
      <View style={styles.ico}>{icon}</View>
      <View style={styles.txt}>
        <Text style={styles.kicker}>{kicker}</Text>
        <Text style={styles.place}>{place}</Text>
      </View>
      <View style={[styles.state, cold && styles.stateCold]}>
        <Text style={[styles.stateText, cold && styles.stateTextCold]}>{state}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: colors.paperCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingVertical: 10,
    paddingHorizontal: 14,
    boxShadow: shadows.chip,
  },
  ico: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txt: { flex: 1 },
  kicker: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 8 * 0.2,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  place: { fontFamily: fonts.serif, fontSize: 15.5, color: colors.ink },
  state: {
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 11,
    backgroundColor: colors.accentTint,
  },
  stateCold: { backgroundColor: colors.paperDeep },
  stateText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 9 * 0.12,
    textTransform: 'uppercase',
    color: colors.accentDeep,
  },
  stateTextCold: { color: colors.inkFaint },
});
