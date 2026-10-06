/**
 * "The trail goes on" — an ink ticket torn from the foot of a revealed note
 * when it's a stop on a trail: which stop is next, how far and which way, and
 * a Follow the trail button that walks you there.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { ArrowUpIcon, WalkIcon } from '../../../design-system/icons';
import { colors, fonts } from '../../../design-system/tokens';
import type { Coordinate } from '../../../types';
import { formatDistance, walkMinutes } from '../../../utils/format';
import { bearingTo, compassPoint } from '../../../utils/geo';

/** Light sage and light paper, for type set on the ink ticket. */
const ON_INK_SAGE = '#A7C2AC';
const ON_INK_PAPER = '#D9D0BF';

/** Perforation holes along the torn edge. */
const HOLES = Array.from({ length: 32 }, (_, i) => i);

export function NextStopTicket({
  stop,
  of,
  from,
  to,
  distanceMeters,
  onFollow,
  style,
}: {
  /** The next stop's number. */
  stop: number;
  of: number;
  /** This stop, and the next — for the direction arrow. */
  from: Coordinate;
  to: Coordinate;
  distanceMeters: number;
  onFollow: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const bearing = bearingTo(from, to);
  const minutes = walkMinutes(distanceMeters);
  const way = `${formatDistance(distanceMeters)} ${compassPoint(bearing)} · about ${minutes} min`;

  return (
    <View style={[styles.ticket, style]}>
      <View style={styles.perf} pointerEvents="none">
        {HOLES.map(i => (
          <View key={i} style={styles.hole} />
        ))}
      </View>

      <View style={styles.row}>
        <View style={styles.text}>
          <Text style={styles.kicker}>the trail goes on</Text>
          <Text style={styles.title}>
            Stop {stop} of {of}
          </Text>
          <Text style={styles.way}>{way}</Text>
        </View>
        <View style={styles.compass}>
          <View style={{ transform: [{ rotate: `${Math.round(bearing)}deg` }] }}>
            <ArrowUpIcon size={26} color={ON_INK_SAGE} />
          </View>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Follow the trail to stop ${stop}, ${way}`}
        onPress={onFollow}
        style={({ pressed }) => [styles.follow, pressed && styles.pressed]}
      >
        <WalkIcon size={17} color={colors.paperBright} />
        <Text style={styles.followText}>Follow the trail</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  ticket: {
    backgroundColor: colors.ink,
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 18,
    transform: [{ rotate: '0.8deg' }],
    boxShadow: '0 18px 30px -18px rgba(20,16,10,0.6)',
  },
  perf: {
    position: 'absolute',
    top: -3.5,
    left: 14,
    right: 14,
    height: 7,
    flexDirection: 'row',
    gap: 5,
    overflow: 'hidden',
  },
  hole: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.paper },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  text: { flex: 1 },
  kicker: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 9 * 0.2,
    textTransform: 'uppercase',
    color: ON_INK_SAGE,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 24,
    lineHeight: 24 * 1.1,
    color: colors.paperCard,
    marginTop: 4,
  },
  way: { fontFamily: fonts.hand, fontSize: 19, color: ON_INK_PAPER, marginTop: 2 },
  compass: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: 'rgba(247,242,232,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  follow: {
    marginTop: 14,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  followText: { fontFamily: fonts.sansMedium, fontSize: 14.5, color: colors.paperBright },
  pressed: { opacity: 0.85 },
});
