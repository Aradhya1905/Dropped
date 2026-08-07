/**
 * A sealed secret pin floating on the map (`.mappin`).
 * Rendered inside a MapLibre <Marker> — no absolute positioning.
 *
 * A pin with replies wears a small count badge. That number is the visible
 * reason to walk back to a spot you've already read: the secret doesn't
 * change, but the voices under it do.
 *
 * A pin that's about to fade thins out and wears its days-left tag. The whole
 * point of an expiring drop is that you can see the clock from across the map,
 * so the ramp is deliberately visible — but floored well above invisible, since
 * a pin you can't see is a pin you can't walk to.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FloatBob } from '../../../design-system/components';
import { LockIcon } from '../../../design-system/icons';
import { colors, fonts } from '../../../design-system/tokens';
import { daysUntilExpiry, fadeOpacity } from '../../../utils/expiry';

export function MapPin({
  deltaY = -9,
  duration = 9000,
  replyCount = 0,
  expiresAt,
  onPress,
}: {
  deltaY?: number;
  duration?: number;
  /** Voices left at this spot. 0 hides the badge; 10+ shows "9+". */
  replyCount?: number;
  /** ms epoch when this drop fades. Absent = forever, and nothing changes. */
  expiresAt?: number;
  onPress?: () => void;
}) {
  const daysLeft = daysUntilExpiry(expiresAt);
  const opacity = fadeOpacity(expiresAt);
  // Only tag a pin once the countdown is short enough to act on — a 30-day
  // drop wearing "30d" for three weeks is noise, not urgency.
  const showDaysTag = daysLeft !== null && daysLeft <= 7;

  return (
    <FloatBob rotate={0} deltaRotate={0} deltaY={deltaY} duration={duration}>
      <Pressable
        onPress={onPress}
        hitSlop={8}
        accessibilityLabel={
          [
            'Sealed secret',
            replyCount > 0
              ? `${replyCount} ${replyCount === 1 ? 'voice' : 'voices'} here`
              : null,
            daysLeft !== null
              ? daysLeft <= 1
                ? 'fades today'
                : `fades in ${daysLeft} days`
              : null,
          ]
            .filter(Boolean)
            .join(', ')
        }
        style={({ pressed }) => [
          styles.pin,
          { opacity },
          pressed && styles.pressed,
        ]}
      >
        <LockIcon size={14} color={colors.inkSoft} strokeWidth={1.5} />
        {replyCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {replyCount > 9 ? '9+' : replyCount}
            </Text>
          </View>
        )}
        {showDaysTag && (
          <View style={styles.fadeTag}>
            <Text style={styles.fadeTagText}>
              {daysLeft <= 1 ? 'today' : `${daysLeft}d`}
            </Text>
          </View>
        )}
      </Pressable>
    </FloatBob>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.paperCard,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 16px -8px rgba(43,33,20,0.4)',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: colors.accentDeep,
    borderWidth: 1,
    borderColor: colors.paperCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: fonts.monoMedium,
    fontSize: 8.5,
    lineHeight: 10,
    color: colors.paperCard,
  },
  // Hangs below the pin so it can't collide with the reply badge above-right.
  fadeTag: {
    position: 'absolute',
    bottom: -9,
    alignSelf: 'center',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: colors.paperCard,
    borderWidth: 1,
    borderColor: colors.lineSoft,
  },
  fadeTagText: {
    fontFamily: fonts.monoMedium,
    fontSize: 7.5,
    lineHeight: 9,
    letterSpacing: 7.5 * 0.1,
    textTransform: 'uppercase',
    color: colors.inkSoft,
  },
  pressed: { opacity: 0.8 },
});
