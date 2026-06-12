/**
 * The opening centerpiece (`.break-stage`, 230×230): the big wax seal
 * wobbles, snaps in two, halves fling aside, a folded note springs out,
 * shards fly, rays and a glow flash, and a handwritten "snap!" pops —
 * all on a 4.4s loop. One master timeline drives every part, with the
 * keyframe fractions lifted straight from the CSS.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, RadialGradient, Stop } from 'react-native-svg';

import { colors, fonts } from '../../../design-system/tokens';

const STAGE = 230;
const SEAL = 128;

function useBreakTimeline() {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(t, {
        toValue: 1,
        duration: 4400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [t]);
  return t;
}

function WaxHalf({ side }: { side: 'l' | 'r' }) {
  return (
    <View style={[styles.half, side === 'l' ? styles.halfL : styles.halfR]}>
      <View style={side === 'r' ? styles.shiftLeft : undefined}>
        <Svg width={SEAL} height={SEAL}>
          <Defs>
            <RadialGradient id={`bigWax${side}`} cx="38%" cy="30%" r="82%">
              <Stop offset="0" stopColor={colors.accent} />
              <Stop offset="0.82" stopColor={colors.accentDeep} />
              <Stop offset="1" stopColor={colors.accentDeep} />
            </RadialGradient>
          </Defs>
          <Circle cx={SEAL / 2} cy={SEAL / 2} r={SEAL / 2} fill={`url(#bigWax${side})`} />
          <Circle cx={SEAL / 2} cy={SEAL / 2} r={SEAL / 2 - 1} stroke="rgba(255,255,255,0.18)" strokeWidth={2} fill="none" />
          <Circle cx={SEAL / 2} cy={SEAL / 2} r={31} stroke="rgba(255,255,255,0.55)" strokeWidth={2} fill="none" />
          <Circle cx={SEAL / 2} cy={SEAL / 2} r={3} fill="rgba(255,255,255,0.75)" />
        </Svg>
      </View>
    </View>
  );
}

/** A flying wax shard. Targets are px offsets at the height of the burst. */
function Shard({
  t,
  size,
  round,
  to,
  spin,
  fadeAt = 0.8,
}: {
  t: Animated.Value;
  size: number;
  round?: boolean;
  to: [number, number];
  spin: number;
  fadeAt?: number;
}) {
  return (
    <Animated.View
      style={[
        styles.shard,
        {
          width: size,
          height: size,
          borderRadius: round ? size / 2 : 2,
          backgroundColor: round ? colors.accent : colors.accentDeep,
          opacity: t.interpolate({
            inputRange: [0, 0.44, 0.54, fadeAt, 1],
            outputRange: [0, 0, 1, 0, 0],
          }),
          transform: [
            {
              translateX: t.interpolate({
                inputRange: [0, 0.44, fadeAt, 1],
                outputRange: [0, 0, to[0], to[0]],
              }),
            },
            {
              translateY: t.interpolate({
                inputRange: [0, 0.44, fadeAt, 1],
                outputRange: [0, 0, to[1], to[1]],
              }),
            },
            {
              rotate: t.interpolate({
                inputRange: [0, 0.44, fadeAt, 1],
                outputRange: ['0deg', '0deg', `${spin}deg`, `${spin}deg`],
              }),
            },
          ],
        },
      ]}
    />
  );
}

export function SealBurst() {
  const t = useBreakTimeline();

  // seal wobble (wind-up before the crack)
  const wobbleRotate = t.interpolate({
    inputRange: [0, 0.2, 0.3, 0.38, 0.44, 1],
    outputRange: ['0deg', '-3deg', '3deg', '-2deg', '0deg', '0deg'],
  });
  const wobbleScale = t.interpolate({
    inputRange: [0, 0.2, 0.3, 0.38, 0.44, 1],
    outputRange: [1, 1.02, 0.96, 1.08, 1, 1],
  });

  // halves fling out, hold, then reset for the next loop
  const burst = (sign: 1 | -1) => [
    {
      translateX: t.interpolate({
        inputRange: [0, 0.42, 0.56, 0.7, 0.84, 1],
        outputRange: [0, 0, sign * 70, sign * 78, sign * 78, 0],
      }),
    },
    {
      translateY: t.interpolate({
        inputRange: [0, 0.42, 0.56, 0.7, 0.84, 1],
        outputRange: [0, 0, -26, 4, 4, 0],
      }),
    },
    {
      rotate: t.interpolate({
        inputRange: [0, 0.42, 0.56, 0.7, 0.84, 1],
        outputRange: ['0deg', '0deg', `${sign * 30}deg`, `${sign * 26}deg`, `${sign * 26}deg`, '0deg'],
      }),
    },
  ];

  return (
    <View style={styles.stage}>
      {/* rays */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: t.interpolate({
              inputRange: [0, 0.4, 0.5, 0.99, 1],
              outputRange: [0, 0, 1, 0, 0],
            }),
            transform: [
              {
                scale: t.interpolate({
                  inputRange: [0, 0.4, 0.5, 0.64, 1],
                  outputRange: [0.6, 0.6, 1.05, 1.12, 1.2],
                }),
              },
            ],
          },
        ]}
      >
        <Svg width={STAGE} height={STAGE} viewBox="0 0 230 230">
          {[
            [115, 30, 115, 8],
            [115, 200, 115, 222],
            [30, 115, 8, 115],
            [200, 115, 222, 115],
            [54, 54, 38, 38],
            [176, 54, 192, 38],
            [54, 176, 38, 192],
            [176, 176, 192, 192],
          ].map(([x1, y1, x2, y2], i) => (
            <Line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(118,149,124,0.55)"
              strokeWidth={2.4}
              strokeLinecap="round"
            />
          ))}
        </Svg>
      </Animated.View>

      {/* glow */}
      <Animated.View
        style={[
          styles.glow,
          {
            opacity: t.interpolate({
              inputRange: [0, 0.4, 0.5, 0.78, 1],
              outputRange: [0, 0, 1, 0.6, 0],
            }),
          },
        ]}
      >
        <Svg width={160} height={160}>
          <Defs>
            <RadialGradient id="breakGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#92B498" stopOpacity={0.9} />
              <Stop offset="0.42" stopColor={colors.accent} stopOpacity={0.3} />
              <Stop offset="0.7" stopColor={colors.accent} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={80} cy={80} r={80} fill="url(#breakGlow)" />
        </Svg>
      </Animated.View>

      {/* shards */}
      <Shard t={t} size={10} to={[-33, -42]} spin={200} />
      <Shard t={t} size={10} to={[26, -38]} spin={-180} />
      <Shard t={t} size={10} to={[-30, 36]} spin={150} />
      <Shard t={t} size={10} to={[32, 38]} spin={-200} />
      <Shard t={t} size={7} round to={[-32, -8]} spin={120} fadeAt={0.78} />
      <Shard t={t} size={7} round to={[32, -6]} spin={-120} fadeAt={0.78} />
      <Shard t={t} size={7} round to={[-8, -35]} spin={90} fadeAt={0.78} />
      <Shard t={t} size={7} round to={[11, 33]} spin={-90} fadeAt={0.78} />

      {/* the folded note springing out */}
      <Animated.View
        style={[
          styles.popnote,
          {
            opacity: t.interpolate({
              inputRange: [0, 0.44, 0.56, 0.92, 1],
              outputRange: [0, 0, 1, 1, 0],
            }),
            transform: [
              {
                translateY: t.interpolate({
                  inputRange: [0, 0.44, 0.56, 0.64, 0.72, 0.82, 1],
                  outputRange: [0, 0, -30, -24, -28, -26, -20],
                }),
              },
              {
                scale: t.interpolate({
                  inputRange: [0, 0.44, 0.56, 0.64, 0.72, 0.82, 0.92, 1],
                  outputRange: [0, 0, 1.12, 0.97, 1.03, 1, 1, 0],
                }),
              },
              {
                rotate: t.interpolate({
                  inputRange: [0, 0.44, 0.56, 0.64, 0.72, 0.82, 1],
                  outputRange: ['0deg', '0deg', '-4deg', '3deg', '-2deg', '0deg', '0deg'],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.popnoteAccent} />
        {[18, 27, 36, 45].map(top => (
          <View key={top} style={[styles.popnoteLine, { top }, top === 18 && styles.popnoteLineDark]} />
        ))}
      </Animated.View>

      {/* the seal itself */}
      <Animated.View
        style={[styles.bigseal, { transform: [{ rotate: wobbleRotate }, { scale: wobbleScale }] }]}
      >
        <Animated.View style={[styles.halfWrap, styles.halfWrapL, { transform: burst(-1) }]}>
          <WaxHalf side="l" />
        </Animated.View>
        <Animated.View style={[styles.halfWrap, styles.halfWrapR, { transform: burst(1) }]}>
          <WaxHalf side="r" />
        </Animated.View>
      </Animated.View>

      {/* snap! */}
      <Animated.Text
        style={[
          styles.snap,
          {
            opacity: t.interpolate({
              inputRange: [0, 0.44, 0.54, 0.84, 1],
              outputRange: [0, 0, 1, 1, 0],
            }),
            transform: [
              { rotate: '-10deg' },
              {
                scale: t.interpolate({
                  inputRange: [0, 0.44, 0.54, 0.64, 0.72, 0.84, 1],
                  outputRange: [0, 0, 1.25, 0.95, 1.05, 1, 1],
                }),
              },
            ],
          },
        ]}
      >
        snap!
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: STAGE,
    height: STAGE,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    marginBottom: 4,
  },
  glow: { position: 'absolute' },
  shard: { position: 'absolute' },
  bigseal: { width: SEAL, height: SEAL, zIndex: 3 },
  halfWrap: { position: 'absolute', top: 0, bottom: 0 },
  halfWrapL: { left: 0 },
  halfWrapR: { right: 0 },
  half: { width: SEAL / 2, height: SEAL, overflow: 'hidden' },
  halfL: {},
  halfR: {},
  shiftLeft: { marginLeft: -SEAL / 2 },
  popnote: {
    position: 'absolute',
    width: 78,
    height: 92,
    backgroundColor: colors.paperCard,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    boxShadow: '0 14px 26px -12px rgba(43,33,20,0.5)',
    zIndex: 2,
  },
  popnoteAccent: {
    position: 'absolute',
    left: 12,
    top: 9,
    width: 34,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  popnoteLine: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 2,
    borderRadius: 2,
    backgroundColor: colors.lineSoft,
  },
  popnoteLineDark: { backgroundColor: colors.line },
  snap: {
    position: 'absolute',
    right: 6,
    top: 18,
    zIndex: 5,
    fontFamily: fonts.handSemibold,
    fontSize: 30,
    color: colors.accentDeep,
  },
});
