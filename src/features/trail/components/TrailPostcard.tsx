/**
 * The trail as a postcard: a shareable card of where you've been.
 *
 * **Places, counts and dates. Never a body, never a coordinate.** This is the
 * second artifact in the app a user deliberately publishes (the first is the
 * city constellation), and the rule is the same one, for the same reason: a
 * confession is readable by walking to it, and no share sheet is a substitute
 * for that walk. `placeLabel` is the coarse, human name the reverse geocoder
 * gave a drop — a neighbourhood, not a doorstep — which is why it may appear
 * here and the raw `coordinate` may not.
 *
 * Drawn entirely in `react-native-svg` so exporting is one `toDataURL` rather
 * than a screenshot: nothing off-card can leak into the image, and the result
 * holds up printed.
 */
import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';

import { colors, fonts } from '../../../design-system/tokens';
import type { Secret } from '../../../types';

/** The card's own coordinate space. Postcard proportions. */
export const POSTCARD = { w: 320, h: 420 };

/** How many places fit before the list turns into "and N more". */
const MAX_ROWS = 8;

/** Longest place name before it's cut — the card is 320 units wide. */
const MAX_LABEL = 26;

export interface TrailPostcardStat {
  value: string;
  label: string;
}

export interface TrailPostcardProps {
  /** Secrets whose *places* are drawn. Bodies are never read. */
  secrets: Secret[];
  /** The torn-receipt numbers from the Trail screen. */
  stats: TrailPostcardStat[];
  /** What this collection is — "found", "saved", "dropped". */
  kind: string;
  /** Off drops the place names, leaving only counts and dates. */
  showPlaces?: boolean;
  size?: number;
}

/** Same contract as the constellation's, so both share through one code path. */
export interface TrailPostcardHandle {
  /** Base64 PNG (no `data:` prefix), or `null` if the export failed. */
  capture(): Promise<string | null>;
}

const shortDate = (ms: number): string =>
  new Date(ms).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });

const truncate = (s: string): string =>
  s.length <= MAX_LABEL ? s : `${s.slice(0, MAX_LABEL - 1).trimEnd()}…`;

export const TrailPostcard = forwardRef<TrailPostcardHandle, TrailPostcardProps>(
  function TrailPostcard(
    { secrets, stats, kind, showPlaces = true, size = POSTCARD.w },
    ref,
  ) {
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
            node.toDataURL(data => resolve(data ?? null));
          } catch {
            resolve(null);
          }
        }),
    }));

    const rows = useMemo(
      () =>
        secrets.slice(0, MAX_ROWS).map(s => ({
          id: s.id,
          // Falls back to the era rather than to the coordinate: a drop whose
          // geocode failed has no safe name, and inventing one from lat/lng is
          // exactly the leak this card exists to avoid.
          place: showPlaces ? truncate(s.drop.placeLabel ?? 'Somewhere') : 'Somewhere',
          when: shortDate(s.createdAt),
        })),
      [secrets, showPlaces],
    );

    const overflow = Math.max(0, secrets.length - MAX_ROWS);
    const listTop = 168;
    const rowGap = 24;

    return (
      <Svg
        ref={svg}
        width={size}
        height={(size * POSTCARD.h) / POSTCARD.w}
        viewBox={`0 0 ${POSTCARD.w} ${POSTCARD.h}`}
      >
        {/* Painted paper: an exported PNG has no screen behind it, and a
            transparent one turns black in half the apps it gets forwarded to. */}
        <Rect x={0} y={0} width={POSTCARD.w} height={POSTCARD.h} fill={colors.paper} />
        <Rect
          x={10}
          y={10}
          width={POSTCARD.w - 20}
          height={POSTCARD.h - 20}
          rx={10}
          fill="none"
          stroke={colors.line}
          strokeWidth={1}
          strokeDasharray="2 5"
        />

        <SvgText
          x={POSTCARD.w / 2}
          y={44}
          textAnchor="middle"
          fill={colors.inkFaint}
          fontSize={9}
          fontFamily={fonts.mono}
          letterSpacing={2}
        >
          FIELD NOTES
        </SvgText>
        <SvgText
          x={POSTCARD.w / 2}
          y={76}
          textAnchor="middle"
          fill={colors.ink}
          fontSize={26}
          fontFamily={fonts.serif}
        >
          {`Places I ${kind}`}
        </SvgText>

        {/* Stats band */}
        {stats.slice(0, 4).map((stat, i, all) => {
          const slot = POSTCARD.w / all.length;
          const x = slot * i + slot / 2;
          return (
            <React.Fragment key={stat.label}>
              <SvgText
                x={x}
                y={116}
                textAnchor="middle"
                fill={colors.accentDeep}
                fontSize={20}
                fontFamily={fonts.serif}
              >
                {stat.value}
              </SvgText>
              <SvgText
                x={x}
                y={132}
                textAnchor="middle"
                fill={colors.inkFaint}
                fontSize={8}
                fontFamily={fonts.mono}
                letterSpacing={1.4}
              >
                {stat.label.toUpperCase()}
              </SvgText>
            </React.Fragment>
          );
        })}

        <Line
          x1={28}
          y1={148}
          x2={POSTCARD.w - 28}
          y2={148}
          stroke={colors.line}
          strokeWidth={1}
          strokeDasharray="2 4"
        />

        {rows.map((row, i) => {
          const y = listTop + i * rowGap;
          return (
            <React.Fragment key={row.id}>
              <SvgText x={28} y={y} fill={colors.ink} fontSize={13} fontFamily={fonts.sans}>
                {row.place}
              </SvgText>
              <SvgText
                x={POSTCARD.w - 28}
                y={y}
                textAnchor="end"
                fill={colors.inkFaint}
                fontSize={9}
                fontFamily={fonts.mono}
              >
                {row.when}
              </SvgText>
            </React.Fragment>
          );
        })}

        {overflow > 0 && (
          <SvgText
            x={28}
            y={listTop + rows.length * rowGap}
            fill={colors.inkFaint}
            fontSize={12}
            fontFamily={fonts.serifItalic}
          >
            {`and ${overflow} more`}
          </SvgText>
        )}

        {rows.length === 0 && (
          <SvgText
            x={POSTCARD.w / 2}
            y={listTop + 20}
            textAnchor="middle"
            fill={colors.inkFaint}
            fontSize={13}
            fontFamily={fonts.serifItalic}
          >
            Nothing here yet.
          </SvgText>
        )}

        {/* The promise, printed on the artifact itself. */}
        <SvgText
          x={POSTCARD.w / 2}
          y={POSTCARD.h - 28}
          textAnchor="middle"
          fill={colors.inkFaint}
          fontSize={8}
          fontFamily={fonts.mono}
          letterSpacing={1.2}
        >
          PLACES AND DATES ONLY · NO SECRET LEAVES THIS CARD
        </SvgText>
      </Svg>
    );
  },
);
