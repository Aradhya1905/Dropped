/**
 * A pressed wax seal: sage radial gradient (`circle at 36% 30%, accent →
 * accent-deep 82%`), soft drop shadow, faint white inner ring. The signature
 * mark of the app — stamps on notes, FABs, map pins, the passport.
 *
 * A seal can also be *collected*: `motif` / `mood` / `night` restamp the same
 * object rather than producing a second family of components. Every variant is
 * still wax on paper — no metal, no ribbons, no tiers. See
 * `features/trail/seals/derive.ts` for what earns which.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Line, RadialGradient, Stop } from 'react-native-svg';

import type { Mood } from '../../types';
import { colors, fonts, moodColors, shadows } from '../tokens';
import { useLoopsActive, useReducedMotion } from '../tokens/motion';

let sealGradientSeq = 0;

/**
 * Which die pressed this seal:
 * - `plain` — the everyday stamp;
 * - `first` — nobody had revealed that drop before you;
 * - `worn`  — many people had, so the stamp comes out eroded;
 * - `city`  — your first find in a city, stamped with its name.
 */
export type SealMotif = 'plain' | 'first' | 'worn' | 'city';

export interface WaxSealProps {
  size?: number;
  /** Resting rotation, like the CSS `transform: rotate(…)`. */
  rotate?: number;
  /** Loop the `stampPulse` squash (used on tappable seals). */
  pulse?: boolean;
  /** Use the bigger FAB shadow. */
  shadow?: 'seal' | 'sealLarge';
  /** The pressed motif. Defaults to the plain stamp. */
  motif?: SealMotif;
  /** Tints the wax. Omitted = the house sage (identical to `wonder`). */
  mood?: Mood;
  /** A find made after dark: the wax cooled darker. */
  night?: boolean;
  /** Stamped across a `city` seal. Ignored by every other motif. */
  cityLabel?: string;
  /** The embossed glyph, centered. Overrides the motif's own mark. */
  children?: React.ReactNode;
  /** When set, the seal becomes a button (the stamp FABs). */
  onPress?: () => void;
  /** What that button announces. Required whenever `onPress` is. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * A seal that does something must say what. The union makes that a type error
 * rather than a TalkBack finding.
 */
export type WaxSealComponentProps =
  | (WaxSealProps & { onPress: () => void; accessibilityLabel: string })
  | (WaxSealProps & { onPress?: undefined });

export function WaxSeal({
  size = 46,
  rotate = 0,
  pulse = false,
  shadow = 'seal',
  motif = 'plain',
  mood,
  night = false,
  cityLabel,
  children,
  onPress,
  accessibilityLabel,
  style,
}: WaxSealComponentProps) {
  const gradId = useRef(`waxGrad${sealGradientSeq++}`).current;
  const t = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();
  const loopsActive = useLoopsActive();

  useEffect(() => {
    // `t` rests at 0 (full size), so reduced motion needs no static value here —
    // the seal simply never squashes.
    if (!pulse || reduced || !loopsActive) {
      return;
    }
    // stampPulse: rest …88%, dip to .92 at 94%, back — over 3.4s
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(2992),
        Animated.timing(t, { toValue: 1, duration: 204, useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 204, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, t, reduced, loopsActive]);

  const wax = mood ? moodColors[mood].wax : { light: colors.accent, deep: colors.accentDeep };
  const r = size / 2;

  const seal = (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: r,
          boxShadow: `${shadows[shadow]}, inset 0 0 0 1px rgba(255,255,255,0.18)`,
          // A well-trodden drop stamps faintly — the die is tired, not cheaper.
          opacity: motif === 'worn' ? 0.72 : 1,
          transform: [
            { rotate: `${rotate}deg` },
            { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] }) },
          ],
        },
        styles.center,
        onPress ? undefined : style,
      ]}
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={gradId} cx="36%" cy="30%" r="82%">
            <Stop offset="0" stopColor={wax.light} />
            <Stop offset="0.82" stopColor={wax.deep} />
            <Stop offset="1" stopColor={wax.deep} />
          </RadialGradient>
        </Defs>
        <Circle cx={r} cy={r} r={r} fill={`url(#${gradId})`} />

        {/* Wax poured after dark sets darker. An ink scrim rather than a second
            palette, so every mood cools by the same amount. */}
        {night && <Circle cx={r} cy={r} r={r} fill="rgba(33,29,23,0.30)" />}

        {/* Erosion drawn as a broken ring instead of paper-coloured chips: the
            seal has to sit on cards, on the map and on paper, and a chip
            painted in one background's colour is wrong on the other two. */}
        {motif === 'worn' && (
          <Circle
            cx={r}
            cy={r}
            r={r * 0.74}
            fill="none"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth={Math.max(1, size * 0.03)}
            strokeDasharray={`${size * 0.12},${size * 0.1}`}
          />
        )}

        {/* First finder: a six-spoke die mark, embossed. Not a star rating. */}
        {motif === 'first' && !children && <FirstMark size={size} />}
      </Svg>

      <View style={styles.center}>
        {children ??
          (motif === 'city' && cityLabel ? (
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[
                styles.cityLabel,
                { fontSize: Math.max(6, size * 0.15), maxWidth: size * 0.82 },
              ]}
            >
              {cityLabel.toUpperCase()}
            </Text>
          ) : null)}
      </View>
    </Animated.View>
  );

  if (!onPress) {
    return seal;
  }
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      // A pressable seal has no text of its own — every one of them is a wax
      // circle with an embossed glyph inside, which TalkBack reads as nothing
      // at all. The prop is required by the type so a new stamp FAB can't ship
      // silent.
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [pressed && styles.pressed, style]}
    >
      {seal}
    </Pressable>
  );
}

/** Three crossing lines — the mark a fresh die leaves in soft wax. */
function FirstMark({ size }: { size: number }) {
  const c = size / 2;
  const arm = size * 0.26;
  const stroke = 'rgba(255,255,255,0.5)';
  const width = Math.max(1, size * 0.035);
  return (
    <>
      {[0, 60, 120].map(deg => {
        const rad = (deg * Math.PI) / 180;
        const dx = Math.cos(rad) * arm;
        const dy = Math.sin(rad) * arm;
        return (
          <Line
            key={deg}
            x1={c - dx}
            y1={c - dy}
            x2={c + dx}
            y2={c + dy}
            stroke={stroke}
            strokeWidth={width}
            strokeLinecap="round"
          />
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.85 },
  cityLabel: {
    fontFamily: fonts.mono,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'center',
  },
});
