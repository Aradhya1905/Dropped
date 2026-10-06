/**
 * The bottom card while following a trail: the next stop, still sealed — how
 * far, which way, how many stops hide after it, and Walk there.
 */
import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, fonts } from '../../../design-system/tokens';

export function NextStopCard({
  mood,
  distance,
  way,
  after,
  onWalk,
  onLayout,
  style,
}: {
  mood: string;
  /** "190 m" */
  distance: string;
  /** "north-east · ~2 min" */
  way: string;
  /** "one more stop is hidden after this one." */
  after: string;
  onWalk: () => void;
  onLayout?: (e: LayoutChangeEvent) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.card, style]} onLayout={onLayout}>
      <View style={styles.head}>
        <Text style={styles.kicker}>next stop · sealed</Text>
        <Text style={styles.kicker}>{mood}</Text>
      </View>
      <View style={styles.distRow}>
        <Text style={styles.distance}>{distance}</Text>
        <Text style={styles.way}>{way}</Text>
      </View>
      <Text style={styles.after}>{after}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Walk to the next stop, ${distance} ${way}`}
        onPress={onWalk}
        style={({ pressed }) => [styles.walk, pressed && styles.pressed]}
      >
        <Text style={styles.walkText}>Walk there</Text>
      </Pressable>
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
    paddingBottom: 14,
    boxShadow: '0 18px 36px -18px rgba(43,33,20,0.55)',
  },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  kicker: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 9 * 0.18,
    textTransform: 'uppercase',
    color: colors.inkSoft,
  },
  distRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 6 },
  distance: { fontFamily: fonts.serif, fontSize: 34, lineHeight: 38, color: colors.ink },
  way: { fontFamily: fonts.hand, fontSize: 19, color: colors.accentDeep },
  after: { fontFamily: fonts.hand, fontSize: 17, color: colors.inkSoft, marginTop: 4 },
  walk: {
    marginTop: 12,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walkText: { fontFamily: fonts.sansMedium, fontSize: 14.5, color: colors.paperCard },
  pressed: { opacity: 0.85 },
});
