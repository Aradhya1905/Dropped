/**
 * The city constellation: everywhere you stood in one city, joined in the order
 * you stood there, drawn rather than surveyed.
 *
 * Pure `react-native-svg` on purpose — **not a map.** A tile layer would make
 * this a screenshot of somebody else's cartography; the whole point is that the
 * shape is yours, in the app's own ink, and that it holds up printed.
 *
 * Everything the picture says lives inside the `<Svg>`, title and footer
 * included, so exporting it is one `toDataURL` call rather than a screenshot of
 * a screen. **Nothing but places, counts, and dates may ever be drawn here** —
 * this is the one artifact users deliberately publish.
 */
import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

import { colors, fonts } from '../../../design-system/tokens';
import { labelledNodes, layout, type ConstellationPoint } from './layout';

/** The drawing's own coordinate space. Square-ish, so it shares well. */
export const CANVAS = { w: 320, h: 380 };

/** The band the stars occupy — title above, footer below. */
const FIELD = { top: 74, h: 232 };
const FIELD_PADDING = 18;

/** Labels closer together than this share one name (see `labelledNodes`). */
const LABEL_MIN_DISTANCE = 46;

export interface ConstellationProps {
  /** Places, already narrowed to one city. */
  points: ConstellationPoint[];
  city: string;
  /**
   * Whether place names are drawn. Off is the privacy-preserving export: a
   * dense constellation of someone's regular walks is semi-identifying on its
   * own, and the city name plus their street corners doubly so.
   */
  showLabels?: boolean;
  /** Rendered size in px. The drawing scales; the coordinate space doesn't. */
  size?: number;
}

/** What the screen holds a ref to, so it can hand the picture to a share sheet. */
export interface ConstellationHandle {
  /** Base64 PNG (no `data:` prefix), or `null` if the export failed. */
  capture(): Promise<string | null>;
}

const YEAR = (ms: number) => new Date(ms).getFullYear();

export const Constellation = forwardRef<ConstellationHandle, ConstellationProps>(
  function Constellation({ points, city, showLabels = true, size = CANVAS.w }, ref) {
    const svg = useRef<Svg>(null);

    useImperativeHandle(ref, () => ({
      capture: () =>
        new Promise<string | null>(resolve => {
          const node = svg.current as unknown as {
            toDataURL?: (cb: (data: string) => void) => void;
          } | null;
          if (!node?.toDataURL) {
            resolve(null);
            return;
          }
          try {
            // Resolves with raw base64 (no `data:` prefix) on both platforms.
            node.toDataURL(data => resolve(data ?? null));
          } catch {
            resolve(null);
          }
        }),
    }));

    const { nodes, path } = useMemo(
      () => layout(points, { w: CANVAS.w, h: FIELD.h }, FIELD_PADDING),
      [points],
    );

    const named = useMemo(
      () => (showLabels ? labelledNodes(nodes, LABEL_MIN_DISTANCE) : new Set<string>()),
      [nodes, showLabels],
    );

    const span = useMemo(() => {
      if (nodes.length === 0) return '';
      const first = YEAR(nodes[0]!.at);
      const last = YEAR(nodes[nodes.length - 1]!.at);
      return first === last ? String(first) : `${first}–${last}`;
    }, [nodes]);

    const footer = `${nodes.length} place${nodes.length === 1 ? '' : 's'}${
      span ? ` · ${span}` : ''
    }`;

    return (
      <Svg
        ref={svg}
        width={size}
        height={(size * CANVAS.h) / CANVAS.w}
        viewBox={`0 0 ${CANVAS.w} ${CANVAS.h}`}
      >
        {/* Paper, painted rather than inherited: an exported PNG has no screen
            behind it, and a transparent one turns black in half the apps it
            gets forwarded to. */}
        <Rect x={0} y={0} width={CANVAS.w} height={CANVAS.h} fill={colors.paper} />
        <Rect
          x={10}
          y={10}
          width={CANVAS.w - 20}
          height={CANVAS.h - 20}
          rx={10}
          fill="none"
          stroke={colors.line}
          strokeWidth={1}
          strokeDasharray="2 5"
        />

        <SvgText
          x={CANVAS.w / 2}
          y={42}
          textAnchor="middle"
          fill={colors.ink}
          fontSize={24}
          fontFamily={fonts.serif}
        >
          {showLabels ? city : 'A city'}
        </SvgText>
        <SvgText
          x={CANVAS.w / 2}
          y={58}
          textAnchor="middle"
          fill={colors.inkFaint}
          fontSize={9}
          letterSpacing={1.2}
          fontFamily={fonts.mono}
        >
          DRAWN WITH YOUR FEET
        </SvgText>

        <G y={FIELD.top}>
          {/* The walk, first. Ink under the stars, never over them. */}
          {path !== '' && (
            <Path
              d={path}
              fill="none"
              stroke={colors.accentDeep}
              strokeWidth={1}
              strokeOpacity={0.55}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {nodes.map(n => (
            <G key={n.id}>
              <Circle cx={n.x} cy={n.y} r={n.r + 3.5} fill={colors.accentTint} />
              <Circle cx={n.x} cy={n.y} r={n.r} fill={colors.accentDeep} />
              {named.has(n.id) && (
                <SvgText
                  x={n.x}
                  y={n.y - n.r - 6}
                  textAnchor="middle"
                  fill={colors.inkSoft}
                  fontSize={12}
                  fontFamily={fonts.hand}
                >
                  {n.label}
                </SvgText>
              )}
            </G>
          ))}
        </G>

        <Line
          x1={40}
          y1={CANVAS.h - 52}
          x2={CANVAS.w - 40}
          y2={CANVAS.h - 52}
          stroke={colors.line}
          strokeWidth={1}
        />
        <SvgText
          x={CANVAS.w / 2}
          y={CANVAS.h - 32}
          textAnchor="middle"
          fill={colors.inkSoft}
          fontSize={10}
          letterSpacing={1}
          fontFamily={fonts.mono}
        >
          {footer}
        </SvgText>
      </Svg>
    );
  },
);
