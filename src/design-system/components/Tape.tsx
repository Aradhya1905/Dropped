/**
 * A strip of washi tape — translucent sage with fine vertical ribs
 * (`.snote .tape` and friends). Position it absolutely from the caller.
 */
import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { colors } from '../tokens';

export function Tape({
  width = 54,
  height = 19,
  rotate = -3,
  style,
}: {
  width?: number;
  height?: number;
  rotate?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const ribs: number[] = [];
  for (let x = 6.5; x < width; x += 7) {
    ribs.push(x);
  }
  return (
    <View
      pointerEvents="none"
      style={[
        {
          width,
          height,
          backgroundColor: colors.accentTint,
          borderWidth: 1,
          borderColor: 'rgba(118,149,124,0.28)',
          transform: [{ rotate: `${rotate}deg` }],
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Svg width={width} height={height}>
        {ribs.map(x => (
          <Line key={x} x1={x} y1={0} x2={x} y2={height} stroke="rgba(86,110,91,0.12)" strokeWidth={1} />
        ))}
      </Svg>
    </View>
  );
}
