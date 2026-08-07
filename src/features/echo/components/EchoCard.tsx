/**
 * The anniversary card — "a year ago, you stood right here."
 *
 * The tone is the feature. This is a confessions app, so a card that arrives
 * uninvited about something painful is a real cost: it stays quiet (no seal, no
 * pulse, no urgency), it never quotes the secret, and the way to make it stop
 * is on the card itself rather than buried in settings.
 */
import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { colors, fonts, moodColor, shadows } from '../../../design-system/tokens';
import { echoAgo } from '../../../utils/format';
import type { EchoCardData } from '../types';

/**
 * What the card says it is. Never "remember?", never a date, and never a
 * promise about what's inside — you may well be too far to read it.
 */
function line(echo: EchoCardData): string {
  return echo.kind === 'dropped'
    ? 'You left something here.'
    : 'You stood right here.';
}

export function EchoCard({
  echo,
  onPress,
  onMute,
  style,
}: {
  echo: EchoCardData;
  onPress?: () => void;
  /** "Not this one" — never remind me about this drop again. */
  onMute?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const tint = moodColor(echo.mood);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${echoAgo(echo.interval)}, ${line(echo)} Open it.`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
    >
      <View style={[styles.rule, { backgroundColor: tint.ink }]} />
      <View style={styles.copy}>
        <Text style={[styles.kicker, { color: tint.ink }]}>
          {echoAgo(echo.interval)}
        </Text>
        <Text style={styles.title}>{line(echo)}</Text>
        <Text style={styles.meta}>
          {echo.placeLabel ? `${echo.placeLabel} · tap to open` : 'tap to open'}
        </Text>
      </View>
      {onMute ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Stop reminding me about this one"
          hitSlop={10}
          onPress={onMute}
          style={({ pressed }) => [styles.mute, pressed && styles.pressed]}
        >
          <Text style={styles.muteText}>not this one</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colors.paperCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingVertical: 14,
    paddingHorizontal: 16,
    boxShadow: shadows.chip,
    // A whisper of a tilt — half the range card's, so a memory never competes
    // with a secret you can open right now.
    transform: [{ rotate: '-0.45deg' }],
  },
  pressed: { opacity: 0.85 },
  /** The mood, as a single quiet stroke rather than a tag. */
  rule: { width: 2, alignSelf: 'stretch', borderRadius: 1, opacity: 0.55 },
  copy: { flex: 1 },
  kicker: {
    fontFamily: fonts.handSemibold,
    fontSize: 18,
    lineHeight: 21,
    marginBottom: 1,
  },
  title: {
    fontFamily: fonts.serifMedium,
    fontSize: 17,
    letterSpacing: 17 * -0.01,
    color: colors.ink,
    marginBottom: 4,
  },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 8.5,
    letterSpacing: 8.5 * 0.14,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  mute: { alignSelf: 'flex-start', paddingTop: 2, paddingLeft: 4 },
  muteText: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 8 * 0.14,
    textTransform: 'uppercase',
    color: colors.inkFaint,
    textDecorationLine: 'underline',
  },
});
