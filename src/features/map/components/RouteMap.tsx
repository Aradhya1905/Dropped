/**
 * The deliberate street map for the walk-into-range sequence — blocks, paper
 * roads, McCarren park, the river and street labels. Traced from `ROUTEMAP`
 * in `design-reference/project/dropped.js` (346×780 design space).
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { G, Path, Rect, Text as SvgText } from 'react-native-svg';

import { fonts } from '../../../design-system/tokens';

const BLOCKS: Array<{ x: number; y: number; w: number; h: number }> = [
  { x: 10, y: 14, w: 76, h: 120 },
  { x: 106, y: 14, w: 134, h: 120 },
  { x: 260, y: 14, w: 76, h: 120 },
  { x: 10, y: 166, w: 76, h: 228 },
  { x: 260, y: 166, w: 76, h: 228 },
  { x: 106, y: 426, w: 134, h: 170 },
  { x: 260, y: 426, w: 76, h: 170 },
  { x: 106, y: 628, w: 134, h: 138 },
  { x: 260, y: 628, w: 76, h: 138 },
];

const ROADS = ['M-20 150 H366', 'M-20 410 H366', 'M-20 610 H366', 'M96 -20 V800', 'M250 -20 V800'];
const ROAD_SM = 'M-30 560 L366 200';
const ROAD_LINES = ['M-20 410 H366', 'M96 -20 V800', 'M-30 560 L366 200'];

const LBL = { fontSize: 8, letterSpacing: 8 * 0.26 };

export function RouteMap() {
  return (
    <Svg
      style={StyleSheet.absoluteFill}
      width="100%"
      height="100%"
      viewBox="0 0 346 780"
      preserveAspectRatio="xMidYMid slice"
    >
      <G>
        {BLOCKS.map((b, i) => (
          <Rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={4} fill="rgba(33,29,23,0.05)" />
        ))}
      </G>
      <Path
        d="M-30 420 C 30 404 96 412 110 470 C 124 528 96 612 30 632 C -30 650 -60 520 -30 420 Z"
        fill="rgba(118,149,124,0.18)"
      />
      <G>
        {ROADS.map((d, i) => (
          <Path key={i} d={d} stroke="#F7F1E6" strokeWidth={18} strokeLinecap="round" fill="none" />
        ))}
        <Path d={ROAD_SM} stroke="#F7F1E6" strokeWidth={13} strokeLinecap="round" fill="none" />
      </G>
      <G>
        {ROAD_LINES.map((d, i) => (
          <Path
            key={i}
            d={d}
            stroke="rgba(33,29,23,0.13)"
            strokeWidth={1.4}
            strokeDasharray="2 8"
            strokeLinecap="round"
            fill="none"
          />
        ))}
      </G>
      <Path
        d="M366 486 C 318 520 304 588 332 660 C 346 694 352 720 346 760"
        stroke="rgba(118,149,124,0.30)"
        strokeWidth={11}
        strokeLinecap="round"
        fill="none"
      />
      <SvgText
        x={84}
        y={528}
        transform="rotate(-90 84 528)"
        fill="rgba(86,110,91,0.5)"
        fontSize={LBL.fontSize}
        fontFamily={fonts.mono}
        letterSpacing={LBL.letterSpacing}
      >
        BEDFORD AVE
      </SvgText>
      <SvgText x={120} y={402} fill="rgba(86,110,91,0.5)" fontSize={LBL.fontSize}
        fontFamily={fonts.mono} letterSpacing={LBL.letterSpacing}>
        N 7TH ST
      </SvgText>
      <SvgText
        x={262}
        y={150}
        transform="rotate(-35 262 150)"
        fill="rgba(33,29,23,0.26)"
        fontSize={LBL.fontSize}
        fontFamily={fonts.mono}
        letterSpacing={LBL.letterSpacing}
      >
        DRIGGS AVE
      </SvgText>
      <SvgText
        x={6}
        y={524}
        fill="rgba(86,110,91,0.62)"
        fontSize={8}
        fontFamily={fonts.mono}
        letterSpacing={8 * 0.2}
      >
        MCCARREN PARK
      </SvgText>
    </Svg>
  );
}
