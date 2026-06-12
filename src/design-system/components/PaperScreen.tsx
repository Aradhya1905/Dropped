/**
 * The paper "screen" ground every design artboard sits on:
 * `radial-gradient(115% 80% at 50% -8%, #F8F3E9 0%, paper 52%, #EDE5D6 100%)`.
 */
import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '../tokens';

export function PaperScreen({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.root, style]} {...rest}>
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient
            id="paperGround"
            gradientUnits="userSpaceOnUse"
            cx="50%"
            cy="-8%"
            rx="115%"
            ry="80%"
          >
            <Stop offset="0" stopColor={colors.paperBright} />
            <Stop offset="0.52" stopColor={colors.paper} />
            <Stop offset="1" stopColor="#EDE5D6" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#paperGround)" />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
});
