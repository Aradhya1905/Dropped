/**
 * A sealed secret pin floating on the map (`.mappin`).
 * Rendered inside a MapLibre <Marker> — no absolute positioning.
 *
 * A pin with replies wears a small count badge. That number is the visible
 * reason to walk back to a spot you've already read: the secret doesn't
 * change, but the voices under it do.
 *
 * A pin carries its mood as a wash and a ring, so a neighbourhood reads as a
 * mood map at a glance rather than as identical anonymous dots.
 *
 * A pin that's about to fade thins out and wears its days-left tag. The whole
 * point of an expiring drop is that you can see the clock from across the map,
 * so the ramp is deliberately visible — but floored well above invisible, since
 * a pin you can't see is a pin you can't walk to.
 *
 * A pin with a time gate wears a tiny "dark"/"day" tag. It says *when* it opens
 * and never *what* it says — which is the point: knowing the hour is what lets
 * someone plan the walk instead of arriving at the wrong one.
 *
 * A pin inside the whisper band (150–50 m) drops the lock, takes its mood's
 * tint, and hangs the teaser under itself in Caveat. That is the hook that
 * makes someone walk the last two blocks — so it's the loudest a pin ever gets
 * without being opened. The teaser is whatever the server chose to send; this
 * component never truncates a body, because it is never given one.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FloatBob } from '../../../design-system/components';
import { LockIcon } from '../../../design-system/icons';
import { colors, fonts, moodColor } from '../../../design-system/tokens';
import type { Mood, RevealCondition, Whisper } from '../../../types';
import { daysUntilExpiry, fadeOpacity } from '../../../utils/expiry';
import { conditionTag } from '../../../utils/revealCondition';

export function MapPin({
  deltaY = -9,
  duration = 9000,
  replyCount = 0,
  expiresAt,
  revealCondition,
  mood,
  whisper,
  onPress,
}: {
  deltaY?: number;
  duration?: number;
  /** Voices left at this spot. 0 hides the badge; 10+ shows "9+". */
  replyCount?: number;
  /** ms epoch when this drop fades. Absent = forever, and nothing changes. */
  expiresAt?: number;
  /**
   * The hour this drop opens at, if it has one. Absent = any hour, and the pin
   * looks exactly as it did before time gates existed.
   */
  revealCondition?: RevealCondition;
  /** The drop's mood. Colours the ring and the lock. Absent = plain paper. */
  mood?: Mood;
  /**
   * Mood + teaser, when the server judged you inside the whisper band. Absent
   * = you're too far to hear anything, and the pin stays a plain sealed dot.
   */
  whisper?: Whisper;
  onPress?: () => void;
}) {
  const daysLeft = daysUntilExpiry(expiresAt);
  const opacity = fadeOpacity(expiresAt);
  // Only tag a pin once the countdown is short enough to act on — a 30-day
  // drop wearing "30d" for three weeks is noise, not urgency.
  const showDaysTag = daysLeft !== null && daysLeft <= 7;
  // Unlike the days tag, this one always shows once set: a gate isn't a
  // countdown that becomes urgent, it's a standing fact about the drop.
  const gateLabel = conditionTag(revealCondition);
  // A whisper always knows its own mood; a far-off pin is told one by the map.
  const moodKey = whisper?.mood ?? mood;
  const ink = moodKey ? moodColor(moodKey) : null;

  return (
    <FloatBob rotate={0} deltaRotate={0} deltaY={deltaY} duration={duration}>
      <Pressable
        onPress={onPress}
        hitSlop={8}
        accessibilityLabel={
          [
            whisper
              ? `Whispering secret, ${whisper.mood}`
              : moodKey
              ? `Sealed secret, ${moodKey}`
              : 'Sealed secret',
            whisper?.teaser ? `starts "${whisper.teaser}"` : null,
            replyCount > 0
              ? `${replyCount} ${replyCount === 1 ? 'voice' : 'voices'} here`
              : null,
            daysLeft !== null
              ? daysLeft <= 1
                ? 'fades today'
                : `fades in ${daysLeft} days`
              : null,
            gateLabel,
          ]
            .filter(Boolean)
            .join(', ')
        }
        style={({ pressed }) => [
          styles.pin,
          { opacity },
          // A pin escalates in three steps: plain paper when the map knows
          // nothing, a mood-coloured ring once it does, and the full wash only
          // inside the whisper band. Tinting every pin would otherwise flatten
          // the one signal that says "this one is close enough to speak".
          ink != null && { borderColor: ink.ink },
          whisper != null && ink != null && { backgroundColor: ink.tint },
          pressed && styles.pressed,
        ]}
      >
        {whisper != null && ink != null ? (
          // Inside the band the lock is the wrong idea — it's ajar, not shut.
          <View style={[styles.moodDot, { backgroundColor: ink.ink }]} />
        ) : (
          <LockIcon
            size={14}
            color={ink ? ink.ink : colors.inkSoft}
            strokeWidth={1.5}
          />
        )}
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
        {/*
          Top-left, the one corner nothing else claims: the reply badge sits
          top-right, the fade tag hangs below, and the teaser hangs below that.
        */}
        {revealCondition && (
          <View style={styles.gateTag}>
            <Text style={styles.gateTagText}>
              {revealCondition === 'night' ? 'dark' : 'day'}
            </Text>
          </View>
        )}
      </Pressable>

      {/*
        The teaser hangs below the pin, absolutely positioned so the marker's
        box stays 34×34 and the pin keeps sitting exactly on its coordinate —
        same trick the fade tag uses. `numberOfLines` is belt-and-braces; the
        server already caps the teaser at ~18 characters.
      */}
      {whisper?.teaser ? (
        <Text
          numberOfLines={1}
          style={[
            styles.teaser,
            { color: ink?.ink },
            // A fading drop's whisper fades with it.
            { opacity },
            // Drops below the days tag when both are showing.
            showDaysTag && styles.teaserLower,
          ]}
        >
          {whisper.teaser}
        </Text>
      ) : null}
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
  moodDot: { width: 9, height: 9, borderRadius: 5 },
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
  // Same micro-tag as the fade tag, in the free corner, tinted with the accent
  // so it reads as a property of the drop rather than as a warning.
  gateTag: {
    position: 'absolute',
    top: -6,
    left: -8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: colors.accentTint,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  gateTagText: {
    fontFamily: fonts.monoMedium,
    fontSize: 7.5,
    lineHeight: 9,
    letterSpacing: 7.5 * 0.1,
    textTransform: 'uppercase',
    color: colors.accentDeep,
  },
  // Stretched 49px past each side of the 34px pin, so a ~132px line of
  // handwriting stays centred on the coordinate without widening the marker.
  teaser: {
    position: 'absolute',
    top: 38,
    left: -49,
    right: -49,
    textAlign: 'center',
    fontFamily: fonts.handMedium,
    fontSize: 14,
    lineHeight: 16,
    transform: [{ rotate: '-2deg' }],
  },
  teaserLower: { top: 48 },
  pressed: { opacity: 0.8 },
});
