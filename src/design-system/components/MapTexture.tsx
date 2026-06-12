/**
 * The "living map" texture behind most screens — abstract blocks, streets and
 * a sage river, slowly drifting. Traced from the shared `MAP_SVG` in
 * `design-reference/project/dropped.js`; variants mirror the CSS classes
 * `.mapbg`, `.mapbg.dense`, `.mapbg.blur`.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Defs, FeGaussianBlur, Filter, G, Path, Rect } from 'react-native-svg';

const BLOCKS: Array<{ x: number; y: number; w: number; h: number }> = [
  { x: 34, y: 92, w: 120, h: 96 },
  { x: 172, y: 120, w: 96, h: 120 },
  { x: 60, y: 320, w: 110, h: 130 },
  { x: 232, y: 300, w: 120, h: 92 },
  { x: 48, y: 520, w: 130, h: 120 },
  { x: 220, y: 560, w: 120, h: 150 },
  { x: 120, y: 700, w: 150, h: 120 },
];

const STREETS = [
  'M-20 188 H420',
  'M-20 300 H420',
  'M-20 520 H420',
  'M160 -20 V880',
  'M210 -20 V880',
];

const STREETS_THIN = [
  'M-20 452 H420',
  'M-20 700 H420',
  'M40 -20 V880',
  'M356 -20 V880',
  'M-30 60 L460 540',
];

const RIVER = 'M-20 760 C 80 700, 120 640, 230 600 S 420 520 460 470';

export function MapTexture({ dense = false, blur = false }: { dense?: boolean; blur?: boolean }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, {
          toValue: 1,
          duration: 64000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(t, {
          toValue: 0,
          duration: 64000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t]);

  const street = dense ? 'rgba(33,29,23,0.16)' : 'rgba(33,29,23,0.13)';
  const streetThin = dense ? 'rgba(33,29,23,0.1)' : 'rgba(33,29,23,0.08)';
  const block = dense ? 'rgba(33,29,23,0.03)' : 'rgba(33,29,23,0.022)';
  const opacity = blur ? 0.7 : dense ? 1 : 0.9;

  const art = (
    <>
      <G>
        {BLOCKS.map((b, i) => (
          <Rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={3} fill={block} />
        ))}
      </G>
      <G>
        {STREETS.map((d, i) => (
          <Path key={i} d={d} stroke={street} fill="none" />
        ))}
        {STREETS_THIN.map((d, i) => (
          <Path key={i} d={d} stroke={streetThin} fill="none" />
        ))}
      </G>
      <Path d={RIVER} stroke="rgba(118,149,124,0.30)" strokeWidth={14} fill="none" />
      <Path d={RIVER} stroke="rgba(118,149,124,0.5)" strokeWidth={1} fill="none" />
    </>
  );

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.root,
        {
          opacity,
          transform: [
            { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [-6, 7] }) },
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [-9, 11] }) },
            { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['-0.2deg', '0.25deg'] }) },
          ],
        },
      ]}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 400 860"
        preserveAspectRatio="xMidYMid slice"
      >
        {blur ? (
          <>
            <Defs>
              <Filter id="mapBlur">
                <FeGaussianBlur stdDeviation={6} />
              </Filter>
            </Defs>
            <G filter="url(#mapBlur)">{art}</G>
          </>
        ) : (
          art
        )}
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // `inset: -12% -18%` in the design — oversized so the drift never shows edges
  root: {
    position: 'absolute',
    top: '-12%',
    bottom: '-12%',
    left: '-18%',
    right: '-18%',
  },
});
