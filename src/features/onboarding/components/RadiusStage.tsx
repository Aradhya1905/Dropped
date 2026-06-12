/**
 * The 50 m radius diagram on the location screen (`.radius-fun`): static
 * dashed rings, three pulsing dashed rings, a white core with the brand pin,
 * a "50m" wax badge and a handwritten "you are here ↓".
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { PulseRing, WaxSeal } from '../../../design-system/components';
import { BrandPinmarkIcon } from '../../../design-system/icons';
import { colors, fonts, shadows } from '../../../design-system/tokens';

const SIZE = 188;

export function RadiusStage() {
  return (
    <View style={styles.stage}>
      <View style={styles.ringStatic} />
      <View style={[styles.ringStatic, styles.ringStaticMid]} />
      {[0, 1500, 3000].map(delay => (
        <PulseRing
          key={delay}
          size={SIZE}
          fromScale={0.28}
          toScale={1}
          peakOpacity={0.55}
          durationMs={4600}
          delayMs={delay}
          borderWidth={2}
          borderColor={colors.accent}
          dashed
        />
      ))}
      <View style={styles.core}>
        <Svg width={58} height={58} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="coreGrad" cx="38%" cy="32%" r="70%">
              <Stop offset="0" stopColor="#FFFFFF" />
              <Stop offset="0.6" stopColor={colors.paperCard} />
              <Stop offset="1" stopColor={colors.paperCard} />
            </RadialGradient>
          </Defs>
          <Circle cx={29} cy={29} r={29} fill="url(#coreGrad)" />
        </Svg>
        <BrandPinmarkIcon size={22} />
      </View>
      <WaxSeal size={48} rotate={8} style={styles.badge}>
        <Text style={styles.badgeText}>50m</Text>
      </WaxSeal>
      <Text style={styles.youHere}>you are here ↓</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: SIZE,
    height: SIZE,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
    marginBottom: 8,
  },
  ringStatic: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: SIZE / 2,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.line,
  },
  ringStaticMid: { top: 42, left: 42, right: 42, bottom: 42, borderColor: colors.lineSoft },
  core: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.lineSoft,
    boxShadow: shadows.core,
    overflow: 'hidden',
    zIndex: 2,
  },
  badge: { position: 'absolute', right: -6, top: 18, zIndex: 3 },
  badgeText: { fontFamily: fonts.monoMedium, fontSize: 13, letterSpacing: 13 * 0.02, color: '#fff' },
  youHere: {
    position: 'absolute',
    left: -6,
    bottom: 6,
    zIndex: 3,
    fontFamily: fonts.handSemibold,
    fontSize: 18,
    color: colors.accentDeep,
    transform: [{ rotate: '-5deg' }],
  },
});
