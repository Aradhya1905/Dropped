/**
 * The anonymous passport (`.passport`): perforated top edge, dashed inner
 * border, pulsing emblem with the brand pin, your device id, a wax seal and
 * the "verified nobody" stamp.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { PulseRing, WaxSeal } from '../../../design-system/components';
import { BrandPinmarkIcon, SealPinIcon } from '../../../design-system/icons';
import { colors, fonts } from '../../../design-system/tokens';

/** Perforation dots along the top edge. */
function Perforation() {
  const holes = Array.from({ length: 36 }, (_, i) => 5 + i * 11);
  return (
    <Svg style={styles.perf} width="100%" height={6}>
      {holes.map(x => (
        <Circle key={x} cx={x} cy={0} r={3} fill={colors.paperDeep} />
      ))}
    </Svg>
  );
}

export function Passport() {
  return (
    <View style={styles.passport}>
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient
            id="passportGround"
            gradientUnits="userSpaceOnUse"
            cx="50%"
            cy="0%"
            rx="120%"
            ry="70%"
          >
            <Stop offset="0" stopColor={colors.paperBright} />
            <Stop offset="0.62" stopColor={colors.paperCard} />
            <Stop offset="1" stopColor={colors.paperCard} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" rx={8} fill="url(#passportGround)" />
      </Svg>
      <Perforation />
      <View style={styles.dashedFrame} pointerEvents="none" />

      <View style={styles.emblem}>
        <Svg width={78} height={78} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="emblemGrad" cx="38%" cy="32%" r="75%">
              <Stop offset="0" stopColor="#F1E8D6" />
              <Stop offset="1" stopColor={colors.paperDeep} />
            </RadialGradient>
          </Defs>
          <Circle cx={39} cy={39} r={39} fill="url(#emblemGrad)" />
          <Circle cx={39} cy={39} r={38} stroke={colors.accentTint} strokeWidth={1.5} fill="none" />
        </Svg>
        {[0, 1500].map(delay => (
          <PulseRing
            key={delay}
            size={78}
            fromScale={0.28}
            toScale={1.6}
            peakOpacity={0.55}
            durationMs={4000}
            delayMs={delay}
            borderWidth={1.4}
            borderColor={colors.accent}
          />
        ))}
        <BrandPinmarkIcon size={32} strokeWidth={1.5} />
      </View>

      <Text style={styles.id}>device #4F·9A·22</Text>
      <Text style={styles.tag}>you are no one. that's the point.</Text>

      <WaxSeal size={50} rotate={-8} pulse style={styles.seal}>
        <SealPinIcon size={22} />
      </WaxSeal>
      <View style={styles.stamp}>
        <Text style={styles.stampText}>verified{'\n'}nobody</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  passport: {
    marginTop: 8,
    paddingTop: 26,
    paddingHorizontal: 22,
    paddingBottom: 22,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    alignItems: 'center',
    boxShadow: '0 22px 40px -26px rgba(43,33,20,0.5)',
  },
  perf: { position: 'absolute', top: 0, left: 0, right: 0 },
  dashedFrame: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.line,
    borderRadius: 5,
  },
  emblem: {
    width: 78,
    height: 78,
    marginTop: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  id: {
    fontFamily: fonts.serif,
    fontSize: 25,
    letterSpacing: 25 * 0.01,
    color: colors.ink,
    marginTop: 14,
  },
  tag: {
    fontFamily: fonts.handSemibold,
    fontSize: 17,
    color: colors.accentDeep,
    marginTop: 4,
    transform: [{ rotate: '-1deg' }],
  },
  seal: { position: 'absolute', right: -12, bottom: -12 },
  stamp: {
    position: 'absolute',
    left: 14,
    bottom: 14,
    borderWidth: 1.4,
    borderColor: colors.accent,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 7,
    transform: [{ rotate: '-6deg' }],
    opacity: 0.85,
  },
  stampText: {
    fontFamily: fonts.mono,
    fontSize: 7.5,
    letterSpacing: 7.5 * 0.22,
    textTransform: 'uppercase',
    lineHeight: 7.5 * 1.5,
    color: colors.accentDeep,
  },
});
