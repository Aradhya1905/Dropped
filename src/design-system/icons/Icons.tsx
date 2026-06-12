/**
 * Dropped icon set — every glyph is traced 1:1 from the inline SVGs in the
 * design export (`design-reference/project/dropped-screens.js`). All are
 * line icons; `color` is the stroke unless noted.
 */
import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

import { colors } from '../tokens';

export interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/** Map pin with a filled location dot (loc chips, address tags). */
export function PinIcon({
  size = 24,
  color = colors.accentDeep,
  strokeWidth = 1.5,
  dotColor,
}: IconProps & { dotColor?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21c5-6 8-9.5 8-13a8 8 0 0 0-16 0c0 3.5 3 7 8 13Z"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      {dotColor ? <Circle cx={12} cy={8.5} r={2.6} fill={dotColor} /> : null}
    </Svg>
  );
}

/** Brand pinmark — taller pin used in the white "core" circles. */
export function BrandPinmarkIcon({
  size = 22,
  color = colors.accentDeep,
  strokeWidth = 1.6,
  dotColor = colors.accent,
}: IconProps & { dotColor?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 26 26" fill="none">
      <Path
        d="M13 24c5-6 8-10 8-14a8 8 0 0 0-16 0c0 4 3 8 8 14Z"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Circle cx={13} cy={10} r={3} fill={dotColor} />
    </Svg>
  );
}

/** Wax-seal pin — the pin embossed on every wax stamp (26-grid). */
export function SealPinIcon({
  size = 20,
  color = 'rgba(255,255,255,0.85)',
  strokeWidth = 1.5,
  dotColor = 'rgba(255,255,255,0.9)',
}: IconProps & { dotColor?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 26 26" fill="none">
      <Path
        d="M13 23c4.5-5.4 7-9 7-12.5a7 7 0 0 0-14 0C6 14 8.5 17.6 13 23Z"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Circle cx={13} cy={9.5} r={2.4} fill={dotColor} />
    </Svg>
  );
}

/** Padlock. `broken` pops the shackle open; `keyhole` adds the key slot. */
export function LockIcon({
  size = 14,
  color = colors.inkSoft,
  strokeWidth = 1.5,
  variant = 'closed',
}: IconProps & { variant?: 'closed' | 'broken' | 'keyhole' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {variant === 'broken' ? (
        <Path d="M8 11V7a4 4 0 0 1 7.6-1.7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      ) : (
        <Path d="M8 11V8a4 4 0 0 1 8 0v3" stroke={color} strokeWidth={strokeWidth} />
      )}
      <Rect x={6.5} y={11} width={11} height={7.5} rx={1.5} stroke={color} strokeWidth={strokeWidth} />
      {variant === 'keyhole' ? (
        <Path d="M12 14v2.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      ) : null}
    </Svg>
  );
}

/** Right arrow used inside primary buttons. */
export function ArrowRightIcon({
  size = 17,
  color = colors.paperCard,
  strokeWidth = 1.8,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M4 10h11M11 5l5 5-5 5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Close ✕. */
export function CloseIcon({ size = 14, color = colors.inkSoft, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M3 3l10 10M13 3 3 13" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/** Map layers FAB. */
export function LayersIcon({ size = 21, color = colors.ink, strokeWidth = 1.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3 3 8l9 5 9-5-9-5ZM4 12l8 4.5L20 12M4 16l8 4.5L20 16"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Quill — the drop-a-secret FAB glyph. */
export function QuillIcon({
  size = 25,
  color = 'rgba(255,255,255,0.92)',
  strokeWidth = 1.6,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 26 26" fill="none">
      <Path
        d="M20 5c-2 0-11 3-13 11l-2 5 5-2C18 17 21 8 21 6c0-.6-.4-1-1-1ZM9 17l3-3"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Folded city map — Map tab. */
export function MapTabIcon({ size = 22, color = colors.inkFaint, strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2ZM9 4v14M15 6v14"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Bookmark — Trail tab + save button. */
export function BookmarkIcon({ size = 22, color = colors.inkFaint, strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 4h12v16l-6-4-6 4z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Person — You tab. */
export function PersonIcon({ size = 22, color = colors.inkFaint, strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Filled heart — "I feel this". */
export function HeartIcon({ size = 21, color = colors.accentDeep }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 20s-7-4.6-9.3-9.2C1 7.5 2.8 4.5 6 4.5c2 0 3.2 1.2 4 2.4.8-1.2 2-2.4 4-2.4 3.2 0 5 3 3.3 6.3C19 15.4 12 20 12 20Z"
        fill={color}
      />
    </Svg>
  );
}

/** Walking figure — "walk here to unlock". */
export function WalkIcon({ size = 18, color = colors.paperCard, strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M13 4a1.5 1.5 0 1 0 0 .01M11 9l-3 3 2 2 1 5M14 10l2 2 3 1M9 13l1 3-3 4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Compass needle / walking heading arrow. */
export function HeadingIcon({ size = 16, color = colors.accentDeep, strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3 20 21 12 17 4 21 12 3Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
    </Svg>
  );
}

/** Clock — unlock radius setting. */
export function ClockIcon({ size = 22, color = colors.accentDeep, strokeWidth = 1.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={strokeWidth} />
      <Path d="M12 7v5l3 2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Quiet hum — walk-by notifications setting. */
export function HumIcon({ size = 22, color = colors.accentDeep, strokeWidth = 1.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M13 4c-1 2-3 3-3 6 0 2 2 3 2 5M11 20c1-2 3-3 3-6 0-2-2-3-2-5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Padlock with rounded shoulders (range-card seal, 24-grid wider body). */
export function LockWideIcon({
  size = 20,
  color = 'rgba(255,255,255,0.85)',
  strokeWidth = 1.5,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 26 26" fill="none">
      <Path d="M9 12V9.5a4 4 0 0 1 8 0V12M7.5 12h11v7.5h-11z" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

/** Anonymity padlock with keyhole (26-grid, anon-seal stamp). */
export function AnonLockIcon({
  size = 22,
  color = 'rgba(255,255,255,0.92)',
  strokeWidth = 1.7,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 26 26" fill="none">
      <Path
        d="M8 12V9.5a5 5 0 0 1 10 0V12M6.5 12h13v8.5h-13zM13 15.5v2.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
